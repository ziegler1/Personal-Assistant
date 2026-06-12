import { Component, ElementRef, OnInit, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MarkdownModule } from 'ngx-markdown';
import { ChatApi } from '../../core/services/chat';
import { NotesApi } from '../../core/services/notes';
import {
  CONTENT_TYPES,
  ChatMessage,
  ChatSource,
  ChatWebResult,
  ContentType,
  GENERATE_FORMATS,
  GenerateFormat,
} from '../../core/models/note.model';
import { NotePreviewDialog } from './note-preview-dialog/note-preview-dialog';
import { GeneratedOutputDialog } from './generated-output-dialog/generated-output-dialog';

const STREAM_WORD_DELAY_MS = 40;

interface DisplayWebResult extends ChatWebResult {
  saved?: boolean;
}

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[] | null;
  webResults?: DisplayWebResult[] | null;
  webSearchAnswer?: string | null;
  webSearchQuery?: string | null;
  generating?: boolean;
  streaming?: boolean;
  created_at: string;
}

type ThreadItem =
  | { kind: 'date'; label: string; key: string; collapsed: boolean }
  | { kind: 'session' }
  | { kind: 'message'; message: DisplayMessage; index: number };

@Component({
  selector: 'app-chat',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MarkdownModule,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit {
  private chatApi = inject(ChatApi);
  private notesApi = inject(NotesApi);
  private dialog = inject(MatDialog);

  protected readonly contentTypes = CONTENT_TYPES;
  protected readonly generateFormats = GENERATE_FORMATS;
  protected readonly messages = signal<DisplayMessage[]>([]);
  protected readonly input = signal('');
  protected readonly loading = signal(false);
  protected readonly historyLoading = signal(true);
  protected readonly contentTypeFilter = signal<ContentType | ''>('');
  protected readonly sessionStartIndex = signal(0);
  protected readonly collapsedDates = signal<ReadonlySet<string>>(new Set());
  protected readonly threadRef = viewChild<ElementRef<HTMLElement>>('thread');

  // Newest-first: group messages into exchanges (a user message plus its assistant
  // reply, or a lone leading/trailing message) so each exchange reads top-to-bottom
  // in its natural order, while exchanges themselves are listed newest-first.
  protected readonly threadItems = computed<ThreadItem[]>(() => {
    const msgs = this.messages();
    const sessionStart = this.sessionStartIndex();
    const collapsed = this.collapsedDates();
    const items: ThreadItem[] = [];

    const exchanges: { startIndex: number; entries: { message: DisplayMessage; index: number }[] }[] = [];
    for (let i = 0; i < msgs.length; ) {
      const entries = [{ message: msgs[i], index: i }];
      if (i + 1 < msgs.length && msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
        entries.push({ message: msgs[i + 1], index: i + 1 });
        i += 2;
      } else {
        i += 1;
      }
      exchanges.push({ startIndex: entries[0].index, entries });
    }

    let lastDateKey: string | null = null;
    let sessionDividerShown = sessionStart === 0;

    for (let e = exchanges.length - 1; e >= 0; e--) {
      const exchange = exchanges[e];
      const first = exchange.entries[0].message;
      const dateKey = formatDateKey(first.created_at);

      if (dateKey !== lastDateKey) {
        items.push({
          kind: 'date',
          label: formatDateLabel(first.created_at),
          key: dateKey,
          collapsed: collapsed.has(dateKey),
        });
        lastDateKey = dateKey;
      }

      if (collapsed.has(dateKey)) continue;

      if (!sessionDividerShown && exchange.startIndex < sessionStart) {
        items.push({ kind: 'session' });
        sessionDividerShown = true;
      }

      for (const { message, index } of exchange.entries) {
        items.push({ kind: 'message', message, index });
      }
    }

    return items;
  });

  private lastMessageCount = 0;

  constructor() {
    // Newest messages render at the top of the thread, so keep it pinned to the
    // top whenever a message is added (sent or received) rather than scrolling
    // to the bottom. Token-by-token streaming updates don't change the array
    // length, so they don't re-trigger a scroll.
    afterRenderEffect(() => {
      const count = this.messages().length;
      const el = this.threadRef()?.nativeElement;
      if (el && count !== this.lastMessageCount) {
        const behavior: ScrollBehavior = this.lastMessageCount === 0 ? 'auto' : 'smooth';
        el.scrollTo({ top: 0, behavior });
      }
      this.lastMessageCount = count;
    });
  }

  ngOnInit(): void {
    this.chatApi.history().subscribe({
      next: (res) => {
        const messages = res.messages.map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
          webResults: m.web_results,
          webSearchAnswer: m.web_search_answer,
          webSearchQuery: m.web_search_query,
          created_at: m.created_at,
        }));
        this.messages.set(messages);
        this.collapseOlderDates(messages);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  // Only the most recent date group is expanded by default; earlier days start collapsed.
  private collapseOlderDates(msgs: DisplayMessage[]): void {
    if (msgs.length === 0) return;

    const latestKey = formatDateKey(msgs[msgs.length - 1].created_at);
    const olderKeys = new Set<string>();
    for (const m of msgs) {
      const key = formatDateKey(m.created_at);
      if (key !== latestKey) olderKeys.add(key);
    }
    this.collapsedDates.set(olderKeys);
  }

  send(): void {
    const text = this.input().trim();
    if (!text || this.loading()) return;

    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', content: text, created_at: new Date().toISOString() },
    ]);
    this.input.set('');
    this.loading.set(true);

    const history = this.messages()
      .slice(this.sessionStartIndex())
      .map(({ role, content }) => ({ role, content }));
    const contentType = this.contentTypeFilter() || undefined;

    this.chatApi.send(history, contentType).subscribe({
      next: (res) => {
        this.loading.set(false);
        const message: DisplayMessage = {
          role: 'assistant',
          content: '',
          sources: res.sources,
          webResults: res.webResults,
          webSearchAnswer: res.webSearchAnswer,
          webSearchQuery: res.webSearchQuery,
          created_at: new Date().toISOString(),
          streaming: true,
        };
        this.messages.update((msgs) => [...msgs, message]);
        this.streamReply(message, res.reply);
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            created_at: new Date().toISOString(),
          },
        ]);
        this.loading.set(false);
      },
    });
  }

  // Reveals the already-fetched reply word by word; real token streaming needs a backend SSE endpoint.
  private streamReply(message: DisplayMessage, fullText: string): void {
    const tokens = fullText.split(/(\s+)/);
    let i = 0;

    const reveal = () => {
      if (i >= tokens.length) {
        message.streaming = false;
        this.messages.set([...this.messages()]);
        return;
      }
      message.content += tokens[i];
      i++;
      this.messages.set([...this.messages()]);
      setTimeout(reveal, STREAM_WORD_DELAY_MS);
    };

    reveal();
  }

  newSession(): void {
    this.sessionStartIndex.set(this.messages().length);
  }

  toggleDateGroup(key: string): void {
    this.collapsedDates.update((dates) => {
      const next = new Set(dates);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  openSource(id: string): void {
    this.dialog.open(NotePreviewDialog, {
      width: '600px',
      maxWidth: '90vw',
      data: { noteId: id },
    });
  }

  generate(message: DisplayMessage, format: GenerateFormat): void {
    if (message.generating) return;

    message.generating = true;
    this.messages.set([...this.messages()]);

    this.chatApi.generate(message.content, format).subscribe({
      next: (output) => {
        message.generating = false;
        this.messages.set([...this.messages()]);
        this.dialog.open(GeneratedOutputDialog, {
          width: '720px',
          maxWidth: '90vw',
          data: { output },
        });
      },
      error: () => {
        message.generating = false;
        this.messages.set([...this.messages()]);
      },
    });
  }

  saveWebResult(message: DisplayMessage, result: DisplayWebResult): void {
    if (result.saved) return;

    const query = message.webSearchQuery || result.title;

    this.notesApi
      .create({
        title: `Search: ${query}`,
        content: buildWebSearchNoteContent(message),
        content_type: 'link',
        source: query,
        tags: [],
      })
      .subscribe({
        next: () => {
          for (const r of message.webResults ?? []) r.saved = true;
          this.messages.set([...this.messages()]);
        },
      });
  }
}

// Concatenates the search summary and full raw content of every result into a
// single markdown note, so saving captures the whole search rather than one snippet.
function buildWebSearchNoteContent(message: DisplayMessage): string {
  const results = message.webResults ?? [];
  const sections = results.map((r) => `### ${r.title}\nURL: ${r.url}\n${r.raw_content || r.content}`);

  return `## Summary\n${message.webSearchAnswer ?? ''}\n\n## Sources\n\n${sections.join('\n\n---\n\n')}`;
}

function formatDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
