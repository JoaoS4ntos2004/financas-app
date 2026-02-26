import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacaoService } from '../../services/transacao.service';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orcamentos.component.html',
  styleUrls: ['./orcamentos.component.css']
})
export class OrcamentosComponent implements OnInit {
  private transacaoService = inject(TransacaoService);

  mesAnoSelecionado: string = '';
  orcamentos: any[] = [];
  progressoCategorias: any[] = []; // Vai guardar o cálculo final das barras

  ngOnInit() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    this.mesAnoSelecionado = `${ano}-${mes}`;

    this.carregarDados();
  }

  carregarDados() {
    // 1. Busca os Orçamentos
    this.transacaoService.getOrcamentos().subscribe({
      next: (dadosOrcamento) => {
        this.orcamentos = dadosOrcamento;
        
        // 2. Busca as Transações
        this.transacaoService.getTransacoes().subscribe({
          next: (dadosTransacoes) => {
            this.calcularProgresso(dadosTransacoes);
          }
        });
      }
    });
  }

  // Mesmo extrator de datas infalível que usamos no Dashboard
  private parseDataSegura(dataStr: any): Date | null {
    if (!dataStr) return null;
    const s = String(dataStr).trim();
    try {
      if (s.includes('-')) {
        const parteData = s.split(' ')[0].split('T')[0];
        const partes = parteData.split('-');
        if (partes.length === 3) return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      }
    } catch (e) {}
    return null; 
  }

  calcularProgresso(todasTransacoes: any[]) {
    const [anoSel, mesSel] = this.mesAnoSelecionado.split('-');

    // Filtra as despesas APENAS do mês selecionado
    const despesasDoMes = todasTransacoes.filter(t => {
      if (t.tipo !== 'despesa') return false;
      const d = this.parseDataSegura(t.data_transacao);
      if (!d) return false;
      return d.getFullYear() === Number(anoSel) && (d.getMonth() + 1) === Number(mesSel);
    });

    // Soma os gastos por categoria
    const gastosPorCategoria: { [key: string]: number } = {};
    for (let t of despesasDoMes) {
      const cat = t.categoria || 'Outros';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + t.valor;
    }

    // Cruza os Gastos com os Limites do Banco de Dados
    this.progressoCategorias = this.orcamentos.map(orc => {
      const gasto = gastosPorCategoria[orc.categoria] || 0;
      const percentual = (gasto / orc.limite_mensal) * 100;
      
      // Define a cor da barra (Verde < 75%, Amarelo < 100%, Vermelho >= 100%)
      let cor = '#22c55e'; // Verde
      if (percentual >= 75 && percentual < 100) cor = '#f59e0b'; // Amarelo
      if (percentual >= 100) cor = '#ef4444'; // Vermelho

      return {
        categoria: orc.categoria,
        limite: orc.limite_mensal,
        gasto: gasto,
        percentual: percentual > 100 ? 100 : percentual, // Trava a barra visual em 100% pra não quebrar a tela
        percentualReal: percentual,
        cor: cor
      };
    });

    // Ordena para colocar as barras mais "estouradas" no topo
    this.progressoCategorias.sort((a, b) => b.percentualReal - a.percentualReal);
  }
}