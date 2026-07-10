# Start the Apexcare background scheduler (24/7 email queue + report jobs)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Python venv not found at $python. Run: cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
}

Set-Location $backend
Write-Host "Starting Apexcare scheduler (polling every 60s). Press Ctrl+C to stop."
& $python manage.py run_scheduler --poll-seconds 60
