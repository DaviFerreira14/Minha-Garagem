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
  isDarkTheme = true;
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTheme();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  loadTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme !== 'light';
    this.applyTheme();
  }

  applyTheme(): void {
    const body = document.body;
    if (this.isDarkTheme) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }

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