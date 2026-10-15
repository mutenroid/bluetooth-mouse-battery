#!/bin/bash
# bootstrap.sh — prepares a new machine to develop this extension.
# Idempotent: safe to run more than once. Never uses sudo.
set -u

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
UUID=$(python3 -c "import json; print(json.load(open('$REPO_DIR/metadata.json'))['uuid'])")
EXT_PARENT="$HOME/.local/share/gnome-shell/extensions"
BIN_DIR="$HOME/.local/bin"

step() { printf '\n== %s ==\n' "$1"; }
ok()   { printf '  ok:        %s\n' "$1"; }
warn() { printf '  ATENCION:  %s\n' "$1"; }

step "Environment"
if command -v gnome-shell >/dev/null; then
    ok "gnome-shell $(gnome-shell --version | awk '{print $3}')"
else
    warn "gnome-shell not found; this extension requires GNOME Shell 49"
fi
ok "session type: ${XDG_SESSION_TYPE:-unknown}"

step "Extension location"
expected="$EXT_PARENT/$UUID"
if [ "$REPO_DIR" = "$expected" ]; then
    ok "repo is at $expected"
else
    warn "repo is at $REPO_DIR but GNOME Shell expects $expected"
    warn "clone it there, or link it: ln -s \"$REPO_DIR\" \"$expected\""
fi

step "Mutter DevKit viewer"
if [ -x /usr/libexec/mutter-devkit ]; then
    ok "/usr/libexec/mutter-devkit present"
else
    warn "missing /usr/libexec/mutter-devkit"
    warn "Fedora 43:    sudo dnf install mutter-devel"
    warn "newer Fedora: sudo dnf install mutter-devkit"
fi

step "gnome-shell-dev on PATH"
mkdir -p "$BIN_DIR"
ln -sf "$REPO_DIR/tools/gnome-shell-dev" "$BIN_DIR/gnome-shell-dev"
ok "$BIN_DIR/gnome-shell-dev -> $REPO_DIR/tools/gnome-shell-dev"
case ":$PATH:" in
    *":$BIN_DIR:"*) ok "$BIN_DIR is on PATH" ;;
    *) warn "$BIN_DIR is not on PATH; add it in your shell profile" ;;
esac

step "Git identity"
if [ -z "$(git -C "$REPO_DIR" config user.email)" ]; then
    git -C "$REPO_DIR" config user.name "mutenroid"
    git -C "$REPO_DIR" config user.email "mutenroid@gmail.com"
    ok "local identity set to mutenroid <mutenroid@gmail.com>"
else
    ok "already set: $(git -C "$REPO_DIR" config user.email)"
fi

step "GitHub authentication"
if ! command -v gh >/dev/null; then
    warn "gh not installed (only needed to clone/push the private repo)"
elif gh auth status >/dev/null 2>&1; then
    ok "gh logged in as $(gh api user --jq .login 2>/dev/null || echo '?')"
    if git config --global --get-regexp 'credential\.https://github\.com' >/dev/null 2>&1; then
        ok "git credential helper configured"
    else
        warn "git credential helper missing; run: gh auth setup-git"
    fi
else
    warn "gh not authenticated; run: gh auth login && gh auth setup-git"
fi

step "Manual next steps"
printf '  1. gnome-extensions enable %s\n' "$UUID"
printf '  2. Log out and back in once so the Shell scans the extension\n'
printf '  3. Verify: %s/tools/check-extension.sh\n' "$REPO_DIR"
