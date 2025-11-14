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
import { GAME_MODES, TIME_SLOTS } from '@gamebox/shared';

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
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  reservationForm!: FormGroup;
  gameModes = GAME_MODES;
  timeSlots = TIME_SLOTS;
  availableTimeSlots: any[] = [];
  selectedGameMode?: any;
  isLoading = false;
  currentUser: any = null;
  isAuthenticated = false;
  private availabilityRefreshInterval: any;

  async ngOnInit(): Promise<void> {
    this.initForm();
    await this.checkAuthentication();
    this.setupAvailabilityRefresh();
  }

  ngOnDestroy(): void {
    if (this.availabilityRefreshInterval) {
      clearInterval(this.availabilityRefreshInterval);
    }
  }

  private setupAvailabilityRefresh(): void {
    this.availabilityRefreshInterval = setInterval(() => {
      const selectedDate = this.reservationForm.get('date')?.value;
      if (selectedDate) {
        this.loadAvailableTimeSlots(selectedDate);
      }
    }, 30000);
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

  get selectedGameModeId() {
    return this.reservationForm.get('game_mode')?.value;
  }

  get selectedLevel() {
    return this.reservationForm.get('level')?.value;
  }

  get selectedGameModeName() {
    const gameModeId = this.selectedGameModeId;
    return this.gameModes.find(g => g.id === gameModeId)?.name || '';
  }

  get participantsCount() {
    return this.participants.length;
  }

  private initForm(): void {
    this.reservationForm = this.fb.group({
      date: ['', [Validators.required, this.futureDateValidator()]],
      slot_time: ['', Validators.required],
      game_mode: ['', Validators.required],
      level: ['beginner', Validators.required],
      participants: this.fb.array([]),
    });


    this.addParticipant();


    this.reservationForm.get('date')?.valueChanges.subscribe((date) => {
      if (date) {
        this.loadAvailableTimeSlots(date);

        this.reservationForm.patchValue({ slot_time: '' });
      }
    });


    this.reservationForm
      .get('game_mode')
      ?.valueChanges.subscribe((gameModeId) => {
        this.selectedGameMode = this.gameModes.find(
          (gm) => gm.id === gameModeId
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


  onGameModeChange(gameModeId: string): void {
    this.selectedGameMode = this.gameModes.find(gm => gm.id === gameModeId);
    if (this.selectedGameMode) {
      this.updateParticipantsValidation();
    }
  }


  getGameModeName(gameModeId: string): string {
    return this.gameModes.find(gm => gm.id === gameModeId)?.name || gameModeId;
  }


  getDifficultyDisplayName(level: string): string {
    const levelMap: { [key: string]: string } = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return levelMap[level] || level;
  }


  getGameModeDisplayValue(gameModeId: string): string {
    return this.getGameModeName(gameModeId);
  }


  getDifficultyDisplayValue(level: string): string {
    return this.getDifficultyDisplayName(level);
  }


  getDifficultyIcon(level: string): string {
    const iconMap: { [key: string]: string } = {
      'beginner': 'trending_up',
      'intermediate': 'trending_up',
      'advanced': 'trending_up'
    };
    return iconMap[level] || 'trending_up';
  }


  private updateParticipantsValidation(): void {
    if (!this.selectedGameMode) return;

    const currentCount = this.participants.length;
    const minPlayers = this.selectedGameMode.min_players;
    const maxPlayers = this.selectedGameMode.max_players;


    while (this.participants.length < minPlayers) {
      this.addParticipant();
    }


    while (this.participants.length > maxPlayers) {
      this.removeParticipant(this.participants.length - 1);
    }
  }


  private loadAvailableTimeSlots(date: Date): void {
    const dateString = this.formatDateForBackend(date);
    this.isLoading = true;

    this.reservationService.getAvailableTimeSlots(dateString).subscribe({
      next: (slots) => {
        this.availableTimeSlots = slots;
        this.isLoading = false;


        const todayString = this.getCurrentDate();
        const selectedDateString = dateString;
        const isToday = todayString === selectedDateString;


        if (slots.length === 0 && !isToday) {
          this.snackBar.open('No time slots available for this date', 'Close', {
            duration: 3000,
          });
        }
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
        this.snackBar.open('Error loading available time slots', 'Close', {
          duration: 3000,
        });
        this.isLoading = false;
      },
    });
  }


  isTimeSlotAvailable(time: string): boolean {
    const slot = this.availableTimeSlots.find((s) => s.time === time);
    return slot?.available ?? false;
  }


  getAvailableTimeSlots(): any[] {
    return this.availableTimeSlots.filter(slot => slot.status === 'available');
  }


  getAvailableSlotsCount(): number {
    return this.availableTimeSlots.filter(slot => slot.status === 'available').length;
  }


  getBookedSlotsCount(): number {
    return this.availableTimeSlots.filter(slot => slot.status === 'booked').length;
  }


  getPastSlotsCount(): number {
    return this.availableTimeSlots.filter(slot => slot.status === 'past').length;
  }


  getTimeSlotSummary(): string {
    const available = this.getAvailableSlotsCount();
    const booked = this.getBookedSlotsCount();
    const past = this.getPastSlotsCount();

    return `${available} available, ${booked} booked, ${past} past`;
  }


  getTimeSlotStatus(time: string): string {
    const slot = this.availableTimeSlots.find((s) => s.time === time);
    return slot?.status || 'unknown';
  }


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


  isTimeSlotPast(time: string): boolean {
    const selectedDate = this.reservationForm.get('date')?.value;

    if (!selectedDate) return false;


    const todayString = this.getCurrentDate();
    const selectedDateString = this.formatDateForBackend(selectedDate);

    if (todayString !== selectedDateString) {
      return false;
    }


    const currentTime = this.getCurrentTime();
    return time < currentTime;
  }


  selectTimeSlot(slot: any): void {
    if (slot.available) {
      this.reservationForm.patchValue({ slot_time: slot.time });
    } else if (slot.reservation_id) {

      this.snackBar.open(`Time slot ${slot.time} is already booked`, 'Close', {
        duration: 3000,
      });
    } else {

      this.snackBar.open(`Cannot select past time slot ${slot.time}`, 'Close', {
        duration: 3000,
      });
    }
  }


  isSelectedTimeSlotAvailable(): boolean {
    const selectedTime = this.reservationForm.get('slot_time')?.value;
    if (!selectedTime) return true;

    const slot = this.availableTimeSlots.find((s) => s.time === selectedTime);
    return slot?.available === true;
  }


  onSubmit(): void {

    if (this.stepper && this.stepper.selectedIndex === this.stepper._steps.length - 1 && this.reservationForm.valid) {


      const formValue = this.reservationForm.value;
      const selectedDate = this.formatDateForBackend(formValue.date);
      const selectedTime = formValue.slot_time;



      const selectedSlot = this.availableTimeSlots.find(slot => slot.time === selectedTime);
      if (!selectedSlot || !selectedSlot.available) {
        this.snackBar.open('Selected time slot is no longer available. Please choose another time.', 'Close', {
          duration: 5000,
        });

        this.loadAvailableTimeSlots(formValue.date);
        this.reservationForm.patchValue({ slot_time: '' });
        return;
      }

      this.isLoading = true;

      const request: any = {
        date: selectedDate,
        slot_time: selectedTime,
        game_mode: formValue.game_mode,
        level: formValue.level,
        participants: formValue.participants,
      };

      this.reservationService.createReservation(request).subscribe({
        next: (reservation) => {
          this.isLoading = false;
          this.snackBar.open('Reservation created successfully!', 'Close', {
            duration: 3000,
          });


          this.loadAvailableTimeSlots(formValue.date);


          this.ensureShareLinkAndNavigate(reservation);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error creating reservation:', error);


          if (error.error?.message?.includes('no longer available')) {
            this.snackBar.open('This time slot was just booked by someone else. Please choose another time.', 'Close', {
              duration: 5000,
            });

            this.loadAvailableTimeSlots(formValue.date);
            this.reservationForm.patchValue({ slot_time: '' });
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
