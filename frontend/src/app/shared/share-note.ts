import { Note } from '../core/models/note.model';
import { ShareApi } from '../core/services/share';
import { ToastService } from '../core/services/toast';

export function shareNote(note: Note, shareApi: ShareApi, toast: ToastService): void {
  shareApi.create(note.id).subscribe({
    next: ({ token }) => {
      const url = `${window.location.origin}/share/${token}`;
      console.debug('[shareNote] sharing url:', url); // remove after verifying

      if (navigator.share) {
        navigator.share({ title: note.title, url }).catch(() => {});
        return;
      }

      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Link copied to clipboard'))
        .catch(() => toast.error('Could not copy link'));
    },
    error: () => toast.error('Failed to create share link'),
  });
}
