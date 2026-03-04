import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PrivacyService } from './services/privacy.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive], // Importamos os módulos de rota aqui!
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  privacyService = inject(PrivacyService);

  togglePrivacidade() {
    this.privacyService.toggle();
  }
}