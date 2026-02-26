import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OrcamentosComponent } from './pages/orcamentos/orcamentos.component';
import { EstatisticasComponent } from './pages/estatisticas/estatisticas.component';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, // Rota padrão redireciona pro dashboard
  { path: 'dashboard', component: DashboardComponent },
  { path: 'orcamentos', component: OrcamentosComponent },
  { path: 'estatisticas', component: EstatisticasComponent },
  { path: 'configuracoes', component: ConfiguracoesComponent }
];
