# Mouse Battery

GNOME Shell extension that shows the battery level of the connected Bluetooth
mouse as a panel indicator: a mouse icon followed by the remaining percentage.
The indicator is placed in the center of the panel, immediately to the left of
the date/time.

- **Hover** the icon to see a tooltip with the device name and connection state.
- **Click** the icon to open a menu with the device name, the connection state
  and an entry to open the Bluetooth settings panel.

Device information is read from BlueZ on the system bus
(`org.bluez`, `org.freedesktop.DBus.ObjectManager`), which lists paired
Bluetooth devices even while they are disconnected. This is the same source that
feeds the **Power → Connected Devices** section in GNOME Settings.

> Generated with AI for personal use.
> Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
> and can maintain this code.

## Requirements

- GNOME Shell 49
- BlueZ exposing the mouse as `org.bluez.Device1` with `Icon = input-mouse` and
  a `org.bluez.Battery1` battery

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
- `indicator.js` — panel indicator and menu (shell process UI).
- `lib/bluez.js` — BlueZ D-Bus access, no UI imports.
- `tools/` — development helpers, not loaded by GNOME Shell.

## Debugging

```sh
journalctl --user -f -o cat | grep -i 'mouse-battery'
```

## Developing (no hot reload)

GNOME Shell cannot unload JavaScript once imported, so editing these files has
no effect until a new `gnome-shell` process starts. On Wayland the running Shell
(the compositor) cannot be restarted in place, so log out and back in.

To iterate faster, run an isolated development Shell that you can restart
freely. Since GNOME 49 the previous `--nested` flag was replaced by the Mutter
Development Kit.

### Setup

The devkit viewer is `/usr/libexec/mutter-devkit`, shipped by `mutter-devel`:

```sh
sudo dnf install mutter-devel
```

### Usage

```sh
gnome-shell-dev
```

`tools/gnome-shell-dev` runs `dbus-run-session gnome-shell --wayland --devkit`.
It opens a window with a nested GNOME Shell that uses your same `$HOME`, so it
loads the extensions and settings of your real session. To call it from
anywhere, install it on your `PATH`:

```sh
ln -sf "$PWD/tools/gnome-shell-dev" ~/.local/bin/gnome-shell-dev
```

To apply changes: edit the files, close the nested window (or `Ctrl+C`) and run
the script again. Every run is a fresh `gnome-shell` process that reads the code
from disk. Startup takes a while (it is a full Shell), and the nested Shell does
not always receive keyboard shortcuts — use on-screen input or the mouse.

Equivalent command, without the helper (GNOME 49+):

```sh
dbus-run-session gnome-shell --devkit --wayland
```

### Checking that the extension loaded

`tools/check-extension.sh` launches an isolated nested Shell with its own D-Bus
session, waits for it, and prints the extension state and any load errors:

```sh
tools/check-extension.sh
```

A healthy extension reports `'state': <1.0>` (enabled), `'enabled': <true>` and
`'error': <''>`. Any other `state`, or a non-empty `error`, means it failed to
load.

Alternatively, while `gnome-shell-dev` is already running, query its D-Bus:

```sh
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Extensions.GetExtensionInfo \
    bluetooth-mouse-battery@manuelamr
```
