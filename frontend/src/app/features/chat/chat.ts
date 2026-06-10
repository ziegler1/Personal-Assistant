import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChatApi } from '../../core/services/chat';
import { ChatMessage, ChatSource } from '../../core/models/note.model';

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[];
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  private chatApi = inject(ChatApi);
  private router = inject(Router);

  protected readonly messages = signal<DisplayMessage[]>([]);
  protected readonly input = signal('');
  protected readonly loading = signal(false);

  send(): void {
    const text = this.input().trim();
    if (!text || this.loading()) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.input.set('');
    this.loading.set(true);

    const history = this.messages().map(({ role, content }) => ({ role, content }));

    this.chatApi.send(history).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: res.reply, sources: res.sources },
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
    this.router.navigate(['/notes', id]);
  }
}
