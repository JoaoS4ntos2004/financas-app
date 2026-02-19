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
  private apiUrl = 'http://localhost:8000/transacoes/';
  private http = inject(HttpClient); // Injeta o módulo HTTP

  // Busca a lista de transações no Back-end
  getTransacoes(): Observable<Transacao[]> {
    return this.http.get<Transacao[]>(this.apiUrl);
  }

  // Já deixamos pronto para o futuro: criar nova transação
  criarTransacao(transacao: Transacao): Observable<Transacao> {
    return this.http.post<Transacao>(this.apiUrl, transacao);
  }
}