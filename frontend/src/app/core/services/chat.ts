import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatHistoryMessage, ChatMessage, ChatResponse, ContentType } from '../models/note.model';

@Service()
export class ChatApi {
  private http = inject(HttpClient);

  send(messages: ChatMessage[], contentType?: ContentType): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/chat', { messages, content_type: contentType });
  }

  history(): Observable<{ messages: ChatHistoryMessage[] }> {
    return this.http.get<{ messages: ChatHistoryMessage[] }>('/api/chat/history');
  }
}
