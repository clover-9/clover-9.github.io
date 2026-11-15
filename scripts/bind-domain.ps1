# 绑自定义域名：vktxy.top → Pages 主站，s.vktxy.top → Worker 短链
#
#   用法：powershell -File scripts\bind-domain.ps1 -Domain vktxy.top
#
# 前置条件（缺一不可，否则会报 zone 找不到）：
#   1. 域名已在 Cloudflare 后台 Add a site，状态变成 Active
#   2. 注册商那边 NS 已改成 Cloudflare 给的两个地址，且已生效
#   3. 本机 wrangler 已登录（凭据在 %APPDATA%\xdg.config\.wrangler\config\default.toml）

param(
  [Parameter(Mandatory = $true)][string]$Domain,      # 例如 vktxy.top
  [string]$PagesProject = 'viktor-hub',
  [string]$WorkerName   = 'shortlink',
  [string]$ShortSub     = 's'                          # 短链子域，留空表示不绑
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ---- 取 wrangler 的 OAuth token ----
$cfg = Join-Path $env:APPDATA 'xdg.config\.wrangler\config\default.toml'
if (-not (Test-Path $cfg)) { throw "找不到 wrangler 凭据，先跑 npx wrangler login" }
$m = [regex]::Match((Get-Content $cfg -Raw), 'oauth_token\s*=\s*"([^"]+)"')
if (-not $m.Success) { throw "凭据里没有 oauth_token" }
$hdr = @{ Authorization = "Bearer $($m.Groups[1].Value)"; 'Content-Type' = 'application/json' }
$px  = @{ Proxy = 'http://127.0.0.1:7897' }   # 本机代理；直连可用时删掉

function CF($method, $path, $body) {
  $uri = "https://api.cloudflare.com/client/v4$path"
  if ($body) {
    Invoke-RestMethod -Uri $uri -Method $method -Headers $hdr -Body $body @px -TimeoutSec 40
  } else {
    Invoke-RestMethod -Uri $uri -Method $method -Headers $hdr @px -TimeoutSec 40
  }
}

# ---- 1. 找 zone ----
$z = CF GET "/zones?name=$Domain"
if (-not $z.result -or $z.result.Count -eq 0) {
  throw "Cloudflare 里没有 $Domain —— 先在 Dashboard 里 Add a site，并把注册商 NS 改过去，等状态变 Active 再跑本脚本"
}
$zoneId  = $z.result[0].id
$account = $z.result[0].account.id
"zone: $Domain  id=$zoneId  status=$($z.result[0].status)"
if ($z.result[0].status -ne 'active') {
  Write-Warning "zone 状态是 $($z.result[0].status)，NS 还没生效，绑定大概率会失败"
}

# ---- 2. Pages：根域 + www ----
foreach ($host in @($Domain, "www.$Domain")) {
  try {
    $r = CF POST "/accounts/$account/pages/projects/$PagesProject/domains" (@{ name = $host } | ConvertTo-Json)
    "pages domain ok: $host  status=$($r.result.status)"
  } catch {
    $e = $_.Exception.Response
    if ($e) { "pages domain $host -> " + [int]$e.StatusCode } else { "pages domain $host ERR " + $_.Exception.Message }
  }
}

# ---- 3. Worker：s.xxx 短链 ----
if ($ShortSub) {
  $host = "$ShortSub.$Domain"
  $body = @{
    zone_id     = $zoneId
    zone_name   = $Domain
    hostname    = $host
    service     = $WorkerName
    environment = 'production'
  } | ConvertTo-Json
  try {
    $r = CF PUT "/accounts/$account/workers/domains" $body
    "worker domain ok: $host -> $WorkerName"
  } catch {
    $e = $_.Exception.Response
    if ($e) {
      $sr = New-Object IO.StreamReader($e.GetResponseStream())
      "worker domain -> " + [int]$e.StatusCode + " " + $sr.ReadToEnd()
    } else { "worker domain ERR " + $_.Exception.Message }
  }
}

# ---- 4. SSL 设置 ----
foreach ($s in @(@{ k = 'ssl'; v = 'strict' }, @{ k = 'always_use_https'; v = 'on' }, @{ k = 'min_tls_version'; v = '1.2' })) {
  try {
    CF PATCH "/zones/$zoneId/settings/$($s.k)" (@{ value = $s.v } | ConvertTo-Json) | Out-Null
    "setting $($s.k) = $($s.v)"
  } catch { "setting $($s.k) 失败" }
}

# ---- 5. 验证 ----
"`n=== 验证（等 1~3 分钟证书签发后再看）==="
foreach ($u in @("https://$Domain/", "https://$Domain/s?S800")) {
  $o = & curl.exe -s -o NUL -m 25 --proxy http://127.0.0.1:7897 -D - $u 2>$null
  $st  = ($o | Select-String -Pattern '^HTTP/' | Select-Object -Last 1).Line
  $loc = ($o | Select-String -Pattern '^location:').Line
  "  {0,-42} {1} {2}" -f $u, ($st -replace '\s+$', ''), $loc
}
