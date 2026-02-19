# Backend

### Cria o ambiente virtual (venv)
python3 -m venv venv

### Ativa o ambiente virtual (Comando específico para Linux/Mac)
source venv/bin/activate

### Executar o servidor
uvicorn main:app --reload

# BD

docker compose up -d