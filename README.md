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

## Render deployment

Deploy **two** web services (plus the Render Postgres you already linked):

### 1. Backend (Django)
- Root directory: `backend`
- Dockerfile path: `./Dockerfile`
- Set env vars from `backend/.env.production.example`
- `DATABASE_URL` = Render **Internal** Postgres URL
- `DJANGO_ENV=production`
- Listen on Render’s `$PORT` (handled by the backend Dockerfile)

### 2. Frontend (nginx + React)
- Root directory: repo root
- Dockerfile path: `./Dockerfile`
- **Required env var:** `BACKEND_HOST=<your-django-service-name>:<port>`
  - Example: if the Django service is named `apexcareir-api` and uses port `10000`:
    `BACKEND_HOST=apexcareir-api:10000`
- Do **not** use `backend:8000` on Render — that hostname only exists in Docker Compose

The previous crash (`host not found in upstream "backend:8000"`) happened because nginx expected a Compose service named `backend`.

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
