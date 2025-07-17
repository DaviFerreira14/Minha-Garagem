// footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-md-6">
            <div class="footer-brand">
              <i class="fas fa-car me-2"></i>
              <span class="fw-bold">Minha Garagem</span>
            </div>
            <p class="footer-text mb-0">
              Gerencie seus veículos com facilidade e segurança.
            </p>
          </div>
          <div class="col-md-6 text-md-end">
            <div class="footer-links mb-2">
              <a href="#" class="footer-link me-3">Política de Privacidade</a>
              <a href="#" class="footer-link me-3">Termos de Uso</a>
              <a href="#" class="footer-link">Suporte</a>
            </div>
            <p class="footer-copyright mb-0">
              © {{ currentYear }} Minha Garagem. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: #1a1a1a;
      border-top: 1px solid #3b82f6;
      color: #e5e7eb;
      padding: 30px 0;
      margin-top: auto;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      font-size: 1.25rem;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .footer-brand i {
      color: #3b82f6;
    }

    .footer-text {
      color: #888888;
      font-size: 0.9rem;
    }

    .footer-links {
      margin-bottom: 8px;
    }

    .footer-link {
      color: #888888;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s ease;
    }

    .footer-link:hover {
      color: #3b82f6;
      text-decoration: underline;
    }

    .footer-copyright {
      color: #666666;
      font-size: 0.8rem;
    }

    @media (max-width: 768px) {
      .footer {
        padding: 20px 0;
        text-align: center;
      }
      
      .footer-brand {
        justify-content: center;
      }
      
      .footer-links {
        margin-top: 15px;
      }
      
      .footer-link {
        display: block;
        margin: 5px 0;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}