import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Note } from '../../core/models/note.model';

@Component({
  selector: 'app-note-row',
  imports: [DatePipe, MatIconModule, MatButtonModule],
  templateUrl: './note-row.html',
  styleUrl: './note-row.scss',
})
export class NoteRow {
  readonly note = input.required<Note>();
  readonly open = output<void>();
  readonly delete = output<void>();
}
