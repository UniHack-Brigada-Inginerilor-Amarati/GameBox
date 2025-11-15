import { Component, Input, OnInit, AfterViewInit, OnChanges, SimpleChanges, ViewChild, ElementRef, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AbilityScores, AbilityScore } from '@gamebox/shared';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-ability-radar-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './ability-radar-chart.component.html',
  styleUrls: ['./ability-radar-chart.component.scss'],
})
export class AbilityRadarChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() userId?: string; // Optional: if not provided, uses current user
  @Input() username?: string; // Optional: username to fetch abilities for
  @ViewChild('radarChart', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly abilityScores = signal<AbilityScores | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  private profileService = inject(ProfileService);
  private previousUsername?: string;

  constructor() {
    // Watch for abilityScores changes and redraw chart when both data and view are ready
    effect(() => {
      const scores = this.abilityScores();
      if (scores) {
        // Use setTimeout to ensure view is updated and ViewChild is initialized
        setTimeout(() => {
          if (this.canvasRef?.nativeElement) {
            this.drawRadarChart();
          }
        }, 0);
      }
    });
  }

  ngOnInit(): void {
    this.loadAbilityScores();
    this.previousUsername = this.username;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload data when username changes (including first change if username is provided)
    if (changes['username']) {
      const newUsername = changes['username'].currentValue;
      if (newUsername !== this.previousUsername) {
        this.previousUsername = newUsername;
        // Only reload if not first change (first change is handled by ngOnInit)
        if (!changes['username'].firstChange) {
          this.loadAbilityScores();
        }
      }
    }
  }

  ngAfterViewInit(): void {
    // If data is already loaded, draw the chart
    if (this.abilityScores()) {
      setTimeout(() => this.drawRadarChart(), 0);
    }
  }

  loadAbilityScores(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    // Clear previous data and canvas
    this.abilityScores.set(null);
    if (this.canvasRef?.nativeElement) {
      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
      }
    }

    this.profileService.getAbilityScores(this.username).subscribe({
      next: (scores: AbilityScores) => {
        this.abilityScores.set(scores);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set('Failed to load ability scores');
        this.isLoading.set(false);
        console.error('Error loading ability scores:', err);
      },
    });
  }

  drawRadarChart(): void {
    const scores = this.abilityScores();
    if (!scores) return;

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    const numAbilities = 6;
    const angleStep = (2 * Math.PI) / numAbilities;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid circles
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < numAbilities; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Get ability scores in order
    const abilities: AbilityScore[] = [
      scores.mentalFortitudeComposure,
      scores.adaptabilityDecisionMaking,
      scores.aimMechanicalSkill,
      scores.gameSenseAwareness,
      scores.teamworkCommunication,
      scores.strategy,
    ];

    // Draw filled area
    ctx.fillStyle = 'rgba(63, 81, 181, 0.3)';
    ctx.strokeStyle = '#3f51b5';
    ctx.lineWidth = 2;
    ctx.beginPath();

    abilities.forEach((ability, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const distance = (radius * ability.score) / 1000;
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#3f51b5';
    abilities.forEach((ability, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const distance = (radius * ability.score) / 1000;
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    abilities.forEach((ability, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelDistance = radius + 25;
      const x = centerX + labelDistance * Math.cos(angle);
      const y = centerY + labelDistance * Math.sin(angle);

      // Split long labels into multiple lines
      const words = ability.abilityName.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (testLine.length <= 12) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);

      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, x, y + (lineIndex - (lines.length - 1) / 2) * 14);
      });

      // Draw score
      const scoreDistance = (radius * ability.score) / 1000;
      const scoreX = centerX + scoreDistance * Math.cos(angle);
      const scoreY = centerY + scoreDistance * Math.sin(angle);
      ctx.fillStyle = '#3f51b5';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(Math.round(ability.score).toString(), scoreX, scoreY - 15);
    });
  }

  getAbilitiesArray(): AbilityScore[] {
    const scores = this.abilityScores();
    if (!scores) return [];

    return [
      scores.mentalFortitudeComposure,
      scores.adaptabilityDecisionMaking,
      scores.aimMechanicalSkill,
      scores.gameSenseAwareness,
      scores.teamworkCommunication,
      scores.strategy,
    ];
  }
}
