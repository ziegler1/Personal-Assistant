import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { MatChipsModule } from '@angular/material/chips';
import { ShareApi } from '../../core/services/share';
import { SharedNote } from '../../core/models/note.model';

@Component({
  selector: 'app-share-view',
  imports: [MarkdownModule, MatChipsModule],
  templateUrl: './share-view.html',
  styleUrl: './share-view.scss',
})
export class ShareView implements OnInit {
  private route = inject(ActivatedRoute);
  private shareApi = inject(ShareApi);

  protected readonly note = signal<SharedNote | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.shareApi.getPublic(token).subscribe({
      next: (n) => {
        this.note.set(n);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'This link is invalid or has been revoked.');
        this.loading.set(false);
      },
    });
  }
}
