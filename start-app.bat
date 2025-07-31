@echo off
echo Starting MoonMarket App...
cd /d "%~dp0"
docker compose up -d
echo App is running. Access it at http://localhost
pause