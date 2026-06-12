import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly navGroups: NavGroup[] = [
    {
      label: 'Knowledge',
      items: [
        { path: '/notes', label: 'Notes', icon: 'description' },
        { path: '/files', label: 'Files', icon: 'folder' },
      ],
    },
    {
      label: 'Discover',
      items: [
        { path: '/search', label: 'Search', icon: 'search' },
        { path: '/chat', label: 'Chat', icon: 'forum' },
      ],
    },
    {
      label: 'Create',
      items: [{ path: '/notes/new', label: 'New Note', icon: 'add' }],
    },
  ];
}
