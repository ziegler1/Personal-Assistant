import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly navigate = output<void>();

  protected readonly navItems: NavItem[] = [
    { path: '/notes', label: 'Notes', icon: 'description' },
    { path: '/search', label: 'Search', icon: 'search' },
    { path: '/chat', label: 'Chat', icon: 'forum' },
    { path: '/files', label: 'Files', icon: 'folder' },
  ];
}
