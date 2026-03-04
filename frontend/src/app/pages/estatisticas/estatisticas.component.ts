import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacaoService, Transacao } from '../../services/transacao.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estatisticas.component.html',
  styleUrls: ['./estatisticas.component.css']
})
export class EstatisticasComponent implements OnInit {
  private transacaoService = inject(TransacaoService);
  
  // Dados brutos
  transacoes: Transacao[] = [];
  
  // Filtros
  periodoSelecionado: number = 6; // Meses (3, 6, 12)
  
  // Métricas Calculadas
  mediaGastosMensal: number = 0;
  projecaoMesAtual: number = 0;
  categoriaMaisCara: string = '';
  
  graficoTendencia: any;

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.transacaoService.getTransacoes().subscribe(dados => {
      this.transacoes = dados;
      this.gerarRelatorios();
    });
  }

  gerarRelatorios() {
    this.calcularMetricasPrincipais();
    setTimeout(() => this.renderizarGraficoTendencia(), 100);
  }

  private calcularMetricasPrincipais() {
    const hoje = new Date();
    const despesas = this.transacoes.filter(t => t.tipo === 'despesa');
    
    // 1. Média de gastos (Considerando o período selecionado)
    const limiteData = new Date();
    limiteData.setMonth(hoje.getMonth() - this.periodoSelecionado);
    
    const despesasPeriodo = despesas.filter(t => new Date(t.data_transacao!) >= limiteData);
    this.mediaGastosMensal = despesasPeriodo.reduce((acc, t) => acc + t.valor, 0) / this.periodoSelecionado;

    // 2. Projeção para o mês atual
    const gastosMesAtual = despesas.filter(t => {
      const d = new Date(t.data_transacao!);
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).reduce((acc, t) => acc + t.valor, 0);

    const diaAtual = hoje.getDate();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    this.projecaoMesAtual = (gastosMesAtual / diaAtual) * ultimoDia;
  }

  renderizarGraficoTendencia() {
    const ctx = document.getElementById('canvasTendencia') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.graficoTendencia) this.graficoTendencia.destroy();

    // Lógica para agrupar por mês (Últimos X meses)
    const ultimosMeses = this.getLabelsUltimosMeses();
    const valoresPorMes = ultimosMeses.map(label => {
      return this.transacoes
        .filter(t => t.tipo === 'despesa' && this.formatarMesAno(new Date(t.data_transacao!)) === label)
        .reduce((acc, t) => acc + t.valor, 0);
    });

    this.graficoTendencia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ultimosMeses,
        datasets: [{
          label: 'Gasto Total Mensal',
          data: valoresPorMes,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Helpers Matemáticos
  private getLabelsUltimosMeses() {
    const labels = [];
    for (let i = this.periodoSelecionado - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(this.formatarMesAno(d));
    }
    return labels;
  }

  private formatarMesAno(date: Date) {
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
  }
}