$ErrorActionPreference = "Stop"

$workspaceDir = "c:\Users\정진수\.gemini\antigravity\playground\nebular-orion"
$jsSrcDir = Join-Path $workspaceDir "js\src"
$outJs = Join-Path $workspaceDir "js\app.js"

$htmlSrcDir = Join-Path $workspaceDir "html\components"
$outHtml = Join-Path $workspaceDir "index.html"

# 1. Build JS
Write-Output "Building JS..."
$jsFiles = @("firebase-setup.js", "state.js", "utils.js", "ui.js", "auth.js", "data.js")

if (Test-Path $outJs) { Remove-Item $outJs -Force }

# Use CMD copy to safely merge without encoding issues
$jsArgs = ($jsFiles | ForEach-Object { Join-Path "js\src" $_ }) -join "+"
cmd.exe /c "copy /b $jsArgs js\app.js >nul"
Write-Output " -> js\app.js Created."

# 2. Build HTML
Write-Output "Building HTML..."
$htmlFiles = @(
    "01_head.html", "02_login.html", "03_app_header.html", 
    "04_dashboard.html", "05_table.html", "06_modals.html", 
    "07_options.html", "08_foot.html"
)

if (Test-Path $outHtml) { Remove-Item $outHtml -Force }

# Use CMD copy to safely merge without UTF-8 BOM issues
$htmlArgs = ($htmlFiles | ForEach-Object { Join-Path "html\components" $_ }) -join "+"
cmd.exe /c "copy /b $htmlArgs index.html >nul"
Write-Output " -> index.html Created."

Write-Output "Build Pipeline Completed Successfully!"
