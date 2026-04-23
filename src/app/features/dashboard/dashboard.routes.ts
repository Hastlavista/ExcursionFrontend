import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard.component').then(m => m.DashboardComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      {
        path: 'trade/:id',
        loadComponent: () =>
          import('./trade-detail/trade-detail.component').then(m => m.TradeDetailComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
