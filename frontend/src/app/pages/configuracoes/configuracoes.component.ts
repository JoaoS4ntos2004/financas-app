import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacaoService } from '../../services/transacao.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrls: ['./configuracoes.component.css']
})
export class ConfiguracoesComponent implements OnInit {
  private transacaoService = inject(TransacaoService);

  orcamentosSalvos: any[] = [];
  
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
        this.novaMeta = { categoria: '', limite_mensal: 0 }; // Limpa o formulário
        this.carregarOrcamentos(); // Recarrega a lista para mostrar a atualização
      },
      error: (erro) => {
        console.error('Erro ao salvar meta:', erro);
        alert('Erro ao salvar a meta no banco de dados.');
      }
    });
  }

  // Se você quiser preencher o formulário rapidinho clicando numa meta existente
  editarMeta(orc: any) {
    this.novaMeta.categoria = orc.categoria;
    this.novaMeta.limite_mensal = orc.limite_mensal;
  }
}