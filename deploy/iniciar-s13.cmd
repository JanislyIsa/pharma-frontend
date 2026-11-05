@echo off
setlocal
set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
set "PYEXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "BACKEND=%~dp0..\..\pharmaSoft-main"
"%DOCKER%" desktop start
"%DOCKER%" start oracle-local
if errorlevel 1 exit /b 1
"%DOCKER%" stop pharma-redis >nul 2>&1
"%DOCKER%" compose -f "%~dp0docker-compose.yml" up -d --wait
if errorlevel 1 exit /b 1
"%PYEXE%" "%BACKEND%\tools\s13_runtime.py" prod
if errorlevel 1 exit /b 1
echo PharmaSoft disponible en http://localhost:8081
