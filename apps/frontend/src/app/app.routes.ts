import { Route } from '@angular/router';
import {
  LoginComponent,
  RegisterComponent,
  ForgotPasswordComponent,
  VerifyEmailComponent,
  OAuthCallbackComponent,
  AuthGuard,
  ResetPasswordComponent,
  AdminGuard,
} from './auth';
import { ProfilePageComponent } from './profile';
import {
  MissionDashboardComponent,
  MissionPageComponent,
  PlayMissionPageComponent,
  MissionGameplayPageComponent,
} from './missions';
import { TournamentsDashboardComponent } from './tournaments';
import { ReservationForm } from './reservations/components/reservation-form/reservation-form';
import { MyReservations } from './reservations/components/my-reservations/my-reservations';
import { ReservationShare } from './reservations/components/reservation-share/reservation-share';
import { LandingPageComponent } from './landing';
import { ScratchCardComponent } from './profile';
import { FriendsPageComponent } from './friends';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LandingPageComponent,
    pathMatch: 'full',
  },

  {
    path: 'landing',
    component: LandingPageComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'scratch-card',
    component: ScratchCardComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'profile/me',
    component: ProfilePageComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'friends',
    component: FriendsPageComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'scratch-card',
    component: ScratchCardComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'missions',
    component: MissionDashboardComponent,
    canActivate: [AuthGuard],
  },

  // Admin-only route for mission details
  {
    path: 'missions/:slug',
    component: MissionPageComponent,
    canActivate: [AuthGuard, AdminGuard],
  },
  // {
  //   path: 'missions/:slug/play',
  //   component: PlayMissionPageComponent,
  //   canActivate: [AuthGuard,AdminGuard],
  // },

  {
    path: 'missions/:slug/play/:sessionId',
    component: MissionGameplayPageComponent,
    canActivate: [AuthGuard,AdminGuard],
  },

  {
    path: 'tournaments',
    component: TournamentsDashboardComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
    canActivate: [AuthGuard, AdminGuard],
  },

  {
    path: 'auth/login',
    component: LoginComponent,
  },

  {
    path: 'auth/register',
    component: RegisterComponent,
  },

  {
    path: 'auth/forgot-password',
    component: ForgotPasswordComponent,
  },

  {
    path: 'auth/verify-email',
    component: VerifyEmailComponent,
  },

  {
    path: 'auth/reset-password',
    component: ResetPasswordComponent,
  },

  {
    path: 'auth/callback',
    component: OAuthCallbackComponent,
  },

  {
    path: 'reservation/new',
    component: ReservationForm,
  },

  {
    path: 'my-reservations',
    component: MyReservations,
    canActivate: [AuthGuard],
  },

  {
    path: 'r/:id',
    component: ReservationShare,
  },

  {
    path: '**',
    component: LandingPageComponent,
  },
];
