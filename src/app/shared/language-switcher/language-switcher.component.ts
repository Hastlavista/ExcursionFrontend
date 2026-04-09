import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss'
})
export class LanguageSwitcherComponent {
  readonly languages = [
    { code: 'en', label: 'EN' },
    { code: 'hr', label: 'HR' }
  ];

  constructor(public translate: TranslateService) {}

  get current(): string {
    return this.translate.currentLang ?? this.translate.defaultLang;
  }

  use(code: string): void {
    this.translate.use(code);
  }
}
