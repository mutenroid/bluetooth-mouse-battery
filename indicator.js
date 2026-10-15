// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Button} from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';

import {BlueZClient, MOUSE_ICON} from './lib/bluez.js';

const PANEL_ICON_NAME = 'input-mouse-symbolic';
const NO_MOUSE_TEXT = 'Ningún ratón detectado';
const CONNECTED_TEXT = 'Conectado';
const DISCONNECTED_TEXT = 'Desconectado';
const SETTINGS_TEXT = 'Abrir ajustes de Bluetooth';
const SETTINGS_PANEL = 'bluetooth';
const TOOLTIP_GAP = 6;

export const MouseBatteryIndicator = GObject.registerClass({
    GTypeName: 'MouseBatteryIndicator',
}, class MouseBatteryIndicator extends Button {
    _init() {
        super._init(0.0, 'MouseBatteryIndicator');

        this._client = new BlueZClient();
        this._device = null;

        this._icon = new St.Icon({
            icon_name: PANEL_ICON_NAME,
            style_class: 'system-status-icon',
        });
        this._label = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        box.add_child(this._icon);
        box.add_child(this._label);
        this.add_child(box);

        this._nameItem = new PopupMenu.PopupMenuItem('', {reactive: false, can_focus: false});
        this._stateItem = new PopupMenu.PopupMenuItem('', {reactive: false, can_focus: false});
        const settingsItem = new PopupMenu.PopupMenuItem(SETTINGS_TEXT);
        settingsItem.connect('activate', () => this._openSettings());

        this.menu.addMenuItem(this._nameItem);
        this.menu.addMenuItem(this._stateItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(settingsItem);

        this._tooltip = new St.Label({style_class: 'dash-label', text: ''});
        this._tooltip.hide();
        Main.layoutManager.uiGroup.add_child(this._tooltip);

        this._changedId = this._client.connect('changed', () => this._sync());
        this._devicesChangedId = this._client.connect('devices-changed', () => this._sync());
        this._hoverId = this.connect('notify::hover', () => this._onHoverChanged());
        this._menuOpenId = this.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._tooltip.hide();
        });

        this._sync();
    }

    _sync() {
        this._device = this._client.listDevices().find(device => device.icon === MOUSE_ICON) ?? null;
        this._updateUi();
    }

    _updateUi() {
        if (this._device === null) {
            this._label.text = '';
            this._nameItem.label.text = NO_MOUSE_TEXT;
            this._stateItem.visible = false;
            return;
        }

        this._nameItem.label.text = this._device.name;
        this._nameItem.visible = true;
        this._stateItem.label.text = this._deviceStateText();
        this._stateItem.visible = true;
        this._label.text = this._device.connected && this._device.percentage !== null
            ? `${Math.round(this._device.percentage)}%`
            : '';
    }

    _deviceStateText() {
        if (!this._device.connected)
            return DISCONNECTED_TEXT;
        const percentage = this._device.percentage === null ? '' : ` · ${Math.round(this._device.percentage)}%`;
        return `${CONNECTED_TEXT}${percentage}`;
    }

    _onHoverChanged() {
        if (!this.hover) {
            this._tooltip.hide();
            return;
        }

        this._tooltip.text = this._device === null
            ? NO_MOUSE_TEXT
            : `${this._device.name} · ${this._deviceStateText()}`;
        this._tooltip.show();
        this._positionTooltip();
    }

    _positionTooltip() {
        const [x, y] = this.get_transformed_position();
        const [width, height] = this.get_transformed_size();
        const [tooltipWidth] = this._tooltip.get_preferred_width(-1);
        this._tooltip.set_position(
            Math.round(x + (width - tooltipWidth) / 2),
            Math.round(y + height + TOOLTIP_GAP));
    }

    _openSettings() {
        Util.spawn(['gnome-control-center', SETTINGS_PANEL]);
        this.menu.close();
    }

    destroy() {
        this.disconnect(this._hoverId);
        this._hoverId = 0;
        this.menu.disconnect(this._menuOpenId);
        this._menuOpenId = 0;
        this._client.disconnect(this._changedId);
        this._client.disconnect(this._devicesChangedId);
        this._changedId = 0;
        this._devicesChangedId = 0;
        this._client.destroy();
        this._client = null;
        Main.layoutManager.uiGroup.remove_child(this._tooltip);
        this._tooltip.destroy();
        this._tooltip = null;
        super.destroy();
    }
});
