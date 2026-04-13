import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStateService } from '../../core/services/dashboard-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  profileOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public state: DashboardStateService
  ) {}

  ngOnInit(): void {
    this.state.startPolling();
  }

  ngOnDestroy(): void {
    this.state.stopPolling();
  }

  get userEmail(): string {
    return this.authService.getUserEmail() || 'Trader';
  }

  get initials(): string {
    return (this.authService.getUserEmail() || 'T')[0].toUpperCase();
  }

  get isPro(): boolean {
    return this.authService.getIsPro();
  }

  goToPlan(): void {
    this.router.navigate(['/dashboard/settings'], { fragment: 'plan' });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('.profile-menu')) {
      this.profileOpen = false;
    }
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  formatPnl(value: number): string {
    return (value >= 0 ? '+' : '') + '$' + Math.abs(value).toFixed(2);
  }
}