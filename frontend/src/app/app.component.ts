import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- 1. Importante para formulários!
import { TransacaoService, Transacao } from './services/transacao.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule], // <-- 2. Colocar o FormsModule aqui
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

  // Variável do Gráfico
  graficoCategorias: any;

  // 3. Este objeto vai ficar "ligado" aos campos da tela
  novaTransacao: Transacao = {
    descricao: '',
    valor: 0,
    tipo: 'despesa' // Padrão já vem como despesa
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

  // Corta a lista gigante e deixa só a do mês escolhido
  filtrarPorMes() {
    if (!this.mesAnoSelecionado) {
      this.transacoesDoMes = [...this.transacoes];
    } else {
      const [anoSel, mesSel] = this.mesAnoSelecionado.split('-');
      
      this.transacoesDoMes = this.transacoes.filter(t => {
        if (!t.data_transacao) return false;
        
        // Converte a data do banco para o objeto Date
        const data = new Date(t.data_transacao);
        
        // A MÁGICA: Usar getUTC ignora o fuso horário do Brasil (GMT-3) 
        // e impede que o dia 01 do mês volte para o dia 31 do mês anterior!
        const anoTransacao = data.getUTCFullYear();
        const mesTransacao = data.getUTCMonth() + 1; // getUTCMonth começa em 0
        
        return anoTransacao === parseInt(anoSel) && mesTransacao === parseInt(mesSel);
      });
    }

    // Depois de separar o mês, manda recalcular TUDO!
    this.paginaAtual = 1; 
    this.calcularResumo();
    this.aplicarFiltrosEPaginacao();
    
    // Atualiza o gráfico ou apaga se o mês estiver vazio
    if (this.transacoesDoMes.length > 0) {
      setTimeout(() => this.atualizarGrafico(), 50);
    } else if (this.graficoCategorias) {
      this.graficoCategorias.destroy();
      this.graficoCategorias = null;
    }
  }

  // 4. Função que o botão "Salvar" vai chamar
  adicionarTransacao() {
    // Validação básica
    if (!this.novaTransacao.descricao || this.novaTransacao.valor <= 0) {
      alert('Preencha a descrição e um valor maior que zero!');
      return;
    }

    // Chama o serviço para enviar o POST pro Python
    this.transacaoService.criarTransacao(this.novaTransacao).subscribe({
      next: (resultado) => {
        console.log('Salvo com sucesso no banco!', resultado);
        // Limpa o formulário para a próxima inserção
        this.novaTransacao = { descricao: '', valor: 0, tipo: 'despesa' };
        // Recarrega a lista para mostrar o novo item na hora
        this.carregarTransacoes();
      },
      error: (erro) => {
        console.error('Erro ao salvar:', erro);
        alert('Erro ao salvar no banco de dados.');
      }
    });
  }
  excluirTransacao(id?: number) {
    if (!id) return; // Segurança extra caso o ID venha vazio

    // Pede confirmação antes de apagar
    const confirmacao = confirm('Tem certeza que deseja apagar este lançamento?');
    
    if (confirmacao) {
      this.transacaoService.deletarTransacao(id).subscribe({
        next: () => {
          console.log(`Transação ${id} apagada com sucesso!`);
          // Recarrega a lista para o item sumir da tela na mesma hora
          this.carregarTransacoes();
        },
        error: (erro) => {
          console.error('Erro ao excluir:', erro);
          alert('Erro ao excluir a transação do banco de dados.');
        }
      });
    }
  }

  // Aplica a ordem das datas e recorta a lista para a página atual
  // Aplica a ordem das datas e recorta a lista para a página atual
  aplicarFiltrosEPaginacao() {
    // 1. Clona a lista original e ordena por data
    let temp = [...this.transacoesDoMes];
    
    temp.sort((a, b) => {
      // Se não tiver data, assume 0 para o TypeScript não reclamar
      const dataA = a.data_transacao ? new Date(a.data_transacao).getTime() : 0;
      const dataB = b.data_transacao ? new Date(b.data_transacao).getTime() : 0;
      
      return this.ordemMaisNovas ? dataB - dataA : dataA - dataB;
    });

    // 2. Fatia a lista (Paginação)
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.transacoesFiltradas = temp.slice(inicio, fim);
  }

  // Funções dos botões da tela
  mudarOrdem() {
    this.ordemMaisNovas = !this.ordemMaisNovas;
    this.paginaAtual = 1; // Volta pra pág 1 ao mudar a ordem
    this.aplicarFiltrosEPaginacao();
  }

  proximaPagina() {
    if ((this.paginaAtual * this.itensPorPagina) < this.transacoes.length) {
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

  // Calcula o total de páginas para mostrar no HTML
  get totalPaginas(): number {
    return Math.ceil(this.transacoesDoMes.length / this.itensPorPagina) || 1;
  }


  // Calcula os totais do Dashboard
  calcularResumo() {
    this.totalReceitas = 0;
    this.totalDespesas = 0;

    for (let t of this.transacoesDoMes) {
      if (t.tipo === 'receita') {
        this.totalReceitas += t.valor;
      } else if (t.tipo === 'despesa') {
        this.totalDespesas += t.valor;
      }
    }
    
    // Calcula o saldo final
    this.saldoGeral = this.totalReceitas - this.totalDespesas;
  }

  // Agrupa as despesas por categoria e desenha o gráfico
  atualizarGrafico() {
    // 1. Filtra só as despesas
    const despesas = this.transacoesDoMes.filter(t => t.tipo === 'despesa');

    // 2. Agrupa os valores por categoria
    const gastosPorCategoria: { [key: string]: number } = {};
    
    despesas.forEach(t => {
      const cat = t.categoria || 'Outros';
      if (!gastosPorCategoria[cat]) {
        gastosPorCategoria[cat] = 0;
      }
      gastosPorCategoria[cat] += t.valor;
    });

    // 3. Separa os nomes (labels) e os valores (data) para o Chart.js
    const labels = Object.keys(gastosPorCategoria);
    const dados = Object.values(gastosPorCategoria);

    // 4. Se já existir um gráfico na tela, destrói para desenhar o novo por cima
    if (this.graficoCategorias) {
      this.graficoCategorias.destroy();
    }

    // 5. Cria o gráfico de Rosquinha (Doughnut)
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

  // Pega o arquivo quando o usuário seleciona
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.arquivoSelecionado = file;
    }
  }

  // Envia pro back-end
  importarArquivo() {
    if (!this.arquivoSelecionado) {
      alert('Selecione um arquivo CSV primeiro!');
      return;
    }

    this.transacaoService.importarExtratoCSV(this.arquivoSelecionado).subscribe({
      next: (res) => {
        alert(res.mensagem);
        this.arquivoSelecionado = null; // Limpa a seleção
        this.carregarTransacoes(); // Recarrega a lista
      },
      error: (erro) => {
        console.error('Erro na importação:', erro);
        alert('Erro ao importar o arquivo.');
      }
    });
  }
}