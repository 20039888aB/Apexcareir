# Start frontend, backend API, and background scheduler together
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

Write-Host "Starting Apexcare full dev stack..."
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend:  http://127.0.0.1:8000"
Write-Host "  Scheduler: background (60s poll)"

Start-Process powershell -ArgumentList "-NoExit", "-File", (Join-Path $root "scripts\start-scheduler.ps1")
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; & '$python' manage.py runserver"
Set-Location $root
npm run dev
