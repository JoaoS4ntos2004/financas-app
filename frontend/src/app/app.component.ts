import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- 1. Importante para formulários!
import { TransacaoService, Transacao } from './services/transacao.service';

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

  // 3. Este objeto vai ficar "ligado" aos campos da tela
  novaTransacao: Transacao = {
    descricao: '',
    valor: 0,
    tipo: 'despesa' // Padrão já vem como despesa
  };

  ngOnInit() {
    this.carregarTransacoes();
  }

  carregarTransacoes() {
    this.transacaoService.getTransacoes().subscribe({
      next: (dados) => {
        this.transacoes = dados;
      },
      error: (erro) => {
        console.error('Erro ao buscar transações:', erro);
      }
    });
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
}