// terms.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms.html',
  styleUrls: ['./terms.css']
})
export class TermsComponent implements OnInit {
  
  lastUpdated = '15 de Janeiro de 2025';
  termsAccepted = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkTermsAcceptance();
  }

  private checkTermsAcceptance(): void {
    const accepted = localStorage.getItem('termsAccepted');
    this.termsAccepted = accepted === 'true';
  }

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  acceptTerms(): void {
    if (!this.termsAccepted) {
      localStorage.setItem('termsAccepted', 'true');
      localStorage.setItem('termsAcceptedDate', new Date().toISOString());
      this.termsAccepted = true;
      
      // Mostrar feedback visual
      this.showAcceptanceMessage();
    }
  }

  private showAcceptanceMessage(): void {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'acceptance-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <span>Termos aceitos com sucesso!</span>
      </div>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
      border: 1px solid #10b981;
      color: #86efac;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Método para rolar para uma seção específica
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  // Método para imprimir os termos
  printTerms(): void {
    window.print();
  }

  // Método para copiar link dos termos
  copyTermsLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      console.log('Link copiado para a área de transferência');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
    });
  }
}