import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Mission,
  Session,
  UserProfile,
  Game,
  GameResult,
  PlayerGameResult,
} from '@gamebox/shared';
import { SessionService } from '../../services/session.service';
import { MissionService } from '../../services/mission.service';
import { MissionProgressComponent } from './gameplay-page-components/mission-progress/mission-progress.component';
import { CurrentGameComponent } from './gameplay-page-components/current-game/current-game.component';
import { PlayersProgressComponent } from './gameplay-page-components/players-progress/players-progress.component';

export interface GameplayData {
  session: Session;
  players: UserProfile[];
  mission: Mission;
}

@Component({
  selector: 'app-mission-gameplay-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MissionProgressComponent,
    CurrentGameComponent,
    PlayersProgressComponent,
  ],
  templateUrl: './mission-gameplay-page.component.html',
  styleUrls: ['./mission-gameplay-page.component.scss'],
})
export class MissionGameplayPageComponent implements OnInit, OnDestroy {
  gameplayData: GameplayData | null = null;

  games: Game[] = [];
  currentGameIndex = 0;
  gameResults: PlayerGameResult[] = [];
  loading = false;
  gameCompleted = false;
  missionCompleted = false;

  gameOrder: (keyof Mission['games'])[] = [
    'mentalFortitudeComposure',
    'adaptabilityDecisionMaking',
    'aimMechanicalSkill',
    'gameSenseAwareness',
    'teamworkCommunication',
    'strategy',
  ];

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private missionService = inject(MissionService);

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.gameplayData = {
        session: navigation.extras.state['session'],
        players: navigation.extras.state['players'],
        mission: navigation.extras.state['mission'],
      };
      this.initializeGames();
    } else {
      const missionSlug = this.route.snapshot.paramMap.get('slug');
      const sessionId = this.route.snapshot.paramMap.get('sessionId');

      if (missionSlug && sessionId) {
        this.loadGameplayData(missionSlug, sessionId);
      } else {
        this.router.navigate(['/missions']);
      }
    }
  }

  ngOnDestroy(): void {
    this.gameplayData = null;
    this.games = [];
    this.gameResults = [];
    this.loading = false;
    this.gameCompleted = false;
    this.missionCompleted = false;
    this.currentGameIndex = 0;
    this.gameOrder = [];
  }

  private loadGameplayData(missionSlug: string, sessionId: string): void {
    this.loading = true;

    this.missionService.getMissionBySlug(missionSlug).subscribe({
      next: (mission) => {
        this.sessionService.getSession(sessionId).subscribe({
          next: (session) => {
            this.sessionService.getSessionPlayers(sessionId).subscribe({
              next: (players) => {
                this.gameplayData = {
                  mission,
                  session,
                  players,
                };
                this.initializeGames();
                this.loading = false;
              },
              error: () => {
                console.error('Error loading session data');
                this.loading = false;
                this.router.navigate(['/missions']);
              },
            });
          },
          error: (error) => {
            console.error('Error loading session:', error);
            this.loading = false;
            this.router.navigate(['/missions']);
          },
        });
      },
      error: (error) => {
        console.error('Error loading mission:', error);
        this.loading = false;
        this.router.navigate(['/missions']);
      },
    });
  }

  private initializeGames(): void {
    if (!this.gameplayData) return;

    this.games = this.gameOrder.map(
      (ability) => this.gameplayData?.mission.games[ability]
    ).filter((game): game is Game => !!game);
    this.loadGameResults();
  }

  private loadGameResults(): void {
    if (!this.gameplayData) return;

    this.loading = true;
    this.sessionService
      .getGameResults(this.gameplayData.session.session_id)
      .subscribe({
        next: (results) => {
          this.gameResults = results;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading game results:', error);
          this.loading = false;
        },
      });
  }

  get currentGame(): Game | null {
    return this.games[this.currentGameIndex] || null;
  }

  get isLastGame(): boolean {
    return this.currentGameIndex === this.games.length - 1;
  }

  goBack(): void {
    this.router.navigate(['/missions']);
  }

  onGameResultsUpdated(results: PlayerGameResult[]): void {
    // If empty array, reload from server; otherwise use the provided results
    if (results.length === 0 && this.gameplayData) {
      this.loadGameResults();
    } else {
      this.gameResults = results;
    }
  }

  onMissionCompletedUpdate(completed: boolean): void {
    this.missionCompleted = completed;
    // Reload game results when mission is completed to get final scores
    if (completed && this.gameplayData) {
      this.loadGameResults();
    }
  }

}
