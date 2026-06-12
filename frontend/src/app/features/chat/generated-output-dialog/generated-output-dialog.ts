import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownModule } from 'ngx-markdown';
import { NotesApi } from '../../../core/services/notes';
import { ExportApi } from '../../../core/services/export';
import { ContentType, GenerateFormat, GeneratedOutput } from '../../../core/models/note.model';
import {
  createGeneratedPdf,
  downloadDataUrl,
  noteCardToPngDataUrl,
  renderMermaidSvg,
  svgToPngDataUrl,
} from '../../../shared/export-utils';

export interface GeneratedOutputDialogData {
  output: GeneratedOutput;
}

const CONTENT_TYPE_BY_FORMAT: Record<GenerateFormat, ContentType> = {
  'note-card': 'text',
  'markdown-doc': 'text',
  checklist: 'text',
  'workflow-diagram': 'code',
};

@Component({
  selector: 'app-generated-output-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MarkdownModule],
  templateUrl: './generated-output-dialog.html',
  styleUrl: './generated-output-dialog.scss',
})
export class GeneratedOutputDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<GeneratedOutputDialog>);
  private data = inject<GeneratedOutputDialogData>(MAT_DIALOG_DATA);
  private notesApi = inject(NotesApi);
  private exportApi = inject(ExportApi);
  private sanitizer = inject(DomSanitizer);

  protected readonly output = this.data.output;
  protected readonly isDiagram = this.output.format === 'workflow-diagram';
  protected readonly supportsPng = this.isDiagram || this.output.format === 'note-card';

  protected readonly diagramSvg = signal<SafeHtml | null>(null);
  protected readonly diagramSvgRaw = signal<string | null>(null);
  protected readonly loadingDiagram = signal(false);
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly status = signal('');

  protected readonly actionsDisabled = computed(
    () => this.busy() || (this.isDiagram && (this.loadingDiagram() || !this.diagramSvgRaw()))
  );

  ngOnInit(): void {
    if (!this.isDiagram) return;

    this.loadingDiagram.set(true);
    renderMermaidSvg(this.output.content)
      .then((svg) => {
        this.diagramSvgRaw.set(svg);
        this.diagramSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg));
      })
      .catch(() => this.status.set('Failed to render diagram.'))
      .finally(() => this.loadingDiagram.set(false));
  }

  close(): void {
    this.dialogRef.close();
  }

  private async getDiagramPng(): Promise<string | undefined> {
    const svg = this.diagramSvgRaw();
    return svg ? svgToPngDataUrl(svg) : undefined;
  }

  async downloadPdf(): Promise<void> {
    this.busy.set(true);
    this.status.set('');
    try {
      const diagramImage = this.isDiagram ? await this.getDiagramPng() : undefined;
      const pdf = await createGeneratedPdf(this.output, diagramImage);
      await pdf.download(`${this.output.title}.pdf`);
    } catch {
      this.status.set('Failed to generate PDF.');
    } finally {
      this.busy.set(false);
    }
  }

  async downloadPng(): Promise<void> {
    this.busy.set(true);
    this.status.set('');
    try {
      const dataUrl = this.isDiagram
        ? await this.getDiagramPng()
        : noteCardToPngDataUrl(this.output.title, this.output.content);
      if (!dataUrl) throw new Error('No image to export');
      downloadDataUrl(dataUrl, `${this.output.title}.png`);
    } catch {
      this.status.set('Failed to generate image.');
    } finally {
      this.busy.set(false);
    }
  }

  saveAsNote(): void {
    if (this.saved() || this.busy()) return;

    this.busy.set(true);
    this.status.set('');
    this.notesApi
      .create({
        title: this.output.title,
        content: this.output.content,
        content_type: CONTENT_TYPE_BY_FORMAT[this.output.format],
        source: null,
        tags: [],
      })
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.busy.set(false);
          this.status.set('Saved as note.');
        },
        error: () => {
          this.busy.set(false);
          this.status.set('Failed to save note.');
        },
      });
  }

  async copyShareLink(): Promise<void> {
    this.busy.set(true);
    this.status.set('');
    try {
      const diagramImage = this.isDiagram ? await this.getDiagramPng() : undefined;
      const pdf = await createGeneratedPdf(this.output, diagramImage);
      const base64 = await pdf.getBase64();
      this.exportApi.share(`${this.output.title}.pdf`, 'application/pdf', base64).subscribe({
        next: (res) => {
          this.busy.set(false);
          navigator.clipboard
            .writeText(res.url)
            .then(() => this.status.set('Share link copied to clipboard.'))
            .catch(() => this.status.set(`Share link: ${res.url}`));
        },
        error: () => {
          this.busy.set(false);
          this.status.set('Failed to create share link.');
        },
      });
    } catch {
      this.busy.set(false);
      this.status.set('Failed to generate PDF.');
    }
  }

  async emailToSelf(): Promise<void> {
    this.busy.set(true);
    this.status.set('');
    try {
      const diagramImage = this.isDiagram ? await this.getDiagramPng() : undefined;
      const pdf = await createGeneratedPdf(this.output, diagramImage);
      const base64 = await pdf.getBase64();
      this.exportApi.email(`${this.output.title}.pdf`, 'application/pdf', base64, this.output.title).subscribe({
        next: () => {
          this.busy.set(false);
          this.status.set('Emailed to your inbox.');
        },
        error: () => {
          this.busy.set(false);
          this.status.set('Failed to send email.');
        },
      });
    } catch {
      this.busy.set(false);
      this.status.set('Failed to generate PDF.');
    }
  }
}
