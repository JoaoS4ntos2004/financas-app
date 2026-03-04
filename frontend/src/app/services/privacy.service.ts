import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  // Usando Signals do Angular 17+ para performance reativa
  isFurtivo = signal<boolean>(false);

  toggle() {
    this.isFurtivo.set(!this.isFurtivo());
  }
}