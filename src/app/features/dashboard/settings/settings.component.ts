import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {

  // Account
  userEmail = '';
  userPlan: 'Free' | 'Pro' = 'Free';

  // API Key
  apiKey = '';
  apiKeyMasked = '';
  copyLabel = 'SETTINGS.API_KEY.COPY';
  showRegenerateModal = false;
  regenerating = false;

  // Change Password
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  savingPassword = false;
  passwordError = '';

  // Delete Account
  showDeleteModal = false;
  deleting = false;

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userEmail = this.authService.getUserEmail();
    this.apiKey = this.accountService.getApiKey();
    this.apiKeyMasked = this.maskKey(this.apiKey);
  }

  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return key;
    return key.slice(0, 8) + '••••••••••••';
  }

  // ── API Key ────────────────────────────────────────────────────────────────

  downloadEa(): void {
    const a = document.createElement('a');
    a.href = 'assets/ea/LogynqoEA.ex5';
    a.download = 'LogynqoEA.ex5';
    a.click();
  }

  copyApiKey(): void {
    if (!this.apiKey) return;
    navigator.clipboard.writeText(this.apiKey).then(() => {
      this.copyLabel = 'SETTINGS.API_KEY.COPIED';
      setTimeout(() => { this.copyLabel = 'SETTINGS.API_KEY.COPY'; }, 2000);
    });
  }

  confirmRegenerate(): void {
    if (this.regenerating) return;
    this.regenerating = true;
    this.accountService.regenerateApiKey().subscribe({
      next: res => {
        this.apiKey = res.apiKey ?? '';
        this.apiKeyMasked = this.maskKey(this.apiKey);
        this.showRegenerateModal = false;
        this.regenerating = false;
        this.toastService.show('SETTINGS.API_KEY.REGENERATE_SUCCESS', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.showRegenerateModal = false;
        this.regenerating = false;
        this.toastService.show('SETTINGS.API_KEY.REGENERATE_ERROR', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Change Password ────────────────────────────────────────────────────────

  get newPasswordStrength(): 'weak' | 'medium' | 'strong' | null {
    const p = this.newPassword;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  get passwordsMatch(): boolean {
    return !!this.confirmPassword && this.newPassword === this.confirmPassword;
  }

  get passwordFormValid(): boolean {
    return !!this.currentPassword && !!this.newPassword
      && this.newPassword.length >= 8 && this.passwordsMatch;
  }

  savePassword(): void {
    if (!this.passwordFormValid || this.savingPassword) return;
    this.passwordError = '';
    this.savingPassword = true;
    this.accountService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.savingPassword = false;
        this.toastService.show('SETTINGS.PASSWORD.SUCCESS', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingPassword = false;
        this.passwordError = 'SETTINGS.PASSWORD.ERROR_WRONG_CURRENT';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Delete Account ─────────────────────────────────────────────────────────

  confirmDeleteAccount(): void {
    if (this.deleting) return;
    this.deleting = true;
    this.accountService.deleteAccount().subscribe({
      next: () => {
        this.authService.logout();
      },
      error: () => {
        this.deleting = false;
        this.toastService.show('SETTINGS.DANGER.ERROR', 'error');
        this.cdr.detectChanges();
      }
    });
  }
}