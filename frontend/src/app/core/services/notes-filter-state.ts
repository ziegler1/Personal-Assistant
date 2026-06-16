import { Service, signal } from '@angular/core';
import { ContentType } from '../models/note.model';

@Service()
export class NotesFilterState {
  readonly contentType = signal<ContentType | ''>('');
  readonly tag = signal('');
  readonly category = signal('');
}
