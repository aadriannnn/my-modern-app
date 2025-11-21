# Lege Aplicată - Aplicație Juridică Inteligentă

Platformă avansată pentru căutare și analiză de dosare juridice, cu funcționalități de matching inteligent pentru coduri și modele de acte.

## 🌟 Funcționalități Principale

- **Căutare Avansată**: Motor de căutare semantic cu embeddings AI
- **Filtre Dinamice**: Filtrare pe materie, obiect, instanță, dată
- **Coduri Juridice**: Găsire instantanee articole relevante din coduri
- **Modele Acte**: Download PDF-uri cu modele de acte procesuale
- **Dosar Virtual**: Salvare dosare favorite (session-based)
- **Căutare Echivalente**: Sistem de sinonime pentru termeni juridici
- **Setări Dinamice**: Configurare parametrii de search din UI

## 🏗️ Arhitectură

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL + pgvector (extern)
- **AI/Embeddings**: Ollama (extern)
- **Server**: Gunicorn + Uvicorn workers

### Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS
- **Server**: Nginx

## 🚀 Quick Start

### Development Local

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Crează .env din template
cp .env.example .env
# Editează .env cu credențialele tale

# Pornește server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install

# Crează .env din template
cp .env.example .env

# Pornește dev server
npm run dev
```

Accesează: `http://localhost:5173`

### Deployment Production (Coolify/Ubuntu)

**👉 Consultă [DEPLOYMENT.md](./DEPLOYMENT.md) pentru ghid complet de deployment pe server Ubuntu cu Cool ify.**

Pași rapizi:
1. Push cod în GitHub
2. Configurează aplicația în Coolify
3. Setează variabile de mediu
4. Deploy automat la fiecare push

## 📁 Structura Proiect

```
my-modern-app/
├── backend/
│   ├── app/
│   │   ├── logic/          # Business logic (search, matching, filters)
│   │   ├── routers/        # API endpoints
│   │   ├── models.py       # SQLModel models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── db.py           # Database connections
│   │   ├── config.py       # Settings management
│   │   └── main.py         # FastAPI app
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── start.sh
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context (Dosar)
│   │   ├── pages/          # Main pages
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── .env.example
├── docker-compose.yml       # Development + Production base
├── docker-compose.prod.yml  # Production overrides
├── DEPLOYMENT.md            # Deployment guide
└── README.md                # This file
```

## 🔧 Configurare

### Variabile de Mediu

#### Backend (`backend/.env`)
```bash
# Database extern (PostgreSQL)
PG_HOST=your_db_host
PG_PORT=5433
PG_USER=your_user
PG_PASS=your_password
PG_DB=verdict

# Ollama AI
OLLAMA_URL=http://your_ollama_host:11434

# Security
USER_SETARI=admin_username
PASS_SETARI=admin_password
SECRET_KEY=generate_with_openssl_rand_hex_32

# Application
CORS_ORIGINS=https://yourdomain.com
ENVIRONMENT=production
```

#### Frontend (`frontend/.env`)
```bash
VITE_API_URL=http://localhost:8000  # sau domeniul production
```

Vezi template-urile `.env.example` pentru detalii complete.

## 🧪 Testing

```bash
# Backend tests (dacă există)
cd backend
pytest

# Frontend build test
cd frontend
npm run build
```

## 📊 API Endpoints

### Căutare
- `POST /api/search` - Căutare dosare
- `GET /api/equivalents` - Termeni echivalenți
- `GET /api/filters` - Obținerefiltru

### Dosare
- `GET /api/case/{id}` - Detalii dosar

### Coduri Juridice
- `POST /api/coduri/relevant` - Articole relevante
- `GET /api/coduri/tables` - Liste coduri

### Modele Acte
- `POST /api/modele/relevant` - Modele relevante
- `GET /api/modele/{id}/download` - Download PDF

### Admin (/setari)
- `GET /api/settings` - Obținere setări
- `PUT /api/settings` - Update setări
- `POST /api/settings/reset` - Reset la default

## 🔐 Securitate

- **Authentication**: Basic auth pentru pagina `/setari`
- **CORS**: Configurabil prin environment variables
- **Rate Limiting**: Nginx level (în production)
- **Security Headers**: XSS, CSP, Frame Options
- **Non-root containers**: Toate containerele rulează cu useri non-privilegiați

## 📈 Performance

### Production Optimizations
- Gunicorn cu multiple workers
- Nginx cu gzip compression și caching
- Multi-stage Docker builds
- Health checks și restart policies
- Resource limits (CPU/Memory)

### Database
- PostgreSQL cu pgvector pentru semantic search
- Index-uri optimizate
- Connection pooling

## 🛠️ Maintenance

### Logs
```bash
# Backend logs
docker logs lege-aplicata-backend

# Frontend logs
docker logs lege-aplicata-frontend
```

### Updates
```bash
git add .
git commit -m "Update: description"
git push origin main
# Coolify va deploy automat
```

### Backup
Vezi [DEPLOYMENT.md](./DEPLOYMENT.md#backup) pentru instrucțiuni backup.

## 📞 Support & Documentation

- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Coolify Docs**: [coolify.io/docs](https://coolify.io/docs)
- **FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **React Docs**: [react.dev](https://react.dev)

## 📝 License

[Specifică licența aici]

## 👨‍💻 Autor

[Numele/Organizația ta]

---

**🚀 Ready pentru deployment? Consultă [DEPLOYMENT.md](./DEPLOYMENT.md)**
