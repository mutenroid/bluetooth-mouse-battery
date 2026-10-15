#!/bin/bash
# check-extension.sh — comprueba que la extensión carga correctamente en una
# GNOME Shell anidada (Mutter DevKit) y muestra su estado y errores por D-Bus.
#
# Uso:
#   tools/check-extension.sh [uuid]
#
# Si no se indica el uuid, se lee de metadata.json.
set -u

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
EXT_DIR=$(dirname "$SCRIPT_DIR")
UUID=${1:-$(python3 -c "import json; print(json.load(open('$EXT_DIR/metadata.json'))['uuid'])")}

if [ ! -x /usr/libexec/mutter-devkit ]; then
    echo "Falta /usr/libexec/mutter-devkit (paquete 'mutter-devel')." >&2
    exit 1
fi

LOG=${TMPDIR:-/tmp}/gnome-shell-dev-check.log
read -r ADDR BUSPID < <(dbus-daemon --session --fork --print-address=1 --print-pid=1 | tr '\n' ' ')

echo "Lanzando GNOME Shell anidada… (log: $LOG)"
DBUS_SESSION_BUS_ADDRESS="$ADDR" gnome-shell --wayland --devkit >"$LOG" 2>&1 &
SHELLPID=$!

cleanup() {
    kill "$SHELLPID" 2>/dev/null
    wait "$SHELLPID" 2>/dev/null
    kill "$BUSPID" 2>/dev/null
}
trap cleanup EXIT

call_shell() {
    gdbus call --address "$ADDR" --dest org.gnome.Shell \
        --object-path /org/gnome/Shell \
        --method "org.gnome.Shell.Extensions.$1" "${@:2}" 2>/dev/null
}

INFO=""
for _ in $(seq 1 90); do
    kill -0 "$SHELLPID" 2>/dev/null || break
    INFO=$(call_shell GetExtensionInfo "$UUID")
    [ -n "$INFO" ] && break
    sleep 2
done

if [ -z "$INFO" ]; then
    echo "No se pudo consultar '$UUID'. Revisa el log: $LOG" >&2
    exit 1
fi

echo
echo "GetExtensionInfo:"
echo "$INFO"
echo
echo "GetExtensionErrors:"
call_shell GetExtensionErrors "$UUID"
