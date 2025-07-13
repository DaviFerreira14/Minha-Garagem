import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async logout() {
    await this.authService.logout();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }
}