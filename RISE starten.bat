@echo off
REM RISE Calisthenics - lokalen Server starten und App im Browser oeffnen
cd /d "%~dp0"
echo ================================================
echo   RISE Calisthenics wird gestartet...
echo   Zum Beenden dieses Fenster schliessen.
echo ================================================
start "" http://localhost:8123
python -m http.server 8123
