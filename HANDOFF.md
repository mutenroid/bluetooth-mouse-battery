# Handoff — Mouse Battery (extensión de GNOME Shell 49)

Documento de traspaso para continuar el trabajo en otro equipo. Resume el
objetivo, las decisiones, el estado actual, el entorno de referencia y el kit de
desarrollo/depuración.

---

## 1. Objetivo

Extensión de GNOME Shell que muestra en el panel superior la batería del ratón
Bluetooth conectado: **icono de ratón + porcentaje**, colocado en el **centro del
panel, justo a la izquierda de la fecha/hora**.

- **Hover**: tooltip con nombre del dispositivo y estado de conexión.
- **Clic**: menú con nombre, estado y una entrada para abrir los ajustes de
  Bluetooth.

## 2. Estado actual

Verificado y funcionando:

- La extensión **carga sin errores** en un proceso `gnome-shell` nuevo:
  `state: 1` (ACTIVE), `enabled: true`, `error: ''`, `GetExtensionErrors: []`.
- Detección por BlueZ comprobada en vivo:
  `BluetoothMouse3600 connected=true battery=42`, `Icon=input-mouse`.
- Confirmado visualmente por el usuario en la Shell anidada del devkit
  (`42%` a la izquierda del reloj, tooltip y menú funcionando).

Pendiente de confirmar:

- La **sesión real** sigue con el código cargado en el último login. El arreglo
  ya está en disco y verificado, pero para verlo en el escritorio real hay que
  **cerrar y abrir sesión** (en Wayland no se puede reiniciar la Shell en
  caliente).

## 3. Entorno de referencia

- Fedora 43 Workstation, sesión **Wayland**
- GNOME Shell **49.10**, mutter **49.8**, BlueZ **5.87**
- La API de la Shell se verificó contra las fuentes de GitLab (`49.0`)

## 4. Repositorio

- Remoto: `https://github.com/mutenroid/bluetooth-mouse-battery` (**público**)
- Ramas: `main` (con tracking `origin/main`)
- Protocolo git: HTTPS (gestionado por `gh`)
- Identidad de git: `mutenroid <mutenroid@gmail.com>`

En el equipo de referencia el repo **es** el propio directorio de la extensión:

```
~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr/
```

## 5. Arquitectura y decisiones

- **BlueZ como fuente única** (`org.bluez` vía
  `org.freedesktop.DBus.ObjectManager`), en vez de UPower. Motivo: UPower no
  expone un estado de conexión fiable, mientras que BlueZ **mantiene listados los
  dispositivos emparejados aunque estén desconectados**, así que siempre hay
  nombre + "Desconectado" disponible. Es la misma fuente que alimenta
  **Energía → Dispositivos conectados** en Ajustes.
- **Identificación del ratón**: `Icon == "input-mouse"`.
- **Datos**: nombre de `Alias`; batería de `org.bluez.Battery1.Percentage`;
  estado de `Connected`.
- **Actualizaciones en vivo**: una única suscripción a `PropertiesChanged`
  filtrada a `Alias/Name/Connected/Icon` y `Percentage` (ignora el ruido de
  `RSSI`), más `InterfacesAdded` / `InterfacesRemoved`.
- **Tooltip manual**: no hay API de tooltip en la Shell; se usa un
  `St.Label` con `style_class: 'dash-label'` añadido a
  `Main.layoutManager.uiGroup` y disparado por `notify::hover`.
- **Ajustes de Bluetooth**: `Util.spawn(['gnome-control-center', 'bluetooth'])`.
- **Colocación**: caja central, a la izquierda del reloj, calculando la posición
  con `dateMenu.container.get_parent().get_children().indexOf(dateMenu.container)`
  (ver gotcha en §10).
- `uuid`: `bluetooth-mouse-battery@manuelamr`; `shell-version: ["49"]`;
  sin GSettings ni preferencias.

## 6. Ficheros

| Ruta | Rol |
|------|-----|
| `extension.js` | Punto de entrada: solo `enable()` / `disable()` |
| `indicator.js` | Indicador de panel, menú y tooltip (proceso de la Shell) |
| `lib/bluez.js` | Acceso a BlueZ por D-Bus, sin importaciones de UI |
| `metadata.json` | uuid, nombre, `shell-version` |
| `README.md` | Documentación, instalación, devkit y depuración |
| `tools/gnome-shell-dev` | Lanza una GNOME Shell anidada (devkit) |
| `tools/check-extension.sh` | Comprueba por D-Bus que la extensión carga |
| `.gitignore` | Ignora `*.log` |

Todos los `.js` llevan el aviso de "generado con IA para uso personal; no subir a
extensions.gnome.org salvo que entiendas el código y lo mantengas". **Mantener.**

## 7. Dispositivo de prueba (BlueZ)

```
BlueZ:  /org/bluez/hci0/dev_DD_0C_9B_B0_F0_78
Alias:  BluetoothMouse3600
Icon:   input-mouse
Connected: true
Battery1.Percentage: 42
```

(Ruta antigua de UPower, ya no se usa:
`/org/freedesktop/UPower/devices/mouse_dev_DD_0C_9B_B0_F0_78`.)

## 8. Kit de desarrollo (Mutter DevKit)

**Por qué**: no existe recarga en caliente. GNOME Shell importa los módulos una
sola vez y no descarga JavaScript, así que un cambio solo surte efecto en un
proceso `gnome-shell` **nuevo**. En Wayland la Shell es el compositor y no se
puede reiniciar en caliente. El devkit permite abrir una Shell anidada
desechable y relanzarla tantas veces como haga falta **sin cerrar sesión**.

**Instalación** (Fedora 43; en Fedora nuevo el paquete es `mutter-devkit`):

```sh
sudo dnf install mutter-devel
```

Provee el visor en `/usr/libexec/mutter-devkit`. Mutter lo lanza desde esa ruta
fija cuando se usa `--devkit` (D-Bus `org.gnome.Mutter.Devkit`, app
`org.gnome.Mutter.Mdk`).

**Lanzador** `tools/gnome-shell-dev` (envoltorio de
`dbus-run-session gnome-shell --wayland --devkit`):

```sh
ln -sf "$PWD/tools/gnome-shell-dev" ~/.local/bin/gnome-shell-dev
gnome-shell-dev
```

La Shell anidada usa tu mismo `$HOME`, así que carga las mismas extensiones
(`~/.local/share/gnome-shell/extensions`) y la misma lista de
`enabled-extensions` que la sesión real. `dbus-run-session` le da un **bus de
sesión privado**; BlueZ sigue por el bus **de sistema**.

**Ciclo de iteración**: editar → cerrar la ventana anidada (o `Ctrl+C`) →
`gnome-shell-dev` otra vez.

**Avisos**: tarda ~20–30 s en arrancar; el teclado no siempre llega a la Shell
anidada (usar el ratón); los avisos de portales (bus de accesibilidad, secrets)
son ajenos a la extensión.

## 9. Depuración

Comprobar que carga (lanza una Shell anidada con bus propio):

```sh
tools/check-extension.sh
```

Logs de la sesión real:

```sh
journalctl --user -f -o cat | grep -iE 'mouse-battery|JS ERROR'
```

Logs de la Shell anidada: en la terminal que ejecuta `gnome-shell-dev`. Para ver
también mensajes de GLib/GJS:

```sh
G_MESSAGES_DEBUG=all tools/gnome-shell-dev
```

`tools/check-extension.sh` deja el log en `${TMPDIR:-/tmp}/gnome-shell-dev-check.log`.

Inspeccionar el ratón y su batería directamente en BlueZ:

```sh
busctl --system tree org.bluez
```

```sh
gjs -c '
const Gio = imports.gi.Gio;
const r = Gio.DBus.system.call_sync("org.bluez", "/",
    "org.freedesktop.DBus.ObjectManager", "GetManagedObjects",
    null, null, Gio.DBusCallFlags.NONE, -1, null);
for (const [path, ifaces] of Object.entries(r.recursiveUnpack()[0])) {
    const d = ifaces["org.bluez.Device1"];
    if (!d || d.Icon !== "input-mouse")
        continue;
    const b = ifaces["org.bluez.Battery1"];
    print(`${d.Alias} connected=${d.Connected} battery=${b?.Percentage ?? "?"}`);
}
'
```

`lib/bluez.js` usa estas mismas interfaces, así que probar este snippet con `gjs`
(sin Shell) es la vía más rápida para depurar la capa de datos.

## 10. Hechos técnicos verificados (gotchas)

- **Sin recarga en caliente**: hace falta un proceso `gnome-shell` nuevo.
- **`Clutter.Actor.get_index` NO está expuesto por GI**; usar
  `actor.get_parent().get_children().indexOf(actor)`. (El bug original
  `dateMenu.container.get_index is not a function` se corrigió así.)
- **Estados de extensión en GNOME 49** (`js/misc/extensionUtils.js`):
  `1=ACTIVE, 2=INACTIVE, 3=ERROR, 4=OUT_OF_DATE, 5=DOWNLOADING,
  6=INITIALIZED, 7=DEACTIVATING, 8=ACTIVATING, 99=UNINSTALLED`.
  En GNOME 49 el valor sano es `1` (ACTIVE), no "ENABLED".
- `.popup-inactive-menu-item` **no** está atenuado → un `PopupMenuItem` con
  `reactive: false` sirve para filas informativas.
- `.dash-label` es la clase de estilo de los tooltips.
- `Main.panel.addToStatusArea(role, indicator, position, box)`; `box` por defecto
  es `right`.
- El bus de sesión anidado es privado → `gdbus --session` **no** llega a la Shell
  anidada; para eso está `tools/check-extension.sh`.
- La captura por D-Bus (`org.gnome.Shell.Screenshot`) está denegada en este
  entorno; `gresource` no está instalado en el host.

## 11. Puesta en marcha en el equipo nuevo

Requisitos: GNOME Shell **49** en Wayland, BlueZ, y el ratón emparejado.

1. Clonar directamente en el directorio de extensiones (el nombre del directorio
   debe ser el uuid):

   ```sh
   git clone https://github.com/mutenroid/bluetooth-mouse-battery.git \
       ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
   ```

2. Habilitar y recargar la Shell (cerrar/abrir sesión):

   ```sh
   gnome-extensions enable bluetooth-mouse-battery@manuelamr
   ```

3. Kit de desarrollo:

   ```sh
   sudo dnf install mutter-devel
   ln -sf "$PWD/tools/gnome-shell-dev" ~/.local/bin/gnome-shell-dev
   ```

4. Identidad git y `gh` (si vas a hacer push desde ahí):

   ```sh
   cd ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
   git config user.name  "mutenroid"
   git config user.email "mutenroid@gmail.com"
   gh auth login
   ```

5. Comprobar que carga: `tools/check-extension.sh` (esperado `state: 1`).

## 12. Pendiente / próximos pasos

- [ ] Cerrar y abrir sesión en el equipo de referencia para cargar el arreglo en
      la sesión real (ya validado en la Shell anidada).
- [ ] (Opcional) Reaccionar a que el ratón desaparezca o cambie de icono.
- [ ] (Opcional) Afinar el estado desconectado (ahora el porcentaje se oculta y
      el tooltip/menú muestran "Desconectado").
- [ ] (Opcional) Hacer público el repo:
      `gh repo edit mutenroid/bluetooth-mouse-battery --visibility public`.
- [ ] (Opcional) Si algún día se publica en EGO: quitar el aviso de IA de los
      `.js` **solo** si se entiende y se va a mantener el código.

## 13. Referencia rápida de comandos

```sh
# Lanzar Shell anidada para probar cambios
gnome-shell-dev

# Comprobar que la extensión carga (state 1 = ACTIVE)
tools/check-extension.sh

# Logs de la sesión real
journalctl --user -f -o cat | grep -iE 'mouse-battery|JS ERROR'

# Subir cambios
cd ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
git add -A && git commit -m "..." && git push
```
