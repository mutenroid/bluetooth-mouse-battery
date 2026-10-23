# AGENTS.md

Guidance for OpenCode when working in this repository. Deeper material lives in
`README.md` (usage, development, debugging) and `GETTING-STARTED.md` (first run
on a new machine).

**On a machine where the extension is not set up yet**, follow
`GETTING-STARTED.md` and run `tools/bootstrap.sh` before anything else.

## What this is

A GNOME Shell 49 extension (uuid `bluetooth-mouse-battery@manuelamr`, display
name "Bluetooth Battery") that shows the battery of **every connected Bluetooth
device** in the top panel: per device, an icon matching its BlueZ `Icon`
followed by the percentage, in the center box immediately left of the
date/time. Below 15% the device turns red and a red `battery-caution` icon is
prepended to the indicator. Device data comes from BlueZ over D-Bus.

The uuid and repository name still say "mouse" for historical reasons; changing
the uuid would require reinstalling the extension, so keep it.

## Layout

- `extension.js` — entry point, only `enable()` / `disable()`.
- `indicator.js` — panel indicator, menu and tooltip (Shell UI process).
- `lib/bluez.js` — BlueZ D-Bus access. Must not import UI libraries (`St`,
  `Clutter`, `Gtk`, `Gdk`, `Adw`).
- `stylesheet.css` — `.bluetooth-battery-low` (red), loaded automatically.
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
scripts/devkit.sh          # nested Shell + filtered extension log (same as the other extensions)
scripts/devkit.sh --check  # headless state + log check; exit 0 when ACTIVE
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
- BlueZ is the single source of truth (not UPower). Every `org.bluez.Device1`
  with `Connected = true` is shown; battery from
  `org.bluez.Battery1.Percentage`, name from `Alias`, icon from
  `<Icon>-symbolic` with `bluetooth-symbolic` as fallback.
- BlueZ can hold several pairings of the same device (some change MAC when
  re-paired); never pick "the first device of a type", always filter by
  `Connected`.
- `PopupImageMenuItem`'s icon is private (`_icon`); style the whole item, the
  colour is inherited by the icon and label.

## Git

- Public repo: `https://github.com/mutenroid/bluetooth-mouse-battery`.
- Commit author on every machine:
  `mutenroid <1957796+mutenroid@users.noreply.github.com>` (GitHub noreply alias,
  so the personal email is never published):
  `git config user.name mutenroid`,
  `git config user.email 1957796+mutenroid@users.noreply.github.com`.
- Never commit secrets.
