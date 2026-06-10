import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FilesApi } from '../../core/services/files';
import { NoteFile } from '../../core/models/note.model';

@Component({
  selector: 'app-files',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './files.html',
  styleUrl: './files.scss',
})
export class Files implements OnInit {
  private filesApi = inject(FilesApi);
  private router = inject(Router);

  protected readonly files = signal<NoteFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly isDragging = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.filesApi.list().subscribe({
      next: (res) => {
        this.files.set(res.files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const fileList = event.dataTransfer?.files;
    if (fileList) this.uploadFiles(fileList);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(input.files);
    input.value = '';
  }

  download(file: NoteFile): void {
    this.filesApi.getDownloadUrl(file.id).subscribe((res) => {
      window.open(res.url, '_blank');
    });
  }

  delete(file: NoteFile): void {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    this.filesApi.delete(file.id).subscribe(() => this.load());
  }

  openNote(noteId: string): void {
    this.router.navigate(['/notes', noteId]);
  }

  formatSize(bytes: number | null): string {
    if (bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private uploadFiles(fileList: FileList): void {
    this.uploading.set(true);
    const uploads = Array.from(fileList).map((file) => this.filesApi.upload(file));
    let remaining = uploads.length;
    const onSettled = () => {
      remaining -= 1;
      if (remaining === 0) {
        this.uploading.set(false);
        this.load();
      }
    };
    uploads.forEach((upload$) => upload$.subscribe({ next: onSettled, error: onSettled }));
  }
}
