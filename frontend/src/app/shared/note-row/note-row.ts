import { Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Note } from '../../core/models/note.model';

const SWIPE_REVEAL_WIDTH = 72;
const SWIPE_THRESHOLD = 36;

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

  protected readonly translateX = signal(0);
  protected readonly swiped = signal(false);

  private touchStartX = 0;
  private dragging = false;

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.dragging = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.dragging) return;
    const deltaX = event.touches[0].clientX - this.touchStartX;
    const base = this.swiped() ? -SWIPE_REVEAL_WIDTH : 0;
    this.translateX.set(Math.min(0, Math.max(-SWIPE_REVEAL_WIDTH, base + deltaX)));
  }

  onTouchEnd(): void {
    if (!this.dragging) return;
    this.dragging = false;
    const isOpen = this.translateX() < -SWIPE_THRESHOLD;
    this.translateX.set(isOpen ? -SWIPE_REVEAL_WIDTH : 0);
    this.swiped.set(isOpen);
  }

  onRowClick(): void {
    if (this.swiped()) {
      this.translateX.set(0);
      this.swiped.set(false);
      return;
    }
    this.open.emit();
  }

  onSwipeDelete(): void {
    this.translateX.set(0);
    this.swiped.set(false);
    this.delete.emit();
  }
}
