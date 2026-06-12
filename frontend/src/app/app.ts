import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from './layout/sidebar/sidebar';
import { BottomNav } from './layout/bottom-nav/bottom-nav';

const MOBILE_BREAKPOINT = '(max-width: 767.98px)';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, BottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private breakpointObserver = inject(BreakpointObserver);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
}
