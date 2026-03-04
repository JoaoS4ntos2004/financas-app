import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { PrivacyService } from '../services/privacy.service'; // Ajuste o caminho conforme sua pasta

@Pipe({
  name: 'privacyCurrency',
  standalone: true,
  pure: false // Importante para reagir ao clique do botão sem dar refresh
})
export class PrivacyCurrencyPipe implements PipeTransform {
  private privacyService = inject(PrivacyService);
  private currencyPipe = inject(CurrencyPipe);

  transform(value: any): string | null {
    // Se o modo furtivo estiver ON, censura
    if (this.privacyService.isFurtivo()) {
      return 'R$ ••••••';
    }
    // Se estiver OFF, usa o CurrencyPipe padrão do Angular
    return this.currencyPipe.transform(value, 'BRL');
  }
}