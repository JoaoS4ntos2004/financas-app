import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacaoService, Transacao } from './services/transacao.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  transacoes: Transacao[] = [];
  private transacaoService = inject(TransacaoService);

  // Variáveis do Dashboard
  totalReceitas: number = 0;
  totalDespesas: number = 0;
  saldoGeral: number = 0;

  // Filtro de Mês/Ano
  mesAnoSelecionado: string = ''; // Vai guardar o valor 'YYYY-MM'
  transacoesDoMes: any[] = [];    // A lista apenas com os dados do mês escolhido

  // Variáveis de Filtro e Paginação
  transacoesFiltradas: any[] = []; // A lista fatiada que vai pra tela
  ordemMaisNovas: boolean = true;  // Começa mostrando as mais recentes
  paginaAtual: number = 1;
  itensPorPagina: number = 15;     // Quantidade de itens por página

// Variáveis do Filtro de Categoria na Lista
  categoriaSelecionada: string = 'Todas';
  categoriasDisponiveis: string[] = [];
  totalItensFiltro: number = 0; // Para a paginação não quebrar quando filtrar


  // Variável do Gráfico
  graficoCategorias: any;

  novaTransacao: Transacao = {
    descricao: '',
    valor: 0,
    tipo: 'despesa'
  };

  ngOnInit() {
    // Define o mês atual como padrão (ex: "2026-02")
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    this.mesAnoSelecionado = `${ano}-${mes}`;

    this.carregarTransacoes();
  }

  carregarTransacoes() {
    this.transacaoService.getTransacoes().subscribe({
      next: (dados) => {
        this.transacoes = dados;
        this.filtrarPorMes();
      },
      error: (erro) => {
        console.error('Erro ao buscar transações:', erro);
      }
    });
  }

  // --- A SOLUÇÃO DEFINITIVA: EXTRATOR MATEMÁTICO DE DATAS ---
  private parseDataSegura(dataStr: any): Date | null {
    if (!dataStr) return null;
    const s = String(dataStr).trim();

    try {
      // Se vier do banco como '2026-02-22 00:00:00' ou '2026-02-22T00:00:00.000'
      if (s.includes('-')) {
        // Pega apenas a parte da data '2026-02-22' e separa pelos traços
        const parteData = s.split(' ')[0].split('T')[0];
        const partes = parteData.split('-');
        
        if (partes.length === 3) {
          // new Date(ano, mês_index, dia) -> Obs: Mês começa no 0 no JS
          return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        }
      }

      // Se por acaso vier no formato BR '22/02/2026'
      if (s.includes('/')) {
        const parteData = s.split(' ')[0];
        const partes = parteData.split('/');
        if (partes.length === 3) {
          return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
        }
      }
    } catch (e) {
      console.error("Erro ao ler data:", dataStr);
    }
    
    return null; 
  }

  // --- O FILTRO QUE AGORA ENTENDE A DATA E AS CATEGORIAS ---
  filtrarPorMes() {
    if (!this.mesAnoSelecionado) {
      this.transacoesDoMes = [...this.transacoes];
    } else {
      const [anoSel, mesSel] = this.mesAnoSelecionado.split('-');
      
      this.transacoesDoMes = this.transacoes.filter(t => {
        const d = this.parseDataSegura(t.data_transacao);
        if (!d) return false;
        return d.getFullYear() === Number(anoSel) && (d.getMonth() + 1) === Number(mesSel);
      });
    }

    // EXTRAI AS CATEGORIAS ÚNICAS DO MÊS PARA O FILTRO
    const setCat = new Set(this.transacoesDoMes.map(t => t.categoria || 'Outros'));
    this.categoriasDisponiveis = Array.from(setCat).sort();
    
    // Se mudou de mês e a categoria selecionada não existe nele, volta pra "Todas"
    if (this.categoriaSelecionada !== 'Todas' && !this.categoriasDisponiveis.includes(this.categoriaSelecionada)) {
      this.categoriaSelecionada = 'Todas';
    }

    this.paginaAtual = 1; 
    this.calcularResumo();
    this.aplicarFiltrosEPaginacao();
    
    if (this.transacoesDoMes.length > 0) {
      setTimeout(() => this.atualizarGrafico(), 50);
    } else if (this.graficoCategorias) {
      this.graficoCategorias.destroy();
      this.graficoCategorias = null;
    }
  }

  // --- A ORDENAÇÃO E O NOVO FILTRO DE CATEGORIA ---
  aplicarFiltrosEPaginacao() {
    // 1. Filtra primeiro pela categoria escolhida
    let temp = this.categoriaSelecionada === 'Todas' 
      ? [...this.transacoesDoMes] 
      : this.transacoesDoMes.filter(t => (t.categoria || 'Outros') === this.categoriaSelecionada);
    
    // Salva o total de itens para a paginação calcular certo
    this.totalItensFiltro = temp.length;

    // 2. Ordena pelas datas
    temp.sort((a, b) => {
      const dataA = this.parseDataSegura(a.data_transacao)?.getTime() || 0;
      const dataB = this.parseDataSegura(b.data_transacao)?.getTime() || 0;
      return this.ordemMaisNovas ? dataB - dataA : dataA - dataB;
    });

    // 3. Fatiamento das páginas
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.transacoesFiltradas = temp.slice(inicio, fim);
  }

  mudarCategoria() {
    this.paginaAtual = 1; // Volta pra página 1 ao trocar a categoria
    this.aplicarFiltrosEPaginacao();
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalItensFiltro / this.itensPorPagina) || 1;
  }

  adicionarTransacao() {
    if (!this.novaTransacao.descricao || this.novaTransacao.valor <= 0) {
      alert('Preencha a descrição e um valor maior que zero!');
      return;
    }

    this.transacaoService.criarTransacao(this.novaTransacao).subscribe({
      next: (resultado) => {
        console.log('Salvo com sucesso no banco!', resultado);
        this.novaTransacao = { descricao: '', valor: 0, tipo: 'despesa' };
        this.carregarTransacoes();
      },
      error: (erro) => {
        console.error('Erro ao salvar:', erro);
        alert('Erro ao salvar no banco de dados.');
      }
    });
  }

  excluirTransacao(id?: number) {
    if (!id) return;

    const confirmacao = confirm('Tem certeza que deseja apagar este lançamento?');
    
    if (confirmacao) {
      this.transacaoService.deletarTransacao(id).subscribe({
        next: () => {
          console.log(`Transação ${id} apagada com sucesso!`);
          this.carregarTransacoes();
        },
        error: (erro) => {
          console.error('Erro ao excluir:', erro);
          alert('Erro ao excluir a transação do banco de dados.');
        }
      });
    }
  }

  mudarOrdem() {
    this.ordemMaisNovas = !this.ordemMaisNovas;
    this.paginaAtual = 1; 
    this.aplicarFiltrosEPaginacao();
  }

  proximaPagina() {
    if ((this.paginaAtual * this.itensPorPagina) < this.transacoesDoMes.length) {
      this.paginaAtual++;
      this.aplicarFiltrosEPaginacao();
    }
  }

  paginaAnterior() {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      this.aplicarFiltrosEPaginacao();
    }
  }



  calcularResumo() {
    // 1. Zera os contadores
    this.totalReceitas = 0;
    this.totalDespesas = 0;
    this.saldoGeral = 0;

    // 2. Calcula Receitas e Despesas APENAS do mês filtrado (Cards Verde e Vermelho)
    for (let t of this.transacoesDoMes) {
      if (t.tipo === 'receita') {
        this.totalReceitas += t.valor;
      } else if (t.tipo === 'despesa') {
        this.totalDespesas += t.valor;
      }
    }
    
    // 3. Calcula o Saldo Geral ACUMULADO (Card Azul)
    if (this.mesAnoSelecionado) {
      const [anoSel, mesSel] = this.mesAnoSelecionado.split('-');
      
      for (let t of this.transacoes) { // Usa a lista GERAL de transações
        const d = this.parseDataSegura(t.data_transacao);
        if (d) {
          const anoTransacao = d.getFullYear();
          const mesTransacao = d.getMonth() + 1;
          
          // Soma se a transação for de um mês anterior ou do próprio mês selecionado
          if (anoTransacao < Number(anoSel) || (anoTransacao === Number(anoSel) && mesTransacao <= Number(mesSel))) {
            if (t.tipo === 'receita') {
              this.saldoGeral += t.valor;
            } else if (t.tipo === 'despesa') {
              this.saldoGeral -= t.valor;
            }
          }
        }
      }
    } else {
      // Se limpou o filtro (vendo todas as épocas), soma tudo
      for (let t of this.transacoes) {
        if (t.tipo === 'receita') this.saldoGeral += t.valor;
        else this.saldoGeral -= t.valor;
      }
    }
  }

  atualizarGrafico() {
    const despesas = this.transacoesDoMes.filter(t => t.tipo === 'despesa');
    const gastosPorCategoria: { [key: string]: number } = {};
    
    despesas.forEach(t => {
      const cat = t.categoria || 'Outros';
      if (!gastosPorCategoria[cat]) {
        gastosPorCategoria[cat] = 0;
      }
      gastosPorCategoria[cat] += t.valor;
    });

    const labels = Object.keys(gastosPorCategoria);
    const dados = Object.values(gastosPorCategoria);

    if (this.graficoCategorias) {
      this.graficoCategorias.destroy();
    }

    this.graficoCategorias = new Chart('canvasCategorias', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dados,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
            '#FF9F40', '#E7E9ED', '#8D6E63', '#26A69A', '#EF5350'
          ],
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  }

  arquivoSelecionado: File | null = null;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.arquivoSelecionado = file;
    }
  }

  importarArquivo() {
    if (!this.arquivoSelecionado) {
      alert('Selecione um arquivo CSV primeiro!');
      return;
    }

    this.transacaoService.importarExtratoCSV(this.arquivoSelecionado).subscribe({
      next: (res) => {
        alert(res.mensagem);
        this.arquivoSelecionado = null; 
        this.carregarTransacoes(); 
      },
      error: (erro) => {
        console.error('Erro na importação:', erro);
        alert('Erro ao importar o arquivo.');
      }
    });
  }
}