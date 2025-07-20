// footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  constructor(private router: Router) {}

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  goToTerms(): void {
    this.router.navigate(['/terms']);
  }
}