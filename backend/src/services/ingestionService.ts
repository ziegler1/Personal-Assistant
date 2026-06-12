import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { createNote } from './notesService';
import { Note } from '../types/models';

export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return null;
  } finally {
    await parser.destroy();
  }
}

export async function extractImageText(buffer: Buffer): Promise<string | null> {
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
    return null;
  }
}

export function noteTitleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export const NO_TEXT_EXTRACTED_PREFIX = 'No text could be extracted';

export async function createNoteFromFileText(filename: string, text: string): Promise<Note> {
  const hasText = text.length > 0;
  return createNote({
    title: noteTitleFromFilename(filename),
    content: hasText ? text : `${NO_TEXT_EXTRACTED_PREFIX} from "${filename}".`,
    content_type: hasText ? 'text' : 'file',
    tags: [],
  });
}
