import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';

function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        terms: [false, Validators.requiredTrue]
      },
      { validators: passwordMatchValidator }
    );

    this.form.valueChanges.subscribe(() => {
      if (this.error) this.error = null;
    });
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const password: string = this.form.get('password')?.value ?? '';
    if (!password) return null;

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  get passwordStrengthKey(): string | null {
    const keys: Record<string, string> = {
      weak: 'AUTH.REGISTER.STRENGTH.WEAK',
      medium: 'AUTH.REGISTER.STRENGTH.MEDIUM',
      strong: 'AUTH.REGISTER.STRENGTH.STRONG'
    };
    return this.passwordStrength ? keys[this.passwordStrength] : null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const { email, password } = this.form.value;
    this.authService.register({ email, password }).subscribe({
      next: () => { this.loading = false; },
      error: (err: HttpErrorResponse) => {
        this.error = this.resolveError(err);
        this.loading = false;
      }
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    if (err.status === 400) return 'AUTH.REGISTER.ERRORS.INVALID_DATA';
    if (err.status === 409) return 'AUTH.REGISTER.ERRORS.EMAIL_TAKEN';
    if (err.status === 0 || err.status === 503) return 'AUTH.REGISTER.ERRORS.UNAVAILABLE';
    return 'AUTH.REGISTER.ERRORS.GENERIC';
  }
}