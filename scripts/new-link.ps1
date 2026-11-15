# 生成评论区用的极短链
#
#   powershell -File scripts\new-link.ps1 -Code a1
#   powershell -File scripts\new-link.ps1 -Code a2 -Channel 视频2
#   powershell -File scripts\new-link.ps1 -Code a3 -Target "https://vktxy.com/film"
#
# 结果：
#   https://vktxy.com/a1  → 302 → https://vktxy.com/?ch=a1
#   点击与访问都会按渠道 a1 分别计数（/stats 里能看到）
#
# 短码规则：1~6 位 [a-z0-9]，越短越好记。已占用会提示覆盖。

param(
  [Parameter(Mandatory = $true)][string]$Code,
  [string]$Channel = '',
  [string]$Target = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if ($Code -notmatch '^[a-z0-9]{1,6}$') { throw "短码只能是 1~6 位小写字母或数字，例如 a1 / v2 / 8" }
if (-not $Channel) { $Channel = $Code }
if (-not $Target)  { $Target = "https://vktxy.com/?ch=$Channel" }

$env:HTTP_PROXY  = 'http://127.0.0.1:7897'
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'

Set-Location $root
Write-Host "写入 link:$Code -> $Target"
npx --yes wrangler@latest kv key put --binding=LINKS --remote "link:$Code" $Target 2>&1 | Select-Object -Last 1

Write-Host ""
Write-Host "短链：https://vktxy.com/$Code"
Write-Host "目标：$Target"
Write-Host "渠道：$Channel（统计页里单独一行）"
