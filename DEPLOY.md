# Nexus Sport — Guía de Despliegue en Producción

## Arquitectura

```
GitHub repo
├── backend/   → Railway  (FastAPI + SQLite)
└── frontend/  → Vercel   (Next.js PWA)
```

---

## 1. Backend en Railway

### 1.1 Crear cuenta y proyecto

1. Ve a [railway.app](https://railway.app) y regístrate con tu cuenta de GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Autoriza Railway y selecciona el repositorio `nexus-sport`.
4. Railway detectará automáticamente el `nixpacks.toml` y el `Procfile`.

### 1.2 Configurar variables de entorno

En Railway → tu proyecto → pestaña **Variables**, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `db/nexus.db` |
| `SECRET_KEY` | genera uno con `python -c "import secrets; print(secrets.token_hex(32))"` |
| `SPORTS_API_KEY` | tu key de api-football.com |
| `FOOTBALL_DATA_KEY` | tu key de football-data.org |
| `ODDS_API_KEY` | tu key de the-odds-api.com |
| `DEBUG` | `False` |
| `PORT` | Railway lo inyecta automáticamente — **no lo agregues** |

### 1.3 Dominio público

- Railway → Settings → **Generate Domain**.
- Anota la URL, p.ej. `https://nexus-sport-production.up.railway.app`.
- Úsala en el paso 2.3 del frontend.

### 1.4 Verificar el backend

```bash
curl https://nexus-sport-production.up.railway.app/health
# → {"status":"ok"}

curl https://nexus-sport-production.up.railway.app/matches
# → [] (vacío hasta que corras sync)
```

### 1.5 Poblar datos iniciales (una vez desplegado)

```bash
# Sync partidos WC desde football-data.org
curl -X POST https://nexus-sport-production.up.railway.app/admin/sync/matches

# Verificar equipos insertados
curl https://nexus-sport-production.up.railway.app/matches
```

> Los cruces de eliminatoria se rellenarán automáticamente cuando finalice la fase de grupos del Mundial 2026. El scheduler corre `sync_wc_matches` cada día a las 06:00 Lima.

---

## 2. Frontend en Vercel

### 2.1 Crear cuenta y proyecto

1. Ve a [vercel.com](https://vercel.com) y regístrate con tu cuenta de GitHub.
2. Click **Add New Project** → importa el repositorio `nexus-sport`.
3. En **Root Directory** escribe `frontend` (porque el Next.js está en la subcarpeta).
4. Framework: Vercel detecta Next.js automáticamente.

### 2.2 Build settings

Vercel usa `vercel.json` automáticamente. Asegúrate de que esté en `frontend/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### 2.3 Configurar variables de entorno

En Vercel → tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://nexus-sport-production.up.railway.app` |
| `NEXT_PUBLIC_YAPE_NUMBER` | tu número Yape real |
| `NEXT_PUBLIC_PLIN_NUMBER` | tu número Plin real |

### 2.4 Desplegar

Click **Deploy**. Vercel te da una URL como `https://nexus-sport.vercel.app`.

---

## 3. Verificación end-to-end

1. Abre `https://nexus-sport.vercel.app` en el navegador.
2. Deberías ver la grilla de partidos (o el estado vacío si no hay cruces aún).
3. Abre un partido → modal de pago → ingresa N° de operación de prueba.
4. Verifica en Railway logs que el backend recibe el request.
5. En Railway → Shell, ejecuta:
   ```bash
   python -c "
   import asyncio, aiosqlite
   async def v():
       async with aiosqlite.connect('db/nexus.db') as db:
           await db.execute(\"UPDATE payments SET status='verified' WHERE op_number='TEST001'\")
           await db.commit()
   asyncio.run(v())
   "
   ```
6. Vuelve al modal y haz click en **Reintentar verificación** → debe redirigir al reporte.

---

## 4. Variables de entorno resumen

### Backend (Railway)

```env
DATABASE_URL=db/nexus.db
SECRET_KEY=<genera con secrets.token_hex(32)>
SPORTS_API_KEY=<api-football.com>
FOOTBALL_DATA_KEY=<football-data.org>
ODDS_API_KEY=<the-odds-api.com>
DEBUG=False
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
NEXT_PUBLIC_YAPE_NUMBER=999-000-000
NEXT_PUBLIC_PLIN_NUMBER=999-000-001
```

---

## 5. Notas importantes

- **SQLite en Railway**: Railway usa un filesystem efímero. Los datos de `db/nexus.db` se pierden en cada redeploy. Para producción real, migra a **PostgreSQL** (Railway ofrece un plugin gratuito) y cambia `aiosqlite` por `asyncpg`.
- **Modelos ML**: los archivos `.joblib` no se commitean (`.gitignore`). Railway los genera en el primer arranque vía `load_models()` que llama a `train_*` si no existen.
- **CORS**: el backend está configurado con `allow_origins=["*"]`. Para producción, restringe a `["https://nexus-sport.vercel.app"]` en `backend/main.py`.
- **PWA**: el Service Worker solo se registra en producción (`disable: process.env.NODE_ENV === "development"`). En Vercel funciona correctamente.
