import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  submit(): void {
    if (!this.password().trim() || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.password()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Incorrect password');
      },
    });
  }
}
