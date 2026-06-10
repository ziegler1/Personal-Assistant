import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage, ChatResponse } from '../models/note.model';

@Service()
export class ChatApi {
  private http = inject(HttpClient);

  send(messages: ChatMessage[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/chat', { messages });
  }
}
