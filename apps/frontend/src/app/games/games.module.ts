import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { GameDashboardComponent } from './components/game-dashboard/game-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: GameDashboardComponent
  }
];

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    GameDashboardComponent
  ],
  exports: [
    GameDashboardComponent
  ]
})
export class GamesModule { }
