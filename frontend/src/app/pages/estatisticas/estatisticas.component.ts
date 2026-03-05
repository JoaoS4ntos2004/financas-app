import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { PrivacyService } from '../../services/privacy.service';
import { PrivacyCurrencyPipe } from '../../services/privacy-currency.pipe';

Chart.register(...registerables);

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, PrivacyCurrencyPipe],
  templateUrl: './estatisticas.component.html',
  styleUrls: ['./estatisticas.component.css']
})
export class EstatisticasComponent implements OnInit {
  public privacyService = inject(PrivacyService);
  
  mesAnoSelecionado: string = '2023-10'; // Exemplo
  
  // Variáveis para as novas métricas analíticas
  resultadoLiquido: number = 850.00;
  taxaEconomia: number = 18.5; // Guardou 18.5% do que ganhou
  variacaoDespesas: number = -4.2; // Gastou 4.2% a menos que o mês passado

  ngOnInit() {
    this.renderizarGraficoComposicao();
    this.renderizarGraficoRitmo();
  }

  atualizarDados() {
    // Aqui você vai chamar seu service para buscar os dados reais do mês selecionado
    // e depois atualizar os gráficos.
  }

  renderizarGraficoComposicao() {
    new Chart('composicaoChart', {
      type: 'doughnut',
      data: {
        labels: ['Alimentação', 'Transporte', 'Lazer', 'Contas Fixo'],
        datasets: [{
          data: [800, 300, 450, 1200],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#64748b'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Deixa a rosca bem fina e elegante
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }
        }
      }
    });
  }

  renderizarGraficoRitmo() {
    new Chart('ritmoGastosChart', {
      type: 'line',
      data: {
        labels: ['Dia 5', 'Dia 10', 'Dia 15', 'Dia 20', 'Dia 25', 'Dia 30'],
        datasets: [{
          label: 'Gasto Acumulado',
          data: [400, 950, 1400, 2100, 2450, 2750],
          borderColor: '#ef4444', // Vermelho indicando saída
          backgroundColor: 'rgba(239, 68, 68, 0.1)', // Vermelho transparente embaix da linha
          fill: true,
          tension: 0.3, // Curva suave
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#ef4444',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }, // Esconde a legenda para ficar mais limpo
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}