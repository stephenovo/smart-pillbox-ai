#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIRECTORY="$(cd "${SCRIPT_DIRECTORY}/.." && pwd)"
FIRMWARE_DIRECTORY="${PROJECT_DIRECTORY}/hardware/esp32-s3/smart_pillbox_demo"
CONFIG_FILE="${FIRMWARE_DIRECTORY}/config.h"
BUILD_DIRECTORY="${PROJECT_DIRECTORY}/.arduino-build/smart_pillbox_demo"
DEMO_HTTP_PORT="${DEMO_HTTP_PORT:-3000}"
DEMO_HOST="${DEMO_HOST:-0.0.0.0}"
ESP32_FQBN="esp32:esp32:esp32s3:CDCOnBoot=cdc,FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi"

for command_name in arduino-cli npm ifconfig route perl rg awk lsof; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
done

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Missing ${CONFIG_FILE}. Create it from config.example.h first." >&2
  exit 1
fi

NETWORK_INTERFACE="${DEMO_NETWORK_INTERFACE:-}"
if [[ -z "${NETWORK_INTERFACE}" ]]; then
  NETWORK_INTERFACE="$(
    route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}' || true
  )"
fi

if [[ -z "${NETWORK_INTERFACE}" ]] && ifconfig en0 >/dev/null 2>&1; then
  NETWORK_INTERFACE="en0"
fi

if [[ -z "${NETWORK_INTERFACE}" ]]; then
  echo "Could not determine the active network interface." >&2
  exit 1
fi

MAC_LAN_IP="$(ifconfig "${NETWORK_INTERFACE}" | awk '/inet /{print $2; exit}')"
if [[ -z "${MAC_LAN_IP}" || "${MAC_LAN_IP}" == "127.0.0.1" ]]; then
  echo "Could not determine a LAN IP for ${NETWORK_INTERFACE}." >&2
  exit 1
fi

SERVER_URL="http://${MAC_LAN_IP}:${DEMO_HTTP_PORT}"
echo "Using Mac hotspot address: ${SERVER_URL}"

if [[ "${DEMO_DRY_RUN:-0}" == "1" ]]; then
  echo "Dry run complete; config, firmware, and server were not changed."
  exit 0
fi

if lsof -nP -iTCP:"${DEMO_HTTP_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${DEMO_HTTP_PORT} is already in use. Stop the existing server and rerun." >&2
  exit 1
fi

if ! rg -q '^#define SERVER_BASE_URL "[^"]+"$' "${CONFIG_FILE}"; then
  echo "SERVER_BASE_URL was not found in ${CONFIG_FILE}." >&2
  exit 1
fi

DEMO_SERVER_URL="${SERVER_URL}" perl -0pi -e \
  's{^#define SERVER_BASE_URL "[^"]+"$}{#define SERVER_BASE_URL "$ENV{DEMO_SERVER_URL}"}m' \
  "${CONFIG_FILE}"

ESP32_SERIAL_PORT="${ESP32_PORT:-}"
if [[ -z "${ESP32_SERIAL_PORT}" ]]; then
  shopt -s nullglob
  SERIAL_PORTS=(/dev/cu.usbmodem*)
  shopt -u nullglob

  if [[ "${#SERIAL_PORTS[@]}" -eq 0 ]]; then
    echo "No ESP32 serial port found. Connect its Type-C data cable and retry." >&2
    exit 1
  fi
  if [[ "${#SERIAL_PORTS[@]}" -gt 1 ]]; then
    echo "Multiple ESP32 ports found. Run with ESP32_PORT=/dev/cu.usbmodem..." >&2
    printf '  %s\n' "${SERIAL_PORTS[@]}" >&2
    exit 1
  fi
  ESP32_SERIAL_PORT="${SERIAL_PORTS[0]}"
fi

echo "Compiling the single-slot ESP32 firmware..."
arduino-cli compile \
  --fqbn "${ESP32_FQBN}" \
  --build-path "${BUILD_DIRECTORY}" \
  "${FIRMWARE_DIRECTORY}"

echo "Uploading firmware through ${ESP32_SERIAL_PORT}..."
arduino-cli upload \
  -p "${ESP32_SERIAL_PORT}" \
  --fqbn "${ESP32_FQBN}" \
  --input-dir "${BUILD_DIRECTORY}" \
  "${FIRMWARE_DIRECTORY}"

echo "Hardware demo ready: http://localhost:${DEMO_HTTP_PORT}/dashboard"
echo "Keep this terminal open. Press Control-C after the demo."
cd "${PROJECT_DIRECTORY}"
exec npm run dev -- -H "${DEMO_HOST}" -p "${DEMO_HTTP_PORT}"
