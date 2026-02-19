import os
from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from dotenv import load_dotenv

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
    data_transacao = Column(DateTime, default=datetime.utcnow)
    consolidado = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

# --- SCHEMAS DE VALIDAÇÃO (Pydantic) ---
# O que esperamos receber do Front-end (Angular)
class TransacaoCreate(BaseModel):
    descricao: str
    valor: float
    tipo: str

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
        "https://financas-r5bly98ub-joaos4ntos2004s-projects.vercel.app"
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
def listar_transacoes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    transacoes = db.query(Transacao).offset(skip).limit(limit).all()
    return transacoes