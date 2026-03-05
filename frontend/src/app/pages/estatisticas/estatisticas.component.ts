import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { PrivacyService } from '../../services/privacy.service';
import { PrivacyCurrencyPipe } from '../../services/privacy-currency.pipe';
// Importamos o Service e a Interface Transacao direto dele
import { TransacaoService, Transacao } from '../../services/transacao.service';

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
  public transacaoService = inject(TransacaoService); // <-- Descomentado e pronto pro uso!
  
  mesAnoSelecionado: string = ''; 
  
  // Métricas
  resultadoLiquido: number = 0;
  taxaEconomia: number = 0;
  variacaoDespesas: number = 0;

  // Instâncias dos gráficos
  chartComposicao: any;
  chartRitmo: any;

  // Arrays que vão guardar os dados reais
  transacoesDoMes: Transacao[] = [];
  transacoesMesAnterior: Transacao[] = [];

  ngOnInit() {
    // Define o mês atual como padrão ao abrir a tela
    const hoje = new Date();
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    this.mesAnoSelecionado = `${hoje.getFullYear()}-${mes}`;
    
    this.atualizarDados();
  }

  atualizarDados() {
    // Busca TODAS as transações no seu Backend/Cache
    this.transacaoService.getTransacoes().subscribe({
      next: (todasTransacoes) => {
        
        // 1. Filtra as transações do Mês Selecionado (ex: "2026-03")
        this.transacoesDoMes = todasTransacoes.filter(t => 
          t.data_transacao && t.data_transacao.startsWith(this.mesAnoSelecionado)
        );

        // 2. Descobre qual é o mês anterior matematicamente (ex: "2026-02")
        const [anoStr, mesStr] = this.mesAnoSelecionado.split('-');
        let ano = parseInt(anoStr);
        let mes = parseInt(mesStr) - 1;
        
        // Se voltarmos do mês 1 (Janeiro), o mês vira 12 e o ano cai
        if (mes === 0) {
          mes = 12;
          ano -= 1;
        }
        
        const mesAnteriorStr = `${ano}-${mes.toString().padStart(2, '0')}`;

        // 3. Filtra as transações do Mês Anterior
        this.transacoesMesAnterior = todasTransacoes.filter(t => 
          t.data_transacao && t.data_transacao.startsWith(mesAnteriorStr)
        );

        // 4. Agora que temos os dados corretos, mandamos calcular e desenhar!
        this.calcularMétricas();
        this.atualizarGraficoComposicao();
        this.atualizarGraficoRitmo();
      },
      error: (err) => {
        console.error('Erro ao buscar transações nas estatísticas:', err);
      }
    });
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

    // 2. Taxa de Economia (%)
    if (receitasAtual > 0) {
      const taxa = ((receitasAtual - despesasAtual) / receitasAtual) * 100;
      this.taxaEconomia = parseFloat(taxa.toFixed(1));
    } else {
      this.taxaEconomia = 0; 
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
    const despesas = this.transacoesDoMes.filter(t => t.tipo === 'despesa');
    
    // Agrupa e soma valores da mesma categoria
    const gastosPorCategoria = despesas.reduce((acc: any, t) => {
      // Como a categoria pode vir vazia, garantimos um fallback para 'Outros'
      const cat = t.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + t.valor;
      return acc;
    }, {});

    const labels = Object.keys(gastosPorCategoria);
    const data = Object.values(gastosPorCategoria);
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
    const despesasOrdenadas = this.transacoesDoMes
      .filter(t => t.tipo === 'despesa' && t.data_transacao)
      .sort((a, b) => new Date(a.data_transacao!).getTime() - new Date(b.data_transacao!).getTime());

    const labelsDiarios: string[] = [];
    const gastosAcumulados: number[] = [];
    let acumulado = 0;

    despesasOrdenadas.forEach(t => {
      // Extrai apenas o dia (ex: de '2026-03-15' extrai '15')
      const dia = t.data_transacao!.split('-')[2];
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