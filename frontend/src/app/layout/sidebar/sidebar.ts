import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth';

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
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule, MatButtonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private auth = inject(AuthService);
  private router = inject(Router);

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

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
