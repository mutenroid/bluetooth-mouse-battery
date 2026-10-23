# Bluetooth Battery

GNOME Shell extension that shows the battery level of **every connected
Bluetooth device** in the top panel: for each device, an icon matching its type
(mouse, headset, keyboard, gamepad, phone, …) followed by its remaining
percentage. The indicator is placed in the center of the panel, immediately to
the left of the date/time.

- **Hover** the indicator to see a tooltip listing every connected device with
  its battery level.
- **Click** it to open a menu with one row per connected device (icon, name and
  battery, or "sin batería" if the device does not report one) and an entry to
  open the Bluetooth settings panel.
- **Low battery** (below 15%): the device icon and percentage turn red in the
  panel and in the menu, and a red `battery-caution` icon is shown at the start
  of the indicator so it stands out at a glance.
- With no connected device reporting a battery, the panel shows only the
  Bluetooth icon.

Device information is read from BlueZ on the system bus
(`org.bluez`, `org.freedesktop.DBus.ObjectManager`). This is the same source that
feeds the **Power → Connected Devices** section in GNOME Settings. Only devices
with `Connected = true` are shown, so stale duplicate pairings of the same
device are ignored.

> Generated with AI for personal use.
> Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
> and can maintain this code.

## Requirements

Runtime:

- GNOME Shell 49
- BlueZ exposing the devices as `org.bluez.Device1`, with the battery in
  `org.bluez.Battery1` (devices without it are listed as "sin batería")

Development only (used to test changes without logging out):

- `mutter-devel` (Fedora 43) or `mutter-devkit` (newer Fedora) — the Mutter
  Development Kit viewer at `/usr/libexec/mutter-devkit`
- `gdbus`, `busctl`, `python3` and `gjs`

## Install (from source)

```sh
mkdir -p ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
cp -r . ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr/
gnome-extensions enable bluetooth-mouse-battery@manuelamr
```

GNOME Shell only scans the extensions directory at startup, so log out and back
in if the extension is not listed yet, then enable it with:

```sh
gnome-extensions enable bluetooth-mouse-battery@manuelamr
```

## Layout

- `extension.js` — entry point, only `enable()` / `disable()`.
- `indicator.js` — panel indicator, menu and tooltip (Shell process UI).
- `lib/bluez.js` — BlueZ D-Bus access, no UI imports.
- `stylesheet.css` — low battery colour (`.bluetooth-battery-low`), loaded
  automatically by GNOME Shell.
- `tools/gnome-shell-dev` — launches a disposable nested GNOME Shell.
- `tools/check-extension.sh` — loads the extension in a nested Shell and reports
  its state over D-Bus.

Everything under `tools/` and `scripts/` is development-only and is never loaded
by GNOME Shell.

### Quick test in an ephemeral Shell

```sh
scripts/devkit.sh          # opens the devkit window and prints only extension-related log lines
scripts/devkit.sh --check  # starts it headless, reports state/errors and exits (0 = ACTIVE)
```

The full log is kept in `${TMPDIR:-/tmp}/bluetooth-battery-devkit.log`.

## Development

### Why there is no hot reload

GNOME Shell imports every extension module once and never unloads JavaScript.
Editing these files therefore has no effect on the running Shell: a **new
`gnome-shell` process** is required to read the code from disk again. On Wayland
the running Shell *is* the compositor, so it cannot be restarted in place, and
the classic Alt+F2 `r` restart does not exist. Without help, the only way to
reload is to log out and back in.

### The Mutter DevKit (review without logging out)

GNOME 49 removed the old `--nested` flag and replaced it with the **Mutter
Development Kit**. `gnome-shell --devkit` starts a *nested* GNOME Shell — a full
Shell running as a client of your real session — and hands its output to the
devkit viewer, a GTK window. Mutter spawns the viewer from the hard-coded path
`/usr/libexec/mutter-devkit` and exposes it on D-Bus as `org.gnome.Mutter.Devkit`
(app id `org.gnome.Mutter.Mdk`).

Because the nested Shell runs with your `$HOME`, it uses the same extension
directory (`~/.local/share/gnome-shell/extensions`) and the same dconf
`enabled-extensions` list as your real session. The extension under development
is therefore loaded exactly as it will be after a real login — you just get a
fresh process, and a throwaway one, every time.

#### Install the viewer

On Fedora 43 `/usr/libexec/mutter-devkit` is shipped by `mutter-devel`; newer
Fedora has a dedicated `mutter-devkit` package:

```sh
sudo dnf install mutter-devel     # Fedora 43
sudo dnf install mutter-devkit    # newer Fedora
```

The launcher below checks for the binary and tells you if it is missing.

#### Launch

```sh
tools/gnome-shell-dev
```

Optionally put it on your `PATH` and call it by name:

```sh
ln -sf "$PWD/tools/gnome-shell-dev" ~/.local/bin/gnome-shell-dev
gnome-shell-dev
```

The script is a thin wrapper around:

```sh
dbus-run-session gnome-shell --wayland --devkit
```

`dbus-run-session` gives the nested Shell a **private session bus**, so it does
not fight with your real session. The extension still talks to the **system**
bus for BlueZ, which is shared.

#### Iteration cycle

1. Edit the files.
2. Close the nested window (or `Ctrl+C` in the terminal).
3. Run `tools/gnome-shell-dev` again.

Every run is a brand-new `gnome-shell` process, so every change is picked up.

Caveats:

- Startup is slow because it is a full Shell: expect ~20–30 s, ending with a
  `GNOME Shell started at …` line in the terminal.
- The nested Shell does not always receive keyboard input, so use the mouse for
  panel and menu interaction.
- It really is a full Shell: it starts portals, the calendar server, and so on.
  Warnings from those (accessibility bus, secrets) are unrelated to the
  extension and harmless in this context.

### Checking that the extension loaded

`tools/check-extension.sh` starts a nested Shell with its own D-Bus session,
waits for it, then prints the extension info and any load errors:

```sh
tools/check-extension.sh
```

Healthy output contains `'state': <1.0>`, `'enabled': <true>` and
`'error': <''>`, with `GetExtensionErrors` returning an empty array.

`state` values (GNOME Shell 49, `js/misc/extensionUtils.js`):

| Value | State        | Meaning                        |
|-------|--------------|--------------------------------|
| 1     | ACTIVE       | loaded and running (healthy)   |
| 2     | INACTIVE     | disabled                       |
| 3     | ERROR        | failed to load; see the errors |
| 4     | OUT_OF_DATE  | `shell-version` does not match |
| 5     | DOWNLOADING  | being downloaded               |
| 6     | INITIALIZED  | scanned but not enabled        |
| 7     | DEACTIVATING | shutting down                  |
| 8     | ACTIVATING   | starting up                    |
| 99    | UNINSTALLED  | unknown extension              |

While the extension is loaded in your **real** session, you can query the same
interface on the session bus:

```sh
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Extensions.GetExtensionInfo \
    bluetooth-mouse-battery@manuelamr
```

This does not reach the nested Shell, which runs on its own private bus; that is
exactly why `tools/check-extension.sh` exists.

### Debugging

#### Logs

Real session:

```sh
journalctl --user -f -o cat | grep -iE 'mouse-battery|JS ERROR'
```

Nested Shell: its output goes to the terminal that runs `gnome-shell-dev`. To
include GLib/GJS debug messages:

```sh
G_MESSAGES_DEBUG=all tools/gnome-shell-dev
```

`tools/check-extension.sh` writes the nested Shell log to
`${TMPDIR:-/tmp}/gnome-shell-dev-check.log`.

#### Inspecting BlueZ

The extension's only data source is BlueZ, so check it directly. Every
`org.bluez.Device1` with `Connected = true` is shown; its `Icon` selects the
panel icon (`<Icon>-symbolic`, falling back to `bluetooth-symbolic`):

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
    if (!d)
        continue;
    const b = ifaces["org.bluez.Battery1"];
    print(`${d.Alias} icon=${d.Icon} connected=${d.Connected} battery=${b?.Percentage ?? "-"}`);
}
'
```

`lib/bluez.js` uses exactly these interfaces, so running this snippet under `gjs`
(no Shell involved) is the fastest way to debug the data layer.

#### Troubleshooting

- **Extension missing** from `gnome-extensions list` or from the devkit: the
  extensions directory is scanned only at startup, so a freshly copied extension
  needs a new Shell process (the devkit counts).
- **`state: 3` (ERROR)**: read the message with `GetExtensionErrors`, or run
  `tools/check-extension.sh`.
- **Only the Bluetooth icon in the panel**: no connected device reports a
  battery. Confirm the device appears under **Power → Connected Devices** in
  GNOME Settings, then re-run the BlueZ snippet above.
- **A device shows as disconnected or is missing**: BlueZ may hold several
  pairings of the same device (some devices change address when re-paired).
  Only the connected one is shown; remove stale ones with
  `bluetoothctl remove <MAC>`.
