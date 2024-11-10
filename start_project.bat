@echo off

:: Start the frontend
start cmd /k "cd frontend && npm start"

:: Start the backend
start cmd /k "cd backend && .venv\scripts\activate && py main.py"

echo Project started. Close this window to shut down all processes.
pause