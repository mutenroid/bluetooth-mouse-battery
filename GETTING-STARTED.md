# Getting started on a new machine

This repository **is** the GNOME Shell extension directory. Clone it directly
into the extensions path so GNOME Shell finds it, then open OpenCode inside it.

## 0. Prerequisites

- Linux with **GNOME Shell 49** on a **Wayland** session
- `git` and network access; `gh` (GitHub CLI) only if you want to push
- BlueZ with the mouse already **paired**

The repository is **public**, so the clone needs no authentication. `gh` is only
needed if you also want to `git push`.

## 1. Authenticate (optional, only to push)

Cloning works without credentials. To push, authenticate once per machine:

```sh
gh auth login && gh auth setup-git
```

`gh auth login` opens a browser device flow. `gh auth setup-git` installs the git
credential helper; without it `git push` fails trying to prompt for a username
and password.

## 2. Clone into the exact path GNOME Shell scans

```sh
mkdir -p ~/.local/share/gnome-shell/extensions
git clone https://github.com/mutenroid/bluetooth-mouse-battery.git \
    ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
```

- The destination **must not already exist** (delete or move a previous manual
  copy first).
- SSH alternative: `git@github.com:mutenroid/bluetooth-mouse-battery.git`.
- The directory name must be exactly `bluetooth-mouse-battery@manuelamr`: that is
  the extension uuid.

## 3. Open OpenCode in the repo

```sh
cd ~/.local/share/gnome-shell/extensions/bluetooth-mouse-battery@manuelamr
opencode
```

`AGENTS.md`, `README.md` and the `gnome-extension-devkit` skill are
loaded automatically. Paste this as the first prompt:

> Read AGENTS.md and README.md, then do the machine setup described
> in `GETTING-STARTED.md` section 4 by running `tools/bootstrap.sh`. Tell me
> which steps need a manual action (sudo, logout, browser), then verify the
> extension with `tools/check-extension.sh`.

## 4. Machine setup

```sh
tools/bootstrap.sh
```

The script is idempotent and only changes things it owns. It checks the GNOME
Shell version and session type, checks the DevKit viewer, symlinks
`tools/gnome-shell-dev` into `~/.local/bin`, sets the local git identity, and
verifies the GitHub authentication and credential helper.

It does **not** use `sudo`; when something needs it, it prints the exact command.

## 5. Enable the extension and verify

```sh
gnome-extensions enable bluetooth-mouse-battery@manuelamr
```

GNOME Shell scans the extensions directory only at startup, so on a fresh machine
**log out and back in once** before the extension can be enabled and seen.

Then verify without logging out again:

```sh
tools/check-extension.sh     # expects 'state': <1.0> (ACTIVE)
tools/gnome-shell-dev        # nested Shell to test interactively
```

## 6. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `git push` asks for username and password | No credential helper. Run `gh auth login && gh auth setup-git`, or use SSH. |
| `fatal: destination path ... already exists` | A previous copy is there. Move it away first. |
| Extension not in `gnome-extensions list` | The extensions directory is scanned at startup; log out and back in. |
| `tools/gnome-shell-dev` says the viewer is missing | Install the DevKit viewer: `sudo dnf install mutter-devel` (Fedora 43) or `mutter-devkit` (newer Fedora). |
| Panel shows nothing | Check the mouse under **Power → Connected Devices** in GNOME Settings, and run the BlueZ snippet in `AGENTS.md`. |
