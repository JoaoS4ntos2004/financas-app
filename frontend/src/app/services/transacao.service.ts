import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

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
  private apiUrl = 'https://financas-app-niso.onrender.com/transacoes';
  private http = inject(HttpClient);

  // --- MEMÓRIA CACHE ---
  private cacheTransacoes: Transacao[] | null = null;
  private cacheOrcamentos: any[] | null = null;

  // Busca a lista de transações com lógica de Cache
  getTransacoes(): Observable<Transacao[]> {
    if (this.cacheTransacoes) {
      return of(this.cacheTransacoes); // Retorna instantâneo
    }
    return this.http.get<Transacao[]>(this.apiUrl).pipe(
      tap(dados => this.cacheTransacoes = dados) // Guarda no cofre
    );
  }

  getOrcamentos(): Observable<any[]> {
    if (this.cacheOrcamentos) {
      return of(this.cacheOrcamentos);
    }
    const urlOrcamentos = this.apiUrl.replace('transacoes', 'orcamentos');
    return this.http.get<any[]>(urlOrcamentos).pipe(
      tap(dados => this.cacheOrcamentos = dados)
    );
  }

  // --- MÉTODOS DE LIMPEZA (Invalidar Cache) ---
  // Sempre que algo muda no banco, o cache precisa morrer
  limparCacheTransacoes() { this.cacheTransacoes = null; }
  limparCacheOrcamentos() { this.cacheOrcamentos = null; }

  // --- MÉTODOS DE ESCRITA ---
  salvarOrcamento(orcamento: {categoria: string, limite_mensal: number}): Observable<any> {
    const baseUrl = this.apiUrl.split('/transacoes')[0]; 
    const urlFinal = `${baseUrl}/orcamentos/`;
    this.limparCacheOrcamentos(); // Invalida cache para a próxima leitura
    return this.http.post(urlFinal, orcamento);
  }

  excluirOrcamento(categoria: string): Observable<any> {
    const baseUrl = this.apiUrl.split('/transacoes')[0]; 
    const urlFinal = `${baseUrl}/orcamentos/${categoria}`;
    this.limparCacheOrcamentos();
    return this.http.delete(urlFinal);
  }

  criarTransacao(transacao: Transacao): Observable<Transacao> {
    this.limparCacheTransacoes();
    return this.http.post<Transacao>(this.apiUrl, transacao);
  }

  deletarTransacao(id: number): Observable<any> {
    this.limparCacheTransacoes();
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  importarExtratoCSV(arquivo: File): Observable<any> {
  this.limparCacheTransacoes(); // Invalida o cache
  
  const formData = new FormData(); 
  
  formData.append('file', arquivo);
  
  // Passamos o formData para o POST
  return this.http.post(`${this.apiUrl}/importar/`, formData);
}
}