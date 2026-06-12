import { Component, OnInit, inject, signal } from '@angular/core';
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
}

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

  ngOnInit(): void {
    this.chatApi.history().subscribe({
      next: (res) => {
        this.messages.set(
          res.messages.map((m) => ({
            role: m.role,
            content: m.content,
            sources: m.sources,
            webResults: m.web_results,
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

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.input.set('');
    this.loading.set(true);

    const history = this.messages().map(({ role, content }) => ({ role, content }));
    const contentType = this.contentTypeFilter() || undefined;

    this.chatApi.send(history, contentType).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: res.reply, sources: res.sources, webResults: res.webResults },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
        this.loading.set(false);
      },
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
