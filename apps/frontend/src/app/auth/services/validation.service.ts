import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class ValidationService {
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value ?? '';

      const errors: ValidationErrors = {};
      if (!value) {
        errors['required'] = true;
        return errors;
      }

      if (value.length < 8) errors['minLength'] = 'Password must be at least 8 characters long';
      if (!/[A-Z]/.test(value)) errors['uppercase'] = 'Must include an uppercase letter';
      if (!/[a-z]/.test(value)) errors['lowercase'] = 'Must include a lowercase letter';
      if (!/[0-9]/.test(value)) errors['number'] = 'Must include a number';
      if (!/[^A-Za-z0-9]/.test(value)) errors['special'] = 'Must include a special character';

      return Object.keys(errors).length ? errors : null;
    };
  }

  static matchFields(field1: string, field2: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const value1 = group.get(field1)?.value;
      const value2 = group.get(field2)?.value;
      return value1 === value2 ? null : { fieldsMismatch: 'Fields do not match' };
    };
  }

  static onlyLetters(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value ?? '';
      return /^[A-Za-z\s]*$/.test(value) ? null : { onlyLetters: 'Only letters are allowed' };
    };
  }

  static usernameRules(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value ?? '';
      if (!value) return { required: true };
      if (value.length < 3) return { minlength: true };
      if (value.length > 20) return { maxlength: true };
      if (!/^[a-zA-Z0-9]+$/.test(value)) return { pattern: true };
      return null;
    };
  }
}

export const usernameErrorMessages: Record<string, string> = {
  required: 'Username is required',
  minlength: 'Username must be at least 3 characters long',
  maxlength: 'Username must be less than 20 characters long',
  pattern: 'Username must contain only letters and numbers',
};

export const emailErrorMessages: Record<string, string> = {
  required: 'Email is required',
  email: 'Please enter a valid email',
};

export const passwordErrorMessages: Record<string, string> = {
  required: 'Password is required',
  minLength: 'Password must be at least 8 characters long',
  uppercase: 'Must include an uppercase letter',
  lowercase: 'Must include a lowercase letter',
  number: 'Must include a number',
  special: 'Must include a special character',
};

export const confirmPasswordErrorMessages: Record<string, string> = {
  required: 'Please confirm your password',
};
