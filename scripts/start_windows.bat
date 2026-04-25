@echo off
docker compose up -d --build
if errorlevel 1 exit /b 1
docker compose ps
echo App started at http://localhost:8000
