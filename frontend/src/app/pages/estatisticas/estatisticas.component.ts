import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { PrivacyService } from '../../services/privacy.service';
import { PrivacyCurrencyPipe } from '../../services/privacy-currency.pipe'; // Ajuste o caminho
// Importe o seu TransacaoService e os dados aqui

Chart.register(...registerables);

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [CommonModule, PrivacyCurrencyPipe],
  templateUrl: './estatisticas.component.html',
  styleUrls: ['./estatisticas.component.css']
})
export class EstatisticasComponent implements OnInit {
  public privacyService = inject(PrivacyService);
  
  mediaGastos: number = 2450.00; // Mock: Você vai calcular isso no Service
  categoriaVila: string = 'Alimentação';
  balancoPeriodo: number = 1200.50;

  ngOnInit() {
    this.renderizarGraficoFluxo();
    this.renderizarGraficoEvolucao();
  }

  renderizarGraficoFluxo() {
    new Chart('fluxoCaixaChart', {
      type: 'bar',
      data: {
        labels: ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'],
        datasets: [
          {
            label: 'Receitas',
            data: [4000, 4200, 5000, 4100, 4100, 4500],
            backgroundColor: '#10b981', // Verde
            borderRadius: 4
          },
          {
            label: 'Despesas',
            data: [3200, 3800, 4500, 2900, 3100, 2800],
            backgroundColor: '#ef4444', // Vermelho
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  renderizarGraficoEvolucao() {
    new Chart('evolucaoPatrimonioChart', {
      type: 'line',
      data: {
        labels: ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'],
        datasets: [{
          label: 'Patrimônio Total',
          data: [10000, 10400, 10900, 12100, 13100, 14800],
          borderColor: '#3b82f6', // Azul elegante
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4, // Curva suave
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}