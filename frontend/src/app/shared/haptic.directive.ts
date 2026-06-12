import { Directive, HostListener, inject } from '@angular/core';
import { HapticService } from '../core/services/haptic';

@Directive({
  selector: '[appHaptic]',
})
export class HapticDirective {
  private haptic = inject(HapticService);

  @HostListener('click')
  onClick(): void {
    this.haptic.tap();
  }
}
