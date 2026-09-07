@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
if not exist .venv\Scripts\python.exe (
  %PY% -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
 echo.
 echo Setup failed. Check internet/Python installation.
 pause
 exit /b 1
)
python -c "import hashlib,pathlib; p=pathlib.Path('requirements.txt'); m=pathlib.Path('.venv/.requirements.sha256'); m.write_text(hashlib.sha256(p.read_bytes()).hexdigest())"
echo.
echo Setup complete. From now on use start_web_uat.bat
pause
