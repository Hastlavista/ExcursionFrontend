import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  protected readonly quickStats = [
    { value: 'MT4 & MT5', key: 'LANDING.HERO.STAT_1' },
    { value: 'MAE + MFE', key: 'LANDING.HERO.STAT_2' },
    { value: '<5 min', key: 'LANDING.HERO.STAT_3' }
  ];

  protected readonly journalPoints = [
    'LANDING.JOURNAL.POINT_1',
    'LANDING.JOURNAL.POINT_2',
    'LANDING.JOURNAL.POINT_3',
    'LANDING.JOURNAL.POINT_4'
  ];

  protected readonly setupSteps = [
    {
      icon: '01',
      title: 'LANDING.SETUP.STEP_1_TITLE',
      body: 'LANDING.SETUP.STEP_1_BODY'
    },
    {
      icon: '02',
      title: 'LANDING.SETUP.STEP_2_TITLE',
      body: 'LANDING.SETUP.STEP_2_BODY'
    },
    {
      icon: '03',
      title: 'LANDING.SETUP.STEP_3_TITLE',
      body: 'LANDING.SETUP.STEP_3_BODY'
    }
  ];

  protected readonly reasons = [
    {
      title: 'LANDING.WHY.REASON_1_TITLE',
      body: 'LANDING.WHY.REASON_1_BODY'
    },
    {
      title: 'LANDING.WHY.REASON_2_TITLE',
      body: 'LANDING.WHY.REASON_2_BODY'
    },
    {
      title: 'LANDING.WHY.REASON_3_TITLE',
      body: 'LANDING.WHY.REASON_3_BODY'
    }
  ];

  protected readonly freeFeatures = [
    'LANDING.PRICING.FREE_FEATURE_1',
    'LANDING.PRICING.FREE_FEATURE_2',
    'LANDING.PRICING.FREE_FEATURE_3'
  ];

  protected readonly proFeatures = [
    'LANDING.PRICING.PRO_FEATURE_1',
    'LANDING.PRICING.PRO_FEATURE_2',
    'LANDING.PRICING.PRO_FEATURE_3',
    'LANDING.PRICING.PRO_FEATURE_4'
  ];
}
