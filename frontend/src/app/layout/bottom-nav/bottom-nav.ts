import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface BottomNavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly items: BottomNavItem[] = [
    { path: '/notes', label: 'Notes', icon: 'description' },
    { path: '/search', label: 'Search', icon: 'search' },
    { path: '/chat', label: 'Chat', icon: 'forum' },
    { path: '/files', label: 'Files', icon: 'folder' },
  ];
}
