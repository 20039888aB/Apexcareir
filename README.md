# Apex Care IR

Inventory, sales, invoicing, finance, and business management platform for Apex Care Interventional Radiology.

**Stack:** Django 4.2 REST API · React 18 + Vite · PostgreSQL · JWT authentication

---

## Local development

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
# Edit .env with your database credentials
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

### Frontend
```powershell
cd ..
copy .env.example .env
npm install
npm run dev
```

- **Public site:** http://localhost:5173
- **Admin console:** http://localhost:5173/admin1
- **API:** http://127.0.0.1:8000/api/v1/

### Full dev stack (Windows)
```powershell
npm run dev:all
```

### Background scheduler (reports / scheduled emails)
```powershell
cd backend
.\.venv\Scripts\python.exe manage.py run_scheduler
```

---

## Production deployment (Docker)

The production setup runs four services:

| Service | Role |
|---------|------|
| `db` | PostgreSQL 16 |
| `backend` | Gunicorn + Django (`DJANGO_ENV=production`) |
| `scheduler` | Scheduled jobs (`run_scheduler`) |
| `nginx` | Serves React build, proxies `/api/` and `/admin/`, serves `/media/` and `/static/` |

### 1. Configure environment

```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
```

Edit both files:
- Set a strong `POSTGRES_PASSWORD`
- Set a strong `SECRET_KEY` (50+ random characters)
- Replace `your-domain.com` with your real domain
- Configure Gmail SMTP (`EMAIL_HOST_PASSWORD`)
- Set `AI_USE_OLLAMA=False` unless Ollama is available

### 2. Build and start

```bash
docker compose up -d --build
```

Site will be available on port `80` (or `HTTP_PORT` from `.env`).

### 3. Create admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

### 4. Verify health

```bash
curl http://localhost/api/v1/health/
```

### 5. Enable HTTPS (recommended)

After placing nginx behind a TLS terminator (Cloudflare, Caddy, or certbot):

In `backend/.env`:
```env
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

Then restart:
```bash
docker compose restart backend scheduler
```

---

## Render deployment (free-tier friendly)

### Why “frontend + DB” is not enough

```text
Browser  →  Frontend (React)  →  Django API  →  Postgres
```

- Postgres only talks to **Django**.
- The React site only talks to **Django** (`/api/v1/...`).
- Putting `DATABASE_URL` on the frontend does **nothing**.

If your Render list looks like this:

| Service | Type | Meaning |
|---------|------|---------|
| Apexcareir | PostgreSQL | Database only |
| Apexcareir | Docker (root `Dockerfile`) | Frontend/nginx only — **not** Django |

…then the DB is **not** connected to the website yet. You still need a **third** service: Django API.

### Target layout

| Service | Type | Role |
|---------|------|------|
| `Apexcareir` | **Postgres** | Keep this (your existing DB) |
| `apexcareir-api` | **Web service (Docker)** | Django — set `DATABASE_URL` here |
| Frontend | **Static Site** (recommended) | React — set `VITE_API_BASE_URL` here |

**Do not** use the root nginx Docker image as the only web service on free Render. It proxies to `BACKEND_HOST`, which usually fails on the free plan (502 on `/api/`).

Config file: `render.yaml`.

### Dashboard setup (do this in order)

#### 1) Keep Postgres

Leave your existing Postgres (`Apexcareir`) as-is. Copy **Internal Database URL** from Connect.

#### 2) Create Django API (`apexcareir-api`)

1. **New → Web Service** → same GitHub repo.
2. Runtime: **Docker**
3. Dockerfile path: `backend/Dockerfile`
4. Docker build context: `backend` (if asked)
5. Region: **Oregon** (same as DB)
6. Health check path: `/api/v1/health/`
7. Environment variables:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Internal Database URL from Postgres |
| `DJANGO_ENV` | `production` |
| `DEBUG` | `False` |
| `SECRET_KEY` | long random string (or Generate) |
| `ALLOWED_HOSTS` | `.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://apexcareir.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | `https://apexcareir.onrender.com` |
| `FRONTEND_APP_URL` | `https://apexcareir.onrender.com` |
| `FRONTEND_PASSWORD_RESET_URL` | `https://apexcareir.onrender.com/admin1/reset-password` |
| `AI_USE_OLLAMA` | `False` |

8. Deploy. Open the URL on the service page, then visit:  
   `https://YOUR-API-NAME.onrender.com/api/v1/health/`  
   It must return OK. That URL is your **API service URL**.

#### 3) Point the frontend at the API

**Option A — Static Site (best on free Render)**

1. **New → Static Site** → same repo.
2. Build: `npm ci && npm run build`
3. Publish directory: `dist`
4. Build env: `VITE_API_BASE_URL=https://YOUR-API-NAME.onrender.com/api/v1`
5. Rewrite: `/*` → `/index.html`
6. After it works, you can suspend the old nginx Docker frontend.

**Option B — Keep current Docker frontend (`Apexcareir`)**

Only works reliably if private networking works. Set:

| Key | Value |
|-----|--------|
| `BACKEND_HOST` | `apexcareir-api:PORT` (from API service; often fails on free) |

Prefer Option A.

#### 4) Sync check

| Test | Expected |
|------|----------|
| API health URL | 200 OK |
| Site login at `/admin1` | Network shows `…/api/v1/auth/login/` → 200 |
| No 502 on `/api/` | Backend reachable |

### After deploy

- Open the **static site** URL (not the API URL) for the public site and `/admin1`.
- First API request after idle may be slow (free web service sleep ~15 minutes).
- Free Postgres expires ~30 days unless upgraded — export backups.

### Local Docker Compose

Unchanged. `docker compose` still uses nginx + `BACKEND_HOST=backend:8000` on your machine only.

---

## Manual VPS deployment (without Docker)

1. Install PostgreSQL, Python 3.12, Node 20, nginx, gunicorn
2. Copy `backend/.env.production.example` → `backend/.env` and configure
3. Backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   export DJANGO_ENV=production
   python manage.py migrate
   python manage.py collectstatic --noinput
   gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3
   ```
4. Frontend:
   ```bash
   VITE_API_BASE_URL=/api/v1 npm run build
   ```
5. Copy `dist/` to nginx web root
6. Use `deploy/nginx/default.conf` as a starting point (update `server_name`, SSL)
7. Run scheduler as a systemd service:
   ```bash
   python manage.py run_scheduler
   ```

---

## Database backups

```bash
# Docker
docker compose exec db pg_dump -U postgres apexcareir_db > backup-$(date +%F).sql

# Restore
cat backup.sql | docker compose exec -T db psql -U postgres apexcareir_db
```

Schedule daily backups with cron or your cloud provider's backup tool.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DJANGO_ENV` | `development` (default) or `production` |
| `SECRET_KEY` | Django secret — must be strong in production |
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | Frontend origins allowed by API |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF |
| `VITE_API_BASE_URL` | Frontend API base (`/api/v1` for same-domain deploy) |
| `API_PUBLIC_URL` | Public URL for media links in PDFs/emails |
| `EMAIL_HOST_*` | SMTP settings — see `backend/EMAIL_SETUP.md` |

---

## Tests

```bash
cd backend
python manage.py test
```

```bash
npm run build
```

---

## Project structure

```
backend/          Django API, models, PDF generation
src/              React frontend (public site + /admin1 console)
deploy/nginx/     Production nginx config
docker-compose.yml
Dockerfile        Frontend build + nginx image
backend/Dockerfile  Backend API image
```

---

## Security checklist before go-live

- [ ] Strong `SECRET_KEY` and `POSTGRES_PASSWORD`
- [ ] `DEBUG=False` / `DJANGO_ENV=production`
- [ ] Real domain in `ALLOWED_HOSTS`, CORS, CSRF
- [ ] HTTPS enabled with `SECURE_SSL_REDIRECT` and HSTS
- [ ] SMTP configured and tested (`manage.py` invoice email)
- [ ] Database backups scheduled
- [ ] Default superuser password changed
- [ ] `.env` files never committed to git

---

## License

Private — Apex Care IR.
