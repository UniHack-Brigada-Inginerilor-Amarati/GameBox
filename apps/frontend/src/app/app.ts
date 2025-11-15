
import { Component, inject, OnInit, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { Subscription } from 'rxjs';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthService } from './auth/services/auth.service';
import {NavMenuComponent} from './navigation';

@Component({
  imports: [CommonModule, RouterModule, NavMenuComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected title = 'Gamebox';
  private authService = inject(AuthService);
  private router = inject(Router);
  private authSubscription?: Subscription;

  readonly session = signal<Session | null>(null);
  private currentUrl = signal<string>('');

  private readonly validRoutes = [
    '/profile/me',
    '/friends',
    '/scratch-card',
    '/my-reservations',
    '/reservation/new',
    '/games',
    '/missions',
    '/lol-score',
  ];
  
  readonly showNavMenu = computed(() => {
    const url = this.currentUrl();
    const hasSession = !!this.session();
    
    const isAuthRoute = url.startsWith('/auth');
    
    const shouldShow = hasSession || (!isAuthRoute && this.validRoutes.some(route => url.startsWith(route)));
    
    return shouldShow;
  });

  ngOnInit() {
    this.authService.getSession().then(({ data }) => {
      this.session.set(data.session);
    });

    this.authSubscription = this.authService.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      this.session.set(session);
    }).subscribe();

    this.currentUrl.set(this.router.url || '/');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const newUrl = e.urlAfterRedirects || e.url || '/';
      console.log('Route changed to:', newUrl);
      this.currentUrl.set(newUrl);
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}