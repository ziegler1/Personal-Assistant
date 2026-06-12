import { Note } from '../core/models/note.model';
import { ToastService } from '../core/services/toast';

export function shareNote(note: Note, toast: ToastService): void {
  const url = `${window.location.origin}/notes/${note.id}`;

  if (navigator.share) {
    navigator.share({ title: note.title, url }).catch(() => {});
    return;
  }

  navigator.clipboard
    .writeText(url)
    .then(() => toast.success('Link copied to clipboard'))
    .catch(() => toast.error('Could not copy link'));
}
