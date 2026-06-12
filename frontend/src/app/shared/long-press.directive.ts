import { Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

const LONG_PRESS_DURATION_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

@Directive({
  selector: '[appLongPress]',
})
export class LongPressDirective implements OnDestroy {
  readonly longPress = output<void>();

  private element = inject(ElementRef<HTMLElement>);
  private timer?: ReturnType<typeof setTimeout>;
  private startX = 0;
  private startY = 0;
  private triggered = false;

  constructor() {
    const el = this.element.nativeElement;
    el.addEventListener('touchstart', this.onStart, { passive: true });
    el.addEventListener('touchmove', this.onMove, { passive: true });
    el.addEventListener('touchend', this.onEnd);
    el.addEventListener('touchcancel', this.onCancel);
  }

  ngOnDestroy(): void {
    const el = this.element.nativeElement;
    el.removeEventListener('touchstart', this.onStart);
    el.removeEventListener('touchmove', this.onMove);
    el.removeEventListener('touchend', this.onEnd);
    el.removeEventListener('touchcancel', this.onCancel);
    clearTimeout(this.timer);
  }

  private onStart = (event: TouchEvent): void => {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.triggered = false;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.triggered = true;
      this.longPress.emit();
    }, LONG_PRESS_DURATION_MS);
  };

  private onMove = (event: TouchEvent): void => {
    const dx = Math.abs(event.touches[0].clientX - this.startX);
    const dy = Math.abs(event.touches[0].clientY - this.startY);
    if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) clearTimeout(this.timer);
  };

  private onEnd = (event: TouchEvent): void => {
    clearTimeout(this.timer);
    if (this.triggered) {
      event.preventDefault();
      this.triggered = false;
    }
  };

  private onCancel = (): void => {
    clearTimeout(this.timer);
    this.triggered = false;
  };
}
