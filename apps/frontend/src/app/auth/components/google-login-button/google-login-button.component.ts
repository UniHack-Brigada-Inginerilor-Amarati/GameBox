import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-google-login-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-login-button.component.html',
  styleUrl: './google-login-button.component.scss',
})
export class GoogleLoginButtonComponent {
  @Output() googleClick = new EventEmitter<void>();

  onClick(): void {
    this.googleClick.emit();
  }
}
