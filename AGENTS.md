# AGENTS.md

Guidance for OpenCode when working in this repository. Deeper material lives in
`README.md` (usage, development, debugging) and `HANDOFF.md` (current state and
next steps).

## What this is

A GNOME Shell 49 extension (uuid `bluetooth-mouse-battery@manuelamr`) that shows
the connected Bluetooth mouse battery in the top panel: a mouse icon followed by
the percentage, in the center box immediately left of the date/time. Device data
comes from BlueZ over D-Bus.

## Layout

- `extension.js` — entry point, only `enable()` / `disable()`.
- `indicator.js` — panel indicator, menu and tooltip (Shell UI process).
- `lib/bluez.js` — BlueZ D-Bus access. Must not import UI libraries (`St`,
  `Clutter`, `Gtk`, `Gdk`, `Adw`).
- `tools/` — development helpers, never loaded by GNOME Shell.

## Verify changes

Syntax first:

```sh
node --check extension.js && node --check indicator.js && node --check lib/bluez.js
```

Syntax alone is not enough: missing Shell APIs only fail at runtime. Verify the
extension actually loads with the Mutter DevKit nested Shell:

```sh
tools/gnome-shell-dev      # opens a nested GNOME Shell window; close it to stop
tools/check-extension.sh   # headless; expects 'state': <1.0> (ACTIVE)
```

## Development constraints

- **No hot reload.** GNOME Shell never unloads JavaScript, so a change needs a
  new `gnome-shell` process. On Wayland the Shell is the compositor, so iterate
  with the nested Shell (`tools/gnome-shell-dev`) instead of logging out.
- Target **GNOME Shell 49 only** (`metadata.json` → `shell-version`). Do not add
  multi-version shims, `typeof` guards or optional chaining for Shell APIs; the
  APIs must not be called with optional chaining or `?.()`. Write for 49.
- Follow the GNOME extension best practices (load in the global instructions):
  no try/catch around calls that do not throw, no `_destroyed`/`_enabled` flags,
  each class owns and cleans its own resources, `destroy()` in order
  (sources → signals → children → `super.destroy()`).
- Keep the AI-generated notice at the top of every `.js` file. Remove it only
  when intentionally publishing to extensions.gnome.org.

## Conventions

- User-facing strings are in Spanish (`Conectado`, `Desconectado`, …).
- Verify Shell APIs against the GitLab `49.0` sources before using them; several
  `Clutter.Actor` methods are not exposed through GObject Introspection.

## Known gotchas

- `Clutter.Actor.get_index` is not exposed by GI. Use
  `actor.get_parent().get_children().indexOf(actor)`.
- `ExtensionState` in GNOME 49: `1=ACTIVE` (healthy), `2=INACTIVE`, `3=ERROR`,
  `4=OUT_OF_DATE`, `5=DOWNLOADING`, `6=INITIALIZED`, `7=DEACTIVATING`,
  `8=ACTIVATING`, `99=UNINSTALLED`.
- The nested Shell runs on a private session bus, so `gdbus --session` does not
  reach it. Use `tools/check-extension.sh`.
- BlueZ is the single source of truth (not UPower). The mouse is the
  `org.bluez.Device1` whose `Icon == "input-mouse"`; battery comes from
  `org.bluez.Battery1.Percentage`, name from `Alias`.

## Git

- Private repo: `https://github.com/mutenroid/bluetooth-mouse-battery`.
- Commit author on every machine: `mutenroid <mutenroid@gmail.com>`
  (`git config user.name mutenroid`, `git config user.email mutenroid@gmail.com`).
- Never commit secrets.
