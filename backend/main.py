import os
from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
import csv
import io
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Numeric
from pydantic import BaseModel
from typing import List

# --- CONFIGURAÇÃO DO BANCO ---
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELO DO BANCO (SQLAlchemy) ---
class Transacao(Base):
    __tablename__ = "transacoes"
    
    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String, index=True)
    valor = Column(Float)
    tipo = Column(String) # 'receita' ou 'despesa'
    categoria = Column(String, default="Outros")
    data_transacao = Column(DateTime, default=datetime.utcnow)
    consolidado = Column(Boolean, default=False)

class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String(100), unique=True, nullable=False)
    limite_mensal = Column(Numeric(10, 2), nullable=False)

Base.metadata.create_all(bind=engine)

# --- SCHEMAS DE VALIDAÇÃO (Pydantic) ---
# O que esperamos receber do Front-end (Angular)
class TransacaoCreate(BaseModel):
    descricao: str
    valor: float
    tipo: str
    categoria: str = "Outros"

class OrcamentoBase(BaseModel):
    categoria: str
    limite_mensal: float

    class Config:
        from_attributes = True # Se for Pydantic v2 (FastAPI mais recente)
        # orm_mode = True      # Use este se for Pydantic v1

# O que vamos devolver para o Front-end
class TransacaoResponse(TransacaoCreate):
    id: int
    data_transacao: datetime
    consolidado: bool

    class Config:
        from_attributes = True

# --- INICIALIZAÇÃO E DEPENDÊNCIAS ---
app = FastAPI(title="API de Finanças Pessoais")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200", 
        "http://127.0.0.1:4200",
        "https://financas-r5bly98ub-joaos4ntos2004s-projects.vercel.app",
        "https://financas-app-rho.vercel.app"   
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ROTAS DA API ---
@app.post("/transacoes/", response_model=TransacaoResponse)
def criar_transacao(transacao: TransacaoCreate, db: Session = Depends(get_db)):
    if transacao.tipo not in ['receita', 'despesa']:
        raise HTTPException(status_code=400, detail="Tipo deve ser 'receita' ou 'despesa'")
    
    nova_transacao = Transacao(
        descricao=transacao.descricao,
        valor=transacao.valor,
        tipo=transacao.tipo
    )
    db.add(nova_transacao)
    db.commit()
    db.refresh(nova_transacao)
    return nova_transacao

@app.get("/transacoes/", response_model=List[TransacaoResponse])
def listar_transacoes(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    transacoes = db.query(Transacao).offset(skip).limit(limit).all()
    return transacoes

@app.delete("/transacoes/{transacao_id}")
def deletar_transacao(transacao_id: int, db: Session = Depends(get_db)):
    # 1. Busca a transação no banco pelo ID
    transacao = db.query(Transacao).filter(Transacao.id == transacao_id).first()
    
    # 2. Se não existir, retorna erro 404
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # 3. Se existir, deleta e salva a alteração
    db.delete(transacao)
    db.commit()
    return {"mensagem": "Transação apagada com sucesso!"}

def classificar_categoria(descricao: str, valor: float, tipo: str) -> str:
    desc = descricao.upper() 
    
    # --- 1. TRANSFERÊNCIAS E INVESTIMENTOS ---
    if any(p in desc for p in ["CDB", "APLICACAO", "RESGATE", "PORQUINHO"]):
        return "Investimentos"
        
    if "FATURA" in desc:
        return "Cartão de Crédito"
        
    # --- REGRA DE RENDAS E TRANSFERÊNCIAS ENTRE CONTAS ---
    # Se ENTROU dinheiro da Ceres ou da sua outra conta, é Renda
    if tipo == 'receita' and any(p in desc for p in ["CERES FUNDACAO", "JOAO PEDRO FERNANDES SANT"]):
        return "Salário/Renda"
        
    # Se SAIU dinheiro para a sua outra conta, é pagamento de contas/impostos
    if tipo == 'despesa' and "JOAO PEDRO FERNANDES SANT" in desc:
        return "Contas/Telefonia/Impostos"
        
    # --- 2. CONTAS FIXAS E SAÚDE ---
    if any(p in desc for p in ["TIM S A", "CLARO", "VIVO", "NEOENERGIA", "CAESB", "CONVENIO DETRAN"]):
        return "Contas/Telefonia/Impostos"
    if any(p in desc for p in ["DROG", "FARMACIA"]):
        return "Farmácia/Saúde"

    # --- 3. CONSUMO E LAZER ---
    if "UBER" in desc or "99APP" in desc:
        return "Transporte/App"
    if any(p in desc for p in ["POSTO", "CASCOL", "COMBUSTIVEIS", "QUALITY"]):
        return "Combustível"
    if any(p in desc for p in ["MENDES", "BEER", "BAR", "DISTRIBUIDORA", "KOMBI", "TOINZINHO", "VILLA SIG", "CHAPOU", "RAIP"]):
        return "Cerveja/Rolê"
    if any(p in desc for p in ["DIRIJO", "TABACARIA"]):
        return "Tabaco"
    if any(p in desc for p in ["BIG BOX", "SUPERMERCADO", "PADARIA", "TERRA ALIMENTACAO", "REDE AQUI", "UNIAO"]):
        return "Alimentação"
    if any(p in desc for p in ["IFOOD", "IFD", "PIZZA", "CREPERIA", "SUSHILOKO", "GIRAFFAS", "BISTRO", "RESTAURANTE", "ALIMENTACAO", "SABOR"]):
        return "Alimentação"
    if any(p in desc for p in ["CENTAURO", "AMERICANAS", "CACHOS", "LAVANDERIA"]):
        return "Compras/Variedades"
    
    # --- 4. REGRA DE FALLBACK ---
    if tipo == "receita":
        return "Salário/Renda" if valor > 800 else "Reembolso"
    else:
        return "Pix/Transferência" if valor > 100 else "Consumo Diversos"

@app.post("/transacoes/importar/")
async def importar_extrato(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Extração (Extract): Lê o arquivo enviado
    conteudo = await file.read()
    texto = conteudo.decode("utf-8")
    
    # Lemos o CSV (O Inter geralmente usa ponto e vírgula como separador, se for vírgula, mude aqui)
    leitor_csv = csv.reader(io.StringIO(texto), delimiter=";")
    next(leitor_csv, None)  # Pula a linha de cabeçalho
    
    transacoes_salvas = 0
    
    # 2. Transformação (Transform)
    for linha in leitor_csv:
        if len(linha) >= 3:
            try:
                # Assumindo que o CSV do Inter tem: [0]Data, [1]Histórico/Descrição, [2]Valor
                data_str = linha[0].strip()
                descricao = linha[1].strip()
                
                # Limpa o valor (tira "R$", converte vírgula pra ponto)
                valor_str = linha[2].replace("R$", "").replace(".", "").replace(",", ".").strip()
                valor_float = float(valor_str)
                
                # Regra de negócio: Se for negativo é despesa, se for positivo é receita
                tipo = "receita" if valor_float >= 0 else "despesa"
                valor_absoluto = abs(valor_float)
                
                # --- CHAMA A NOSSA INTELIGÊNCIA AQUI ---
                categoria_calculada = classificar_categoria(descricao, valor_absoluto, tipo)
                
                # Converte a data (ex: 24/02/2026 para formato do banco)
                data_obj = datetime.strptime(data_str, "%d/%m/%Y")
                
                # 3. Carga (Load): Prepara para salvar no banco
                nova_transacao = Transacao(
                    descricao=descricao,
                    valor=valor_absoluto,
                    tipo=tipo,
                    categoria=categoria_calculada, # <-- SALVA A CATEGORIA NO BANCO AQUI
                    data_transacao=data_obj
                )
                db.add(nova_transacao)
                transacoes_salvas += 1
                
            except Exception as e:
                print(f"Erro ao processar linha {linha}: {e}")
                continue # Pula a linha se der erro (ex: linha vazia)

    # Efetiva as mudanças no banco de dados
    db.commit()
    
    return {"mensagem": f"{transacoes_salvas} transações importadas com sucesso!"}

# --- 3. ROTAS DE ORÇAMENTO ---
@app.get("/orcamentos/", response_model=List[OrcamentoBase])
def ler_orcamentos(db: Session = Depends(get_db)):
    return db.query(Orcamento).all()

@app.post("/orcamentos/")
def salvar_orcamento(orcamento: OrcamentoBase, db: Session = Depends(get_db)):
    # Busca se essa categoria já tem um limite salvo
    db_orc = db.query(Orcamento).filter(Orcamento.categoria == orcamento.categoria).first()
    
    if db_orc:
        # Se já existe, apenas atualiza o valor
        db_orc.limite_mensal = orcamento.limite_mensal
    else:
        # Se não existe, cria um novo
        db_orc = Orcamento(categoria=orcamento.categoria, limite_mensal=orcamento.limite_mensal)
        db.add(db_orc)
        
    db.commit()
    return {"mensagem": f"Orçamento de {orcamento.categoria} salvo com sucesso!"}

@app.delete("/orcamentos/{categoria}")
def deletar_orcamento(categoria: str, db: Session = Depends(get_db)):
    db_orc = db.query(Orcamento).filter(Orcamento.categoria == categoria).first()
    if not db_orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    db.delete(db_orc)
    db.commit()
    return {"mensagem": f"Meta de {categoria} removida com sucesso!"}