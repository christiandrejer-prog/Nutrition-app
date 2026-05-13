# Start the FastAPI backend with uvicorn using the project virtual environment.
# Run this from a PowerShell prompt.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir '..\..\venv_nutrition-app\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
    Write-Error "Virtual environment Python not found: $venvPython"
    return
}

Set-Location $scriptDir
& $venvPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000