# Script PowerShell para iniciar o ambiente local de testes do Chatbot Studio
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🤖 CHATBOT STUDIO - AMBIENTE DE TESTES LOCAL" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] Node.js não foi encontrado no PATH." -ForegroundColor Red
    Write-Host "Por favor, instale o Node.js v18 ou superior."
    exit 1
}

Write-Host "Iniciando servidor local e abrindo o navegador..." -ForegroundColor Yellow
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5277/testes"
} | Out-Null

Write-Host "[OK] Abrindo navegador em: http://localhost:5277/testes" -ForegroundColor Green
Write-Host ""
Write-Host "Rotas úteis:" -ForegroundColor Gray
Write-Host "  - Lab de Testes:      http://localhost:5277/testes" -ForegroundColor Cyan
Write-Host "  - Simulador WhatsApp: http://localhost:5277/simulador" -ForegroundColor Cyan
Write-Host "  - Criador de Fluxos:  http://localhost:5277/fluxos" -ForegroundColor Cyan
Write-Host "  - Diagnóstico HTML:   http://localhost:5277/testes.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar o servidor a qualquer momento." -ForegroundColor Gray
Write-Host "--------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

node backend/dist/server.js
