import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TransacaoService } from '../../services/transacao.service';
import { PluggyConnect } from 'pluggy-connect-sdk';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrls: ['./configuracoes.component.css']
})
export class ConfiguracoesComponent implements OnInit {
  private transacaoService = inject(TransacaoService);
  private http = inject(HttpClient); // Injetado para falar com o Python

  orcamentosSalvos: any[] = [];
  carregandoPluggy: boolean = false; // Controle do botão da Pluggy
  
  // Variável ligada ao formulário
  novaMeta = {
    categoria: '',
    limite_mensal: 0
  };

  ngOnInit() {
    this.carregarOrcamentos();
  }

  carregarOrcamentos() {
    this.transacaoService.getOrcamentos().subscribe({
      next: (dados) => {
        this.orcamentosSalvos = dados;
      },
      error: (erro) => console.error("Erro ao carregar orçamentos:", erro)
    });
  }

  salvarMeta() {
    if (!this.novaMeta.categoria || this.novaMeta.limite_mensal <= 0) {
      alert('Preencha o nome da categoria e um limite maior que zero!');
      return;
    }

    this.transacaoService.salvarOrcamento(this.novaMeta).subscribe({
      next: (resposta) => {
        console.log('Salvo com sucesso:', resposta);
        this.novaMeta = { categoria: '', limite_mensal: 0 }; 
        this.carregarOrcamentos(); 
      },
      error: (erro) => {
        console.error('Erro ao salvar meta:', erro);
        alert('Erro ao salvar a meta no banco de dados.');
      }
    });
  }

  editarMeta(orc: any) {
    this.novaMeta.categoria = orc.categoria;
    this.novaMeta.limite_mensal = orc.limite_mensal;
  }

  excluirMeta(categoria: string) {
    const confirmacao = confirm(`Tem certeza que deseja excluir a meta de "${categoria}"?`);
    
    if (confirmacao) {
      this.transacaoService.excluirOrcamento(categoria).subscribe({
        next: (res) => {
          console.log('Meta removida:', res.mensagem);
          this.carregarOrcamentos(); 
        },
        error: (erro) => {
          console.error('Erro ao excluir meta:', erro);
          alert('Não foi possível excluir a meta.');
        }
      });
    }
  }

  // --- NOVA FUNÇÃO: OPEN FINANCE ---
  vincularBanco() {
    this.carregandoPluggy = true;
    
    // 1. Pede o Token temporário para o seu backend em Python
    this.http.get<any>('http://127.0.0.1:8000/pluggy/token').subscribe({
      next: (resposta) => {
        this.carregandoPluggy = false;
        
        // 2. Inicializa o Widget da Pluggy com o token recebido
        const connect = new PluggyConnect({
          connectToken: resposta.accessToken,
          includeSandbox: true, // Modo de teste ativado
          onSuccess: (dadosItem) => {
            console.log('Sucesso absoluto! Item criado:', dadosItem);
            alert(`Banco vinculado com sucesso! ID da conexão: ${dadosItem.item.id}`);
          },
          onError: (erro) => {
            console.error('Erro no widget da Pluggy:', erro);
          }
        });

        // 3. Abre a janela do banco
        connect.init();
      },
      error: (err) => {
        console.error('Erro ao buscar o token no backend:', err);
        alert('Erro ao comunicar com o servidor. O backend está rodando?');
        this.carregandoPluggy = false;
      }
    });
  }
}