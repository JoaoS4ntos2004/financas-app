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

  comparativoMetas: any[] = [];
  limiteDiarioSugerido: number = 0;
  diasRestantes: number = 0;

  indiceSobrevivencia: number = 0; // 0 a 100
  statusSobrevivencia: string = '';
  valorFaltanteOuSobra: number = 0;
  
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
    this.calcularRadarOrcamento(); 
    this.calcularIndiceSobrevivencia();
    setTimeout(() => this.renderizarGraficoTendencia(), 100);
  }

  calcularIndiceSobrevivencia() {
    const receitaTotal = this.transacoes
      .filter(t => t.tipo === 'receita' && this.isMesAtual(t.data_transacao))
      .reduce((acc, t) => acc + t.valor, 0);

    // Se não houver receita lançada ainda, não fazemos o cálculo
    if (receitaTotal === 0) {
      this.statusSobrevivencia = 'Sem dados de receita';
      return;
    }

    // O índice é a relação entre o que vai gastar e o que ganhou
    this.indiceSobrevivencia = (this.projecaoMesAtual / receitaTotal) * 100;
    this.valorFaltanteOuSobra = receitaTotal - this.projecaoMesAtual;

    if (this.indiceSobrevivencia <= 80) {
      this.statusSobrevivencia = 'Zona Segura ✅';
    } else if (this.indiceSobrevivencia <= 100) {
      this.statusSobrevivencia = 'Atenção Limite ⚠️';
    } else {
      this.statusSobrevivencia = 'Déficit Projetado 🚨';
    }
  }

  private calcularRadarOrcamento() {
    const hoje = new Date();
    this.diasRestantes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() - hoje.getDate() + 1;

    // 1. Cálculo do Limite Diário (Exemplo: Saldo Atual / Dias Restantes)
    // Aqui você pode adaptar para (Receita - Gastos Fixos) / Dias Restantes
    const saldoParaGastar = this.transacoes
      .reduce((acc, t) => t.tipo === 'receita' ? acc + t.valor : acc - t.valor, 0);
    
    this.limiteDiarioSugerido = saldoParaGastar > 0 ? saldoParaGastar / this.diasRestantes : 0;

    // 2. Cruzamento com Metas
    this.transacaoService.getOrcamentos().subscribe(metas => {
      this.comparativoMetas = metas.map(meta => {
        const gastoReal = this.transacoes
          .filter(t => t.categoria === meta.categoria && t.tipo === 'despesa' && this.isMesAtual(t.data_transacao))
          .reduce((acc, t) => acc + t.valor, 0);

        const percentual = (gastoReal / meta.limite_mensal) * 100;
        
        return {
          categoria: meta.categoria,
          limite: meta.limite_mensal,
          real: gastoReal,
          porcentagem: percentual > 100 ? 100 : percentual,
          // Define a cor baseada na gravidade
          status: percentual > 90 ? 'danger' : percentual > 70 ? 'warning' : 'success'
        };
      });
    });
  }

  private isMesAtual(dataStr: any): boolean {
    const d = new Date(dataStr);
    const hoje = new Date();
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
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

  getCorIndice() {
    if (this.indiceSobrevivencia <= 80) return '#10b981'; // Verde
    if (this.indiceSobrevivencia <= 100) return '#f59e0b'; // Laranja
    return '#ef4444'; // Vermelho
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