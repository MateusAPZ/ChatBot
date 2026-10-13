@echo off
chcp 65001 >nul
title Chatbot Studio - WhatsApp (Ambiente de Testes Local)

echo ========================================================
echo   🤖 CHATBOT STUDIO - WHATSAPP BUSINESS
echo   🧪 AMBIENTE DE TESTES LOCAL
echo ========================================================
echo.
echo Iniciando servidor backend e carregando simulador...
echo.

REM Verifica se Node está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no sistema!
    echo Instale o Node.js v18 ou superior para continuar.
    pause
    exit /b 1
)

REM Abrir navegador após 2 segundos em segundo plano
start "" /b powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5277/testes'"

echo [OK] O navegador abrira automaticamente em: http://localhost:5277/testes
echo.
echo Links disponiveis:
echo  - Lab de Testes:      http://localhost:5277/testes
echo  - Simulador WhatsApp: http://localhost:5277/simulador
echo  - Criador de Fluxos:  http://localhost:5277/fluxos
echo  - Pagina HTML Rapida: http://localhost:5277/testes.html
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo --------------------------------------------------------
echo.

node backend/dist/server.js
pause
