import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  showPassword = false;

  private toastService = inject(ToastService);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.authService.login(this.form.value).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      error: (err: HttpErrorResponse) => {
        this.toastService.show(this.resolveError(err), 'error');
      }
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    if (err.status === 401) return 'AUTH.LOGIN.ERRORS.UNAUTHORIZED';
    if (err.status === 0 || err.status === 503) return 'AUTH.LOGIN.ERRORS.UNAVAILABLE';
    return 'AUTH.LOGIN.ERRORS.GENERIC';
  }
}