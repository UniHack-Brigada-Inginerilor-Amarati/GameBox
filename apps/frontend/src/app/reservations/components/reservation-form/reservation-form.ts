import { Component, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../../auth/services/auth.service';
import { MatStepper } from '@angular/material/stepper';
import { Game } from '@gamebox/shared';
import { GameService } from '../../../games/services/game.service';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reservation-form.html',
  styleUrl: './reservation-form.css',
})
export class ReservationForm implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;
  private fb = inject(FormBuilder);
  private reservationService = inject(ReservationService);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  reservationForm!: FormGroup;
  games: Game[] = [];
  selectedGame?: Game;
  isLoading = false;
  isLoadingGames = false;
  currentUser: any = null;
  isAuthenticated = false;

  async ngOnInit(): Promise<void> {
    this.initForm();
    await this.checkAuthentication();
    this.setupAvailabilityRefresh();
    this.loadGames();
  }

  ngOnDestroy(): void {
    // No cleanup needed - removed availability refresh interval
  }

  private setupAvailabilityRefresh(): void {
    // Removed - no longer needed since time slots are manually entered
  }

  private async checkAuthentication(): Promise<void> {
    try {
      this.isAuthenticated = await this.authService.isAuthenticated();
      if (this.isAuthenticated) {
        try {
          const session = await this.authService.getSession();
          if (session.data.session?.user) {
            this.currentUser = { user: session.data.session.user };
            this.autoFillUserData();
          }
        } catch (error: any) {
          console.error('Error getting current user:', error);
        }
      }
    } catch (error: any) {
      console.error('Error checking authentication:', error);
    }
  }

  private autoFillUserData(): void {
    if (this.currentUser && this.currentUser.user && this.participants.length > 0) {
      const firstParticipant = this.participants.at(0);


      const user = this.currentUser.user;


      let userName = 'User';
      let userEmail = '';


      if (user.email) {
        userEmail = user.email;
      } else if (user.user_metadata?.email) {
        userEmail = user.user_metadata.email;
      } else if (user.user_metadata?.email_address) {
        userEmail = user.user_metadata.email_address;
      }


      if (user.user_metadata?.name) {
        userName = user.user_metadata.name;
      } else if (user.user_metadata?.full_name) {
        userName = user.user_metadata.full_name;
      } else if (userEmail) {

        userName = userEmail.split('@')[0];

        userName = userName.charAt(0).toUpperCase() + userName.slice(1);
      }


      const currentName = firstParticipant.get('name')?.value;
      const currentEmail = firstParticipant.get('email')?.value;

      if (!currentName || currentName.trim() === '') {
        firstParticipant.patchValue({ name: userName });
      }

      if (!currentEmail || currentEmail.trim() === '' && userEmail) {
        firstParticipant.patchValue({ email: userEmail });
      }
    } else {

      if (this.participants.length === 0) {
        setTimeout(() => this.autoFillUserData(), 100);
      }
    }
  }


  get selectedDate() {
    return this.reservationForm.get('date')?.value;
  }

  get selectedTime() {
    return this.reservationForm.get('slot_time')?.value;
  }

  get selectedGameSlug() {
    return this.reservationForm.get('game_mode')?.value;
  }

  get selectedGameName() {
    const gameSlug = this.selectedGameSlug;
    return this.getGameName(gameSlug || '');
  }

  get participantsCount() {
    return this.participants.length;
  }

  private initForm(): void {
    this.reservationForm = this.fb.group({
      date: ['', [Validators.required, this.futureDateValidator()]],
      slot_time: ['', Validators.required],
      game_mode: ['', Validators.required],
      participants: this.fb.array([]),
    });


    this.addParticipant();


    // Removed automatic time slot loading - user can now enter time manually


    this.reservationForm
      .get('game_mode')
      ?.valueChanges.subscribe((gameSlug) => {
        this.selectedGame = this.games.find(
          (game) => game.slug === gameSlug
        );
        this.updateParticipantsValidation();
      });
  }


  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return { pastDate: true };
      }

      return null;
    };
  }


  get minDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }


  get maxDate(): Date {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate;
  }


  isDateAvailable(date: Date): boolean {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }


  get participants(): FormArray {
    return this.reservationForm.get('participants') as FormArray;
  }


  addParticipant(): void {
    const participantGroup = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    this.participants.push(participantGroup);


    if (this.isAuthenticated && this.currentUser && this.participants.length === 1) {
      this.autoFillUserData();
    }
  }


  removeParticipant(index: number): void {
    if (this.participants.length > 1) {
      this.participants.removeAt(index);
    }
  }


  getGameName(gameSlug: string): string {
    const game = this.games.find((g) => g.slug === gameSlug);
    return game ? game.name : 'Unknown';
  }

  private updateParticipantsValidation(): void {
    // Removed participant validation based on game mode - no longer needed
  }

  private loadGames(): void {
    this.isLoadingGames = true;
    this.gameService.getGames().subscribe({
      next: (games) => {
        this.games = games;
        this.isLoadingGames = false;
      },
      error: (error) => {
        console.error('Error loading games:', error);
        this.snackBar.open('Error loading games. Please try again.', 'Close', {
          duration: 3000,
        });
        this.isLoadingGames = false;
      },
    });
  }

  // Removed loadAvailableTimeSlots and related methods - time slots are now manually entered


  getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }


  getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  private formatDateForBackend(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  // Removed time slot selection and validation methods - time slots are now manually entered


  onSubmit(): void {

    if (this.stepper && this.stepper.selectedIndex === this.stepper._steps.length - 1 && this.reservationForm.valid) {


      const formValue = this.reservationForm.value;
      const selectedDate = this.formatDateForBackend(formValue.date);
      const selectedTime = formValue.slot_time;

      // Validate time format (HH:MM)
      if (selectedTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(selectedTime)) {
        this.snackBar.open('Please enter time in 24-hour format (e.g., 10:00, 14:30)', 'Close', {
          duration: 5000,
        });
        return;
      }

      this.isLoading = true;

      const request: any = {
        date: selectedDate,
        slot_time: selectedTime,
        game_mode: formValue.game_mode,
        participants: formValue.participants,
      };

      this.reservationService.createReservation(request).subscribe({
        next: (reservation) => {
          this.isLoading = false;
          this.snackBar.open('Reservation created successfully!', 'Close', {
            duration: 3000,
          });


          // Removed - no longer loading time slots


          this.ensureShareLinkAndNavigate(reservation);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error creating reservation:', error);


          if (error.error?.message?.includes('no longer available')) {
            this.snackBar.open('This time slot was just booked by someone else. Please choose another time.', 'Close', {
              duration: 5000,
            });

            // Removed - no longer loading time slots
          } else {
            this.snackBar.open(
              'Error creating reservation. Please try again.',
              'Close',
              { duration: 3000 }
            );
          }
        },
      });
    }
  }

  preventEnter(event: any) {
    const keyboardEvent = event as KeyboardEvent;
    const stepper = document.querySelector('mat-stepper');
    if (stepper) {
      const steps = stepper.querySelectorAll('mat-step');
      const activeStep = Array.from(steps).findIndex(step => step.classList.contains('mat-step-active'));
      if (activeStep < steps.length - 1) {
        keyboardEvent.preventDefault();
      }
    }
  }

  private ensureShareLinkAndNavigate(reservation: any): void {
    // Directly navigate using reservation ID (no more tokens)
    this.router.navigate(['/r', reservation.id]);
  }
}
