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

interface DisplayWebResult extends ChatWebResult {
  saved?: boolean;
}

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[] | null;
  webResults?: DisplayWebResult[] | null;
  generating?: boolean;
  created_at: string;
}

type ThreadItem =
  | { kind: 'date'; label: string; key: string }
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
  protected readonly threadRef = viewChild<ElementRef<HTMLElement>>('thread');

  protected readonly threadItems = computed<ThreadItem[]>(() => {
    const msgs = this.messages();
    const sessionStart = this.sessionStartIndex();
    const items: ThreadItem[] = [];
    let lastDateKey: string | null = null;

    msgs.forEach((message, index) => {
      const dateKey = formatDateKey(message.created_at);
      if (dateKey !== lastDateKey) {
        items.push({ kind: 'date', label: formatDateLabel(message.created_at), key: dateKey });
        lastDateKey = dateKey;
      }
      if (sessionStart > 0 && index === sessionStart) {
        items.push({ kind: 'session' });
      }
      items.push({ kind: 'message', message, index });
    });

    return items;
  });

  constructor() {
    afterRenderEffect(() => {
      this.messages();
      const el = this.threadRef()?.nativeElement;
      const scrollContainer = el?.closest('mat-sidenav-content');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
  }

  ngOnInit(): void {
    this.chatApi.history().subscribe({
      next: (res) => {
        this.messages.set(
          res.messages.map((m) => ({
            role: m.role,
            content: m.content,
            sources: m.sources,
            webResults: m.web_results,
            created_at: m.created_at,
          }))
        );
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
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
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'assistant',
            content: res.reply,
            sources: res.sources,
            webResults: res.webResults,
            created_at: new Date().toISOString(),
          },
        ]);
        this.loading.set(false);
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

  newSession(): void {
    this.sessionStartIndex.set(this.messages().length);
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

  saveWebResult(result: DisplayWebResult): void {
    if (result.saved) return;

    this.notesApi
      .create({
        title: result.title,
        content: result.content,
        content_type: 'link',
        source: result.url,
        tags: [],
      })
      .subscribe({
        next: () => {
          result.saved = true;
          this.messages.set([...this.messages()]);
        },
      });
  }
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
