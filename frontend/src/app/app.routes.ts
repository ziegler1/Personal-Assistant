import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'notes', pathMatch: 'full' },
  {
    path: 'notes',
    loadComponent: () => import('./features/notes/notes-list/notes-list').then((m) => m.NotesList),
  },
  {
    path: 'notes/new',
    loadComponent: () => import('./features/notes/note-editor/note-editor').then((m) => m.NoteEditor),
  },
  {
    path: 'notes/:id',
    loadComponent: () => import('./features/notes/note-editor/note-editor').then((m) => m.NoteEditor),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/chat').then((m) => m.Chat),
  },
  {
    path: 'files',
    loadComponent: () => import('./features/files/files').then((m) => m.Files),
  },
  { path: '**', redirectTo: 'notes' },
];
