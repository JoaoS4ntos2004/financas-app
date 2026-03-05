import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { PrivacyService } from '../../services/privacy.service';
import { PrivacyCurrencyPipe } from '../../services/privacy-currency.pipe';
import { TransacaoService } from '../../services/transacao.service';

Chart.register(...registerables);

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  data_transacao: string; // Formato YYYY-MM-DD
}

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, PrivacyCurrencyPipe],
  templateUrl: './estatisticas.component.html',
  styleUrls: ['./estatisticas.component.css']
})
export class EstatisticasComponent implements OnInit {
  public privacyService = inject(PrivacyService);
  // public transacaoService = inject(TransacaoService);
  
  mesAnoSelecionado: string = ''; 
  
  // Métricas
  resultadoLiquido: number = 0;
  taxaEconomia: number = 0;
  variacaoDespesas: number = 0;

  // Instâncias dos gráficos para podermos destruí-los antes de recriar
  chartComposicao: any;
  chartRitmo: any;

  // Array simulando o banco de dados (Substitua pela chamada do seu Service)
  transacoesDoMes: Transacao[] = [];
  transacoesMesAnterior: Transacao[] = [];

  ngOnInit() {
    // Define o mês atual como padrão (Ex: '2026-03')
    const hoje = new Date();
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    this.mesAnoSelecionado = `${hoje.getFullYear()}-${mes}`;
    
    this.atualizarDados();
  }

  atualizarDados() {
    // 1. Aqui você buscaria os dados reais do seu serviço baseados no mesAnoSelecionado
    // Exemplo: this.transacoesDoMes = this.transacaoService.getByMes(this.mesAnoSelecionado);
    
    // Simulação temporária para não quebrar o código:
    this.transacoesDoMes = []; 
    this.transacoesMesAnterior = [];

    this.calcularMétricas();
    this.atualizarGraficoComposicao();
    this.atualizarGraficoRitmo();
  }

  calcularMétricas() {
    // Receitas e Despesas do Mês Atual
    const receitasAtual = this.transacoesDoMes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + t.valor, 0);

    const despesasAtual = this.transacoesDoMes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + t.valor, 0);

    // Despesas do Mês Anterior (para a variação)
    const despesasAnterior = this.transacoesMesAnterior
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + t.valor, 0);

    // 1. Resultado Líquido
    this.resultadoLiquido = receitasAtual - despesasAtual;

    // 2. Taxa de Economia (%) = (Receita - Despesa) / Receita
    if (receitasAtual > 0) {
      const taxa = ((receitasAtual - despesasAtual) / receitasAtual) * 100;
      this.taxaEconomia = parseFloat(taxa.toFixed(1));
    } else {
      this.taxaEconomia = 0; // Evita divisão por zero
    }

    // 3. Variação de Despesas (%)
    if (despesasAnterior > 0) {
      const variacao = ((despesasAtual - despesasAnterior) / despesasAnterior) * 100;
      this.variacaoDespesas = parseFloat(variacao.toFixed(1));
    } else {
      this.variacaoDespesas = despesasAtual > 0 ? 100 : 0;
    }
  }

  atualizarGraficoComposicao() {
    // Agrupa despesas por categoria
    const despesas = this.transacoesDoMes.filter(t => t.tipo === 'despesa');
    
    const gastosPorCategoria = despesas.reduce((acc: any, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {});

    const labels = Object.keys(gastosPorCategoria);
    const data = Object.values(gastosPorCategoria);
    // Paleta de cores premium
    const bgColors = ['#10b981', '#3b82f6', '#f59e0b', '#64748b', '#8b5cf6', '#ef4444'];

    if (this.chartComposicao) this.chartComposicao.destroy();

    this.chartComposicao = new Chart('composicaoChart', {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Sem dados'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: data.length > 0 ? bgColors : ['#e2e8f0'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '75%',
        plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } }
      }
    });
  }

  atualizarGraficoRitmo() {
    // Ordena as despesas por data crescente
    const despesasOrdenadas = this.transacoesDoMes
      .filter(t => t.tipo === 'despesa')
      .sort((a, b) => new Date(a.data_transacao).getTime() - new Date(b.data_transacao).getTime());

    const labelsDiarios: string[] = [];
    const gastosAcumulados: number[] = [];
    let acumulado = 0;

    despesasOrdenadas.forEach(t => {
      const dia = new Date(t.data_transacao).getDate();
      labelsDiarios.push(`Dia ${dia}`);
      acumulado += t.valor;
      gastosAcumulados.push(acumulado);
    });

    if (this.chartRitmo) this.chartRitmo.destroy();

    this.chartRitmo = new Chart('ritmoGastosChart', {
      type: 'line',
      data: {
        labels: labelsDiarios.length > 0 ? labelsDiarios : ['Dia 1'],
        datasets: [{
          label: 'Gasto Acumulado',
          data: gastosAcumulados.length > 0 ? gastosAcumulados : [0],
          borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true, tension: 0.3, pointBackgroundColor: '#ffffff',
          pointBorderColor: '#ef4444', pointBorderWidth: 2, pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
      }
    });
  }
}