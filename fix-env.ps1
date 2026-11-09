# fix-env.ps1 — run this in the project root
param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountJson
)

if (-not (Test-Path $ServiceAccountJson)) {
    Write-Error "File not found: $ServiceAccountJson"
    exit 1
}

$json = Get-Content $ServiceAccountJson -Raw | ConvertFrom-Json

# dotenv needs literal \n between PEM segments, not real newlines
$privateKeyOneLine = $json.private_key -replace "`r`n", "\n" -replace "`n", "\n"

# Sanity check
if ($privateKeyOneLine.Length -lt 500) {
    Write-Error "Private key looks too short ($($privateKeyOneLine.Length) chars). Did you copy the full JSON?"
    exit 1
}
if (-not $privateKeyOneLine.StartsWith("-----BEGIN PRIVATE KEY-----")) {
    Write-Error "Private key doesn't start with -----BEGIN PRIVATE KEY-----"
    exit 1
}
if (-not $privateKeyOneLine.EndsWith("-----END PRIVATE KEY-----\n")) {
    Write-Warning "Private key doesn't end with -----END PRIVATE KEY-----\n — adding it."
    $privateKeyOneLine = $privateKeyOneLine.TrimEnd("\n") + "\n"
}

$sessionSecret  = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$ipHashSecret   = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})

$envContent = @"
# ── Firebase Admin SDK ───────────────────────────────────────
FIREBASE_PROJECT_ID=$($json.project_id)
FIREBASE_CLIENT_EMAIL=$($json.client_email)
FIREBASE_PRIVATE_KEY="$privateKeyOneLine"

# ── Server ──────────────────────────────────────────────────
PORT=8080
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080

# ── Secrets ─────────────────────────────────────────────────
SESSION_SECRET=$sessionSecret
IP_HASH_SECRET=$ipHashSecret

# ── Admin bootstrap ─────────────────────────────────────────
BOOTSTRAP_ADMIN_EMAIL=
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8 -NoNewline
Write-Host "✅ .env written with valid key length: $($privateKeyOneLine.Length) chars" -ForegroundColor Green
Write-Host "   Next: fill BOOTSTRAP_ADMIN_EMAIL in .env, then run 'npm run seed'" -ForegroundColor Yellow