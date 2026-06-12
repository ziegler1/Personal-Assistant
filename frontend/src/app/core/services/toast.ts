import { Service, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const TOAST_DURATION_MS = 3000;

@Service()
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'toast-success');
  }

  error(message: string): void {
    this.show(message, 'toast-error');
  }

  private show(message: string, panelClass: string): void {
    this.snackBar.open(message, undefined, {
      duration: TOAST_DURATION_MS,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass,
    });
  }
}
