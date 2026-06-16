import { Component, inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';

export interface NoteActionSheetData {
  title: string;
}

export type NoteAction = 'edit' | 'delete' | 'share' | 'download' | 'email';

@Component({
  selector: 'app-note-action-sheet',
  imports: [MatIconModule],
  templateUrl: './note-action-sheet.html',
  styleUrl: './note-action-sheet.scss',
})
export class NoteActionSheet {
  private bottomSheetRef = inject(MatBottomSheetRef<NoteActionSheet, NoteAction>);
  protected readonly data = inject<NoteActionSheetData>(MAT_BOTTOM_SHEET_DATA);

  select(action: NoteAction): void {
    this.bottomSheetRef.dismiss(action);
  }
}
