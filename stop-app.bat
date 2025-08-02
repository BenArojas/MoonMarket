@echo off
echo Stopping MoonMarket App...
cd /d "%~dp0"
docker compose down
echo App has been stopped.
pause