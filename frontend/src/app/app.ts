import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from './layout/sidebar/sidebar';
import { BottomNav } from './layout/bottom-nav/bottom-nav';

const MOBILE_BREAKPOINT = '(max-width: 767.98px)';

// Top-level tabs in the order they appear in the bottom nav — used to decide
// whether a navigation should slide in from the right (forward) or left (back).
const ROUTE_ORDER = ['/', '/notes', '/search', '/chat', '/files'];

function topLevelSegment(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  const parts = path.split('/').filter(Boolean);
  return parts.length === 0 ? '/' : `/${parts[0]}`;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly navDirection = signal<'forward' | 'back' | 'fade'>('fade');

  private previousSegment: string | null = null;

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const segment = topLevelSegment(event.urlAfterRedirects);
        const prevIndex = this.previousSegment ? ROUTE_ORDER.indexOf(this.previousSegment) : -1;
        const nextIndex = ROUTE_ORDER.indexOf(segment);

        if (segment === this.previousSegment || prevIndex === -1 || nextIndex === -1) {
          this.navDirection.set('fade');
        } else {
          this.navDirection.set(nextIndex > prevIndex ? 'forward' : 'back');
        }

        this.previousSegment = segment;
      });
  }
}
