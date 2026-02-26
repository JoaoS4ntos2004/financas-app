import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define o formato dos dados que vêm do Python
export interface Transacao {
  id?: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  data_transacao?: string;
  consolidado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TransacaoService {
  private apiUrl = 'https://financas-app-niso.onrender.com/transacoes/';
  private http = inject(HttpClient); // Injeta o módulo HTTP

  // Busca a lista de transações no Back-end
  getTransacoes(): Observable<Transacao[]> {
    return this.http.get<Transacao[]>(this.apiUrl);
  }

  // Busca as metas de gastos no back-end
  getOrcamentos(): Observable<any[]> {
    // Como a sua apiUrl provavelmente termina em '/transacoes' ou '/transacoes/', 
    // nós trocamos a palavra para bater na rota certa
    const urlOrcamentos = this.apiUrl.replace('transacoes', 'orcamentos');
    return this.http.get<any[]>(urlOrcamentos);
  }

  // Envia a meta (nova ou atualizada) para o Python salvar no banco
  salvarOrcamento(orcamento: {categoria: string, limite_mensal: number}): Observable<any> {
    const baseUrl = this.apiUrl.split('/transacoes')[0]; 
    const urlFinal = `${baseUrl}/orcamentos/`;
    return this.http.post(urlFinal, orcamento);
  }

  // Já deixamos pronto para o futuro: criar nova transação
  criarTransacao(transacao: Transacao): Observable<Transacao> {
    return this.http.post<Transacao>(this.apiUrl, transacao);
  }

  deletarTransacao(id: number): Observable<any> {
    // A URL vai ficar algo como: https://sua-api.onrender.com/transacoes/5
    return this.http.delete(`${this.apiUrl}${id}`);
  }

  importarExtratoCSV(arquivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', arquivo); // 'file' é o nome exato que o Python está esperando
    
    return this.http.post(`${this.apiUrl}importar/`, formData);
  }
}