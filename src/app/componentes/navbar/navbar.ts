// navbar.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToMaintenance(): void {
    this.router.navigate(['/maintenance']);
  }

  navigateToExpenses(): void {
    this.router.navigate(['/expenses']);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}