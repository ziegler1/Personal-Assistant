import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'share/:token',
    loadComponent: () => import('./features/share/share-view').then((m) => m.ShareView),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notes/notes-list/notes-list').then((m) => m.NotesList),
  },
  {
    path: 'notes/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notes/note-editor/note-editor').then((m) => m.NoteEditor),
  },
  {
    path: 'notes/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notes/note-editor/note-editor').then((m) => m.NoteEditor),
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat').then((m) => m.Chat),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () => import('./features/files/files').then((m) => m.Files),
  },
  { path: '**', redirectTo: '' },
];
