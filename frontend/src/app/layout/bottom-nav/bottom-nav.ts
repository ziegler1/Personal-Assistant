import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HapticDirective } from '../../shared/haptic.directive';

interface BottomNavItem {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule, HapticDirective],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly items: BottomNavItem[] = [
    { path: '/', label: 'Home', icon: 'home', exact: true },
    { path: '/notes', label: 'Notes', icon: 'description', exact: false },
    { path: '/search', label: 'Search', icon: 'search', exact: false },
    { path: '/chat', label: 'Chat', icon: 'forum', exact: false },
    { path: '/files', label: 'Files', icon: 'folder', exact: false },
  ];
}
