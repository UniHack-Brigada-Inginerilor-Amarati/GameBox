import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AbilityRadarChartComponent } from '../ability-radar-chart/ability-radar-chart.component';
import { AuthService, LogoutComponent } from '../../../auth';
import { ProfileService } from '../../services/profile.service';
import { UserProfileDTO } from '@gamebox/shared';
import { GameRecommendationsDialogComponent } from '../game-recommendations-dialog/game-recommendations-dialog.component';
import {
  ValidationService,
  usernameErrorMessages,
} from '../../../auth/services/validation.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    FormsModule,
    LogoutComponent,
    AbilityRadarChartComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  readonly user = signal<UserProfileDTO | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly usernameError = signal<string | null>(null);

  editUsername = '';
  editRiotUsername = '';
  editAvatarUrl = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  readonly maxFileSize = 5 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  readonly usernameErrorMessages = usernameErrorMessages;

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.profileService.getProfile().subscribe({
      next: (profile: UserProfileDTO) => {
        this.user.set(profile);
        this.editUsername = profile.username;
        this.editRiotUsername = profile.riot_username || '';
        this.editAvatarUrl = profile.avatar_url;
        this.isLoading.set(false);

        // Trigger spy card recalculation in the background (non-blocking)
        this.recalculateSpyCard(profile.username);
      },
      error: (err: unknown) => {
        this.error.set('Failed to load user profile');
        this.isLoading.set(false);
        console.error('Profile loading error:', err);
      },
    });
  }

  private recalculateSpyCard(username: string): void {
    // Recalculate spy card silently in the background
    // Don't show errors to user as this is a background operation
    this.profileService.recalculateSpyCard(username).subscribe({
      next: (result) => {
        console.log('Spy card recalculated:', result);
        // Optionally refresh ability scores to show updated data
        // The ability radar chart will automatically update when ability scores change
      },
      error: (err) => {
        // Silently log error, don't show to user
        console.warn('Spy card recalculation failed (non-critical):', err);
      },
    });
  }

  startEditing(): void {
    this.isEditing.set(true);
    // Clear any previous errors when starting to edit
    this.error.set(null);
    this.usernameError.set(null);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    const currentUser = this.user();
    if (currentUser) {
      this.editUsername = currentUser.username;
      this.editRiotUsername = currentUser.riot_username || '';
      this.editAvatarUrl = currentUser.avatar_url;
    }
    this.clearSelectedFile();
    this.usernameError.set(null);
  }

  validateUsername(): void {
    const validator = ValidationService.usernameRules();
    const errors = validator({ value: this.editUsername } as AbstractControl);

    if (errors) {
      // Get the first error key
      const firstErrorKey = Object.keys(errors)[0];
      // Map the error key to the appropriate message
      const errorMessage = this.usernameErrorMessages[firstErrorKey] || 'Invalid username';
      this.usernameError.set(errorMessage);
    } else {
      this.usernameError.set(null);
    }
  }

  onUsernameChange(): void {
    // Clear any previous backend errors when user starts typing
    this.error.set(null);
    this.validateUsername();

    // Set the general error to show the specific username validation error
    if (this.usernameError()) {
      this.error.set(this.usernameError());
    }
  }

  saveProfile(): void {
    if (!this.user()) return;

    // Validate username before saving
    this.validateUsername();
    if (this.usernameError()) {
      this.error.set('Please fix validation errors before saving');
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    // Try to update via service
    const updates = {
      username: this.editUsername,
      riot_username: this.editRiotUsername || null,
      avatar_url: this.editAvatarUrl,
    };

    this.profileService.updateProfile(updates).subscribe({
      next: (updatedProfile) => {
        // Update with server response if available
        if (updatedProfile) {
          this.user.set(updatedProfile as UserProfileDTO);
          this.editUsername = (updatedProfile as UserProfileDTO).username;
          this.editRiotUsername = (updatedProfile as UserProfileDTO).riot_username || '';
          this.editAvatarUrl = (updatedProfile as UserProfileDTO).avatar_url;
        }
        this.isEditing.set(false);
        this.isSaving.set(false);
        this.usernameError.set(null);
        this.showSuccessMessage('Profile updated successfully');
      },
      error: (err: any) => {
        this.isSaving.set(false);

        // Handle specific error cases
        if (err.status === 409) {
          // Username already taken
          this.usernameError.set('Username is already taken');
          this.error.set('Username is already taken. Please choose a different username.');
        } else if (err.status === 400) {
          // Bad request - validation error from backend
          const errorMessage = err.error?.message || 'Invalid username format';
          this.usernameError.set(errorMessage);
          this.error.set(`Validation error: ${errorMessage}`);
        } else if (err.status === 401) {
          this.usernameError.set(null);
          this.error.set('Authentication failed. Please log in again.');
        } else if (err.status === 0) {
          this.usernameError.set(null);
          this.error.set('Cannot connect to server. Please check your connection.');
        } else {
          this.usernameError.set(null);
          const errorMsg = err.error?.message || 'Failed to update profile';
          this.error.set(`Error: ${errorMsg}`);
        }

        console.error('Profile update error:', err);
      },
    });
  }

  triggerFileInput(): void {
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      if (!this.allowedTypes.includes(file.type)) {
        this.error.set(
          `Please select a valid image file. Allowed types: ${this.allowedTypes.join(', ')}`,
        );
        return;
      }

      if (file.size > this.maxFileSize) {
        this.error.set(
          `File size must be less than ${this.maxFileSize / (1024 * 1024)}MB for bucket storage`,
        );
        return;
      }

      this.selectedFile = file;
      this.error.set(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.error.set(null);
  }

  uploadAvatar(): void {
    if (!this.selectedFile) return;

    this.isSaving.set(true);
    this.error.set(null);

    this.profileService.uploadAvatar(this.selectedFile).subscribe({
      next: (response) => {
        this.editAvatarUrl = response.avatar_url;

        const currentUser = this.user();
        if (currentUser) {
          const updatedUser = { ...currentUser, avatar_url: response.avatar_url };
          this.user.set(updatedUser);
        }

        this.updateProfileAfterAvatarUpload(response.avatar_url);

        this.showSuccessMessage('Avatar uploaded successfully');
        this.clearSelectedFile();
        this.isSaving.set(false);

        this.refreshAvatarDisplay();
      },
      error: (err) => {
        if (err.status === 0) {
          this.error.set(
            'Cannot connect to backend server. Please check if the backend is running.',
          );
        } else if (err.status === 401) {
          this.error.set('Authentication failed. Please log in again.');
        } else if (err.status === 413) {
          this.error.set('File too large. Please select a smaller image.');
        } else {
          this.error.set(`Upload failed: ${err.error?.message || err.message || 'Unknown error'}`);
        }

        this.isSaving.set(false);
      },
    });
  }

  private updateProfileAfterAvatarUpload(avatarUrl: string): void {
    const updates = {
      avatar_url: avatarUrl,
    };

    this.profileService.updateProfile(updates).subscribe({
      next: (updatedProfile) => {
        this.user.set(updatedProfile as UserProfileDTO);
        this.editAvatarUrl = (updatedProfile as UserProfileDTO).avatar_url;
      },
      error: (err: unknown) => {
        console.error('Error updating profile in database:', err);
      },
    });
  }

  generateAvatar(): void {
    this.isSaving.set(true);
    this.error.set(null);

    this.profileService.generateAvatar().subscribe({
      next: (response) => {
        this.editAvatarUrl = response.avatar_url;
        this.showSuccessMessage('Avatar generated successfully');
        this.isSaving.set(false);
      },
      error: () => {
        this.error.set('Failed to generate avatar');
        this.isSaving.set(false);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onImageError(): void {
    const currentUser = this.user();
    if (currentUser) {
      this.editAvatarUrl = `https://api.dicebear.com/6.x/avataaars/svg?seed=${currentUser.username}`;
    }
  }

  refreshAvatarDisplay(): void {
    const currentUser = this.user();
    setTimeout(() => {
      const avatarImg = document.querySelector('.avatar-image') as HTMLImageElement;
      if (avatarImg && currentUser?.avatar_url) {
        avatarImg.src = currentUser.avatar_url + '?t=' + Date.now();
      }
    }, 100);
  }

  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  openGameRecommendations(): void {
    this.dialog.open(GameRecommendationsDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  }
}
