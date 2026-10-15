---
name: GNOME Extension Devkit
description: Use when developing, testing or debugging a GNOME Shell extension on this machine. Covers reloading changes without logging out (GNOME Shell has no hot reload) via the Mutter DevKit nested shell, checking that an extension loaded over D-Bus, and inspecting Bluetooth/BlueZ devices with gjs and busctl.
---

# GNOME Extension Devkit

## Why this exists

GNOME Shell imports extension modules once and never unloads JavaScript, so a
code change only takes effect in a **new `gnome-shell` process**. On Wayland the
running Shell *is* the compositor, so it cannot be restarted in place and the
classic Alt+F2 `r` restart does not exist. Without the DevKit the only way to
reload is to log out and back in.

Since GNOME 49 the old `--nested` flag is gone and replaced by the Mutter
Development Kit (`--devkit`).

## Prerequisites

The viewer binary must exist at `/usr/libexec/mutter-devkit`:

```sh
sudo dnf install mutter-devel     # Fedora 43 (provides /usr/libexec/mutter-devkit)
sudo dnf install mutter-devkit    # newer Fedora
```

## Run a nested Shell (reload without logging out)

From the extension directory:

```sh
tools/gnome-shell-dev
```

The wrapper runs `dbus-run-session gnome-shell --wayland --devkit`. Without the
helper:

```sh
dbus-run-session gnome-shell --wayland --devkit
```

- The nested Shell runs with the same `$HOME`, so it loads the same extension
  directory and the same `enabled-extensions` list as the real session.
- `dbus-run-session` gives it a private session bus; the system bus (BlueZ,
  etc.) is shared.
- Iteration cycle: **edit → close the window (or `Ctrl+C`) → run again**.
- Startup takes ~20–30 s; it may not receive keyboard input, so use the mouse.

## Check that an extension actually loaded

```sh
tools/check-extension.sh [uuid]
```

Healthy output: `'state': <1.0>`, `'enabled': <true>`, `'error': <''>` and an
empty `GetExtensionErrors`.

`state` values (GNOME 49): `1` ACTIVE, `2` INACTIVE, `3` ERROR, `4` OUT_OF_DATE,
`5` DOWNLOADING, `6` INITIALIZED, `7` DEACTIVATING, `8` ACTIVATING,
`99` UNINSTALLED. In GNOME 49 the healthy value is `1` (ACTIVE), not "ENABLED".

The nested Shell has a private bus, so `gdbus --session` does **not** reach it.
For an extension loaded in the real session:

```sh
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Extensions.GetExtensionInfo <uuid>
```

## Debugging

- Syntax only: `node --check <file>.js` (does not catch missing Shell APIs).
- Real session logs: `journalctl --user -f -o cat | grep -iE '<uuid>|JS ERROR'`
- Verbose nested Shell: `G_MESSAGES_DEBUG=all tools/gnome-shell-dev`
- Verify Shell APIs against the sources of the targeted version, for example
  `https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/49.0/js/ui/extensionSystem.js`
- `Clutter.Actor.get_index` is not exposed via GI; use
  `actor.get_parent().get_children().indexOf(actor)`.

## Bluetooth devices (BlueZ)

A Bluetooth extension reads devices from `org.bluez` on the **system** bus via
`org.freedesktop.DBus.ObjectManager.GetManagedObjects`. Inspect them directly:

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

`busctl --system tree org.bluez` lists every object. Testing the data layer with
`gjs` (no Shell involved) is the fastest way to debug it.

## Pitfalls

- A freshly copied extension only appears after a new Shell process (the DevKit
  counts as one).
- Warnings from portals (accessibility bus, secrets) in the nested Shell are
  unrelated to the extension.
