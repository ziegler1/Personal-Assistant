import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { createNote } from './notesService';
import { Note } from '../types/models';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return '';
  } finally {
    await parser.destroy();
  }
}

export async function extractImageText(buffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(buffer);
      return data.text.trim();
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.error('Image OCR failed:', err);
    return '';
  }
}

export function noteTitleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export async function createNoteFromFileText(filename: string, text: string): Promise<Note> {
  return createNote({
    title: noteTitleFromFilename(filename),
    content: text,
    content_type: 'file',
    tags: [],
  });
}
