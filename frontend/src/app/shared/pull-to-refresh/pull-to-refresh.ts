import { Component, ElementRef, effect, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

const PULL_THRESHOLD_PX = 64;
const MAX_PULL_PX = 96;
const PULL_RESISTANCE = 0.5;

@Component({
  selector: 'app-pull-to-refresh',
  imports: [MatIconModule],
  templateUrl: './pull-to-refresh.html',
  styleUrl: './pull-to-refresh.scss',
})
export class PullToRefresh {
  readonly refreshing = input(false);
  readonly refresh = output<void>();

  private element = inject(ElementRef<HTMLElement>);

  protected readonly pullDistance = signal(0);

  private dragging = false;
  private startY = 0;
  private scrollParent: HTMLElement | null = null;

  constructor() {
    effect(() => {
      this.pullDistance.set(this.refreshing() ? PULL_THRESHOLD_PX : 0);
    });
  }

  onTouchStart(event: TouchEvent): void {
    if (this.refreshing()) return;
    this.scrollParent ??= this.findScrollParent();
    if ((this.scrollParent?.scrollTop ?? 0) > 0) return;
    this.startY = event.touches[0].clientY;
    this.dragging = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.dragging) return;
    const delta = event.touches[0].clientY - this.startY;
    this.pullDistance.set(delta > 0 ? Math.min(MAX_PULL_PX, delta * PULL_RESISTANCE) : 0);
  }

  onTouchEnd(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.pullDistance() >= PULL_THRESHOLD_PX) {
      this.refresh.emit();
    } else {
      this.pullDistance.set(0);
    }
  }

  private findScrollParent(): HTMLElement | null {
    let el = this.element.nativeElement.parentElement;
    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  }
}
