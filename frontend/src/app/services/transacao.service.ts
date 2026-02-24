import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define o formato dos dados que vêm do Python
export interface Transacao {
  id?: number;
  descricao: string;
  valor: number;
  tipo: string;
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