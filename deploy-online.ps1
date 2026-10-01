param()
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step([string]$text) {
  Write-Host ""
  Write-Host $text
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Glowy - temporary public link"
Write-Host "========================================"
Write-Host "Keep this window open while you use the link."
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Download it from https://nodejs.org"
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm was not found. Reinstall Node.js and include npm."
  exit 1
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Step "Created .env"
}

if (-not (Test-Path "node_modules")) {
  Write-Step "Installing packages (first run can take a few minutes)..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Step "Preparing database..."
npx prisma generate
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit 1 }

if (-not (Test-Path "prisma\dev.db")) {
  Write-Step "Creating starter data..."
  npx tsx prisma\seed.ts
}

function Test-PortOpen([int]$port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(400)
    if ($ok -and $client.Connected) {
      $client.Close()
      return $true
    }
    $client.Close()
  } catch {
  }
  return $false
}

# Production mode over the tunnel avoids Next.js HMR WebSocket errors on trycloudflare.com
if (Test-PortOpen 3000) {
  Write-Host ""
  Write-Host "Port 3000 is already in use."
  Write-Host "Close the other Glowy/Next window (or stop npm run dev), then run this script again."
  Write-Host "Using an old 'npm run dev' session causes the wss://.../_next/hmr errors in the browser."
  exit 1
}

Write-Step "Building the app for the public link (no hot-reload)..."
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Step "Starting the app..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start" -WorkingDirectory $root -WindowStyle Minimized

Write-Step "Waiting for http://127.0.0.1:3000 ..."
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/login" -TimeoutSec 2
    if ($response.StatusCode -ge 200) {
      $ready = $true
      break
    }
  } catch {
  }
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  Write-Host "The app did not start on port 3000. Close other programs using that port and try again."
  exit 1
}

Write-Host ""
Write-Host "Local app: http://127.0.0.1:3000"
Write-Host "Login: admin"
Write-Host "Password: 123456"
Write-Host ""
Write-Host "Creating a temporary internet link..."
Write-Host "Copy the https:// line when it appears."
Write-Host ""
Write-Host "Ignore Adobe/PDF extension font messages in the browser console - they are unrelated."
Write-Host ""

npx --yes cloudflared tunnel --url http://127.0.0.1:3000
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Cloudflare failed. Trying a backup tunnel..."
  npx --yes localtunnel --port 3000
}

Write-Host ""
Write-Host "Temporary link stopped."
