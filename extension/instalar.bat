@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo   Instalador y Lanzador de Pomodoro Lock ^& Reward
echo ====================================================
echo.

set EXT_PATH=%~dp0
:: Remove trailing backslash
if "%EXT_PATH:~-1%"=="\" set EXT_PATH=%EXT_PATH:~0,-1%

set APP_URL=http://localhost:3000

echo Ruta de la extension encontrada: "%EXT_PATH%"
echo URL de la aplicacion: %APP_URL%
echo.

:: Detect Google Chrome Path
set CHROME_EXE=""
for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%P (
        set CHROME_EXE=%%P
    )
)

:: Detect Microsoft Edge Path
set EDGE_EXE=""
for %%P in (
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist %%P (
        set EDGE_EXE=%%P
    )
)

:: Choose best browser
set BROWSER_PATH=""
set BROWSER_NAME=""
if not !CHROME_EXE!=="" (
    set BROWSER_PATH=!CHROME_EXE!
    set BROWSER_NAME=Google Chrome
) else if not !EDGE_EXE!=="" (
    set BROWSER_PATH=!EDGE_EXE!
    set BROWSER_NAME=Microsoft Edge
)

if !BROWSER_PATH!=="" (
    echo [ERROR] No se pudo encontrar Google Chrome ni Microsoft Edge en tu sistema.
    echo Por favor, abre tu navegador manualmente, activa el "Modo de desarrollador"
    echo y carga la carpeta de la extension usando "Cargar descomprimida".
    echo.
    pause
    exit /b
)

echo Navegador detectado: !BROWSER_NAME!
echo Ruta del navegador: !BROWSER_PATH!
echo.

:: Create Desktop Shortcut using PowerShell
echo Creando acceso directo en el Escritorio...
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Pomodoro Lock ^& Reward.lnk
set PS_SCRIPT=[IEX] "[$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = !BROWSER_PATH!; $s.Arguments = '\"%APP_URL%\" --load-extension=\"%EXT_PATH%\"'; $s.Description = 'Iniciar Pomodoro con la Extension Prebloqueadora'; $s.IconLocation = '!BROWSER_PATH!,0'; $s.Save()]"

powershell -NoProfile -Command %PS_SCRIPT% >nul 2>&1

if exist "%SHORTCUT_PATH%" (
    echo [OK] Acceso directo creado con exito en el Escritorio: "Pomodoro Lock & Reward"
) else (
    echo [AVISO] No se pudo crear el acceso directo de forma automatica, pero puedes lanzar la app abajo.
)
echo.

echo Iniciando !BROWSER_NAME! con la extension de Pomodoro cargada de manera automatica...
:: Start Chrome/Edge with the extension loaded
start "" !BROWSER_PATH! "%APP_URL%" --load-extension="%EXT_PATH%"

echo.
echo ====================================================
echo  ¡LISTO! La aplicacion se ha iniciado correctamente.
echo  Usa el nuevo acceso directo en tu Escritorio para
echo  abrir siempre Pomodoro con el bloqueo activado.
echo ====================================================
echo.
pause
