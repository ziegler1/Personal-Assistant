import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { FilesApi } from '../../core/services/files';
import { NoteFile } from '../../core/models/note.model';
import { FilePreviewDialog } from './file-preview-dialog/file-preview-dialog';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.md', '.json'];
const MOBILE_BREAKPOINT = 600;

interface UploadItem {
  filename: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  noteTitle?: string;
  error?: string;
}

@Component({
  selector: 'app-files',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './files.html',
  styleUrl: './files.scss',
})
export class Files implements OnInit {
  private filesApi = inject(FilesApi);
  private dialog = inject(MatDialog);

  protected readonly acceptAttr = ACCEPTED_EXTENSIONS.join(',');
  protected readonly files = signal<NoteFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly isDragging = signal(false);
  protected readonly uploadItems = signal<UploadItem[]>([]);
  protected readonly dropzoneCollapsed = signal(window.innerWidth <= MOBILE_BREAKPOINT);

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

  toggleDropzone(): void {
    this.dropzoneCollapsed.set(!this.dropzoneCollapsed());
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

  preview(file: NoteFile): void {
    this.dialog.open(FilePreviewDialog, {
      width: '600px',
      maxWidth: '90vw',
      data: { file },
    });
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

  dismissUpload(item: UploadItem): void {
    this.uploadItems.set(this.uploadItems().filter((i) => i !== item));
  }

  formatSize(bytes: number | null): string {
    if (bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileIcon(mimeType: string | null): string {
    if (!mimeType) return 'insert_drive_file';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'article';
    if (mimeType === 'application/json') return 'data_object';
    return 'insert_drive_file';
  }

  fileIconClass(mimeType: string | null): string {
    if (!mimeType) return 'file-icon-default';
    if (mimeType === 'application/pdf') return 'file-icon-pdf';
    if (mimeType.startsWith('image/')) return 'file-icon-image';
    if (mimeType.startsWith('text/')) return 'file-icon-text';
    if (mimeType === 'application/json') return 'file-icon-json';
    return 'file-icon-default';
  }

  private validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds the 50MB size limit';
    }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Unsupported file type. Accepted: PDF, PNG, JPG, TXT, MD, JSON';
    }
    return null;
  }

  private uploadFiles(fileList: FileList): void {
    const incoming = Array.from(fileList);
    const items: UploadItem[] = incoming.map((file) => ({
      filename: file.name,
      progress: 0,
      status: 'uploading',
    }));
    this.uploadItems.set(items);
    this.uploading.set(true);

    let remaining = incoming.length;
    const onSettled = () => {
      remaining -= 1;
      if (remaining === 0) {
        this.uploading.set(false);
        this.load();
      }
    };

    incoming.forEach((file, index) => {
      const item = items[index];

      const validationError = this.validateFile(file);
      if (validationError) {
        item.status = 'error';
        item.error = validationError;
        this.uploadItems.set([...this.uploadItems()]);
        onSettled();
        return;
      }

      this.filesApi.upload(file).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            item.progress = Math.round((100 * event.loaded) / event.total);
            this.uploadItems.set([...this.uploadItems()]);
          } else if (event.type === HttpEventType.Response) {
            item.status = 'done';
            item.progress = 100;
            item.noteTitle = event.body?.note_title;
            this.uploadItems.set([...this.uploadItems()]);
          }
        },
        error: (err) => {
          item.status = 'error';
          item.error = err?.error?.error || 'Upload failed';
          this.uploadItems.set([...this.uploadItems()]);
          onSettled();
        },
        complete: () => onSettled(),
      });
    });
  }
}
