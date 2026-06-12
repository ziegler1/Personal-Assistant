import { Service } from '@angular/core';

const TAP_DURATION_MS = 10;

@Service()
export class HapticService {
  tap(): void {
    navigator.vibrate?.(TAP_DURATION_MS);
  }
}
