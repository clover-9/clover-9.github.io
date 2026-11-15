# 同步静态文件到 pages-site\dist 并部署到 Cloudflare Pages
#   pwsh -File scripts\deploy-pages.ps1
# 前置：npx wrangler login 过（凭据在 %APPDATA%\xdg.config\.wrangler）

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'pages-site\dist'

$files = @(
  'index.html',
  'waves.webp',
  'site.webmanifest',
  'favicon.ico',
  'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-64.png',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'apple-touch-icon.png',
  'viktor-star-1024.png'
)

New-Item -ItemType Directory -Force -Path $dist | Out-Null
foreach ($f in $files) {
  Copy-Item (Join-Path $root $f) (Join-Path $dist $f) -Force
}
Write-Host "synced $($files.Count) files -> $dist"

Push-Location (Join-Path $root 'pages-site')
try {
  npx --yes wrangler@latest pages deploy --project-name=viktor-hub --branch=main --commit-dirty=true
} finally {
  Pop-Location
}
