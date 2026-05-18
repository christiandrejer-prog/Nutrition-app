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




# Altemative
# Start the FastAPI backend with uvicorn using the project virtual environment.
# Run this from a PowerShell prompt.
venvPath = Join-Path $PSScriptRoot '..\..\venv_nutrition-app\Scripts\Activate.ps1'
if (Test-Path $venvPath) {
    . $venvPath
    Write-Host "Activated virtual environment: $venvPath"
} else {
    Write-Error "Virtual environment activation script not found: $venvPath"
    return
}
cd nutrition-app/backend
uvicorn app.main:app --reload