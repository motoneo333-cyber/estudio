#!/bin/bash

echo "===================================================="
echo "  Instalador Automatico de Extension de Pomodoro"
echo "===================================================="
echo

EXT_ID="mapdnmdheffkmkddimembcmeiojpjjob"
# Get absolute path of current script directory
EXT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Ruta de la extension: ${EXT_PATH}"
echo "ID de la extension: ${EXT_ID}"
echo

# 1. macOS Chrome
MAC_CHROME_DIR="${HOME}/Library/Application Support/Google/Chrome/External Extensions"
if [ -d "${HOME}/Library/Application Support/Google/Chrome" ]; then
    mkdir -p "${MAC_CHROME_DIR}"
    cat <<EOF > "${MAC_CHROME_DIR}/${EXT_ID}.json"
{
  "external_directory": "${EXT_PATH}",
  "external_version": "1.0"
}
EOF
    echo "[OK] Instalado para Google Chrome en macOS."
fi

# 2. macOS Edge
MAC_EDGE_DIR="${HOME}/Library/Application Support/Microsoft Edge/External Extensions"
if [ -d "${HOME}/Library/Application Support/Microsoft Edge" ]; then
    mkdir -p "${MAC_EDGE_DIR}"
    cat <<EOF > "${MAC_EDGE_DIR}/${EXT_ID}.json"
{
  "external_directory": "${EXT_PATH}",
  "external_version": "1.0"
}
EOF
    echo "[OK] Instalado para Microsoft Edge en macOS."
fi

# 3. Linux Chrome
LINUX_CHROME_DIR="${HOME}/.config/google-chrome/External Extensions"
if [ -d "${HOME}/.config/google-chrome" ]; then
    mkdir -p "${LINUX_CHROME_DIR}"
    cat <<EOF > "${LINUX_CHROME_DIR}/${EXT_ID}.json"
{
  "external_directory": "${EXT_PATH}",
  "external_version": "1.0"
}
EOF
    echo "[OK] Instalado para Google Chrome en Linux."
fi

# 4. Linux Chromium
LINUX_CHROMIUM_DIR="${HOME}/.config/chromium/External Extensions"
if [ -d "${HOME}/.config/chromium" ]; then
    mkdir -p "${LINUX_CHROMIUM_DIR}"
    cat <<EOF > "${LINUX_CHROMIUM_DIR}/${EXT_ID}.json"
{
  "external_directory": "${EXT_PATH}",
  "external_version": "1.0"
}
EOF
    echo "[OK] Instalado para Chromium en Linux."
fi

echo
echo "¡La extension se ha instalado de manera completamente automatica!"
echo "Por favor, cierra todas las ventanas de tu navegador y reinicialo para activar la extension."
echo
