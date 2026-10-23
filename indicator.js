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

import {BlueZClient} from './lib/bluez.js';

const IDLE_ICON_NAME = 'bluetooth-active-symbolic';
const FALLBACK_ICON_NAME = 'bluetooth-symbolic';
const NO_DEVICES_TEXT = 'Ningún dispositivo Bluetooth conectado';
const NO_BATTERY_TEXT = 'sin batería';
const SETTINGS_TEXT = 'Abrir ajustes de Bluetooth';
const PREFERENCES_TEXT = 'Preferencias del widget';
const SETTINGS_PANEL = 'bluetooth';
const TOOLTIP_GAP = 6;
const LOW_BATTERY_ICON_NAME = 'battery-caution-symbolic';
const LOW_BATTERY_STYLE_CLASS = 'bluetooth-battery-low';

function deviceIconName(device) {
    return device.icon ? `${device.icon}-symbolic` : FALLBACK_ICON_NAME;
}

function batteryText(device) {
    return device.percentage === null ? NO_BATTERY_TEXT : `${Math.round(device.percentage)}%`;
}

export const BluetoothBatteryIndicator = GObject.registerClass({
    GTypeName: 'BluetoothBatteryIndicator',
}, class BluetoothBatteryIndicator extends Button {
    _init(extension) {
        super._init(0.0, 'BluetoothBatteryIndicator');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._client = new BlueZClient();
        this._devices = [];

        this._box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this.add_child(this._box);

        this._devicesSection = new PopupMenu.PopupMenuSection();
        const settingsItem = new PopupMenu.PopupMenuItem(SETTINGS_TEXT);
        settingsItem.connect('activate', () => this._openSettings());
        const preferencesItem = new PopupMenu.PopupMenuItem(PREFERENCES_TEXT);
        preferencesItem.connect('activate', () => this._openPreferences());

        this.menu.addMenuItem(this._devicesSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(settingsItem);
        this.menu.addMenuItem(preferencesItem);

        this._tooltip = new St.Label({style_class: 'dash-label', text: ''});
        this._tooltip.hide();
        Main.layoutManager.uiGroup.add_child(this._tooltip);

        this._changedId = this._client.connect('changed', () => this._sync());
        this._devicesChangedId = this._client.connect('devices-changed', () => this._sync());
        this._settingsChangedId = this._settings.connect('changed::low-battery-threshold', () => this._sync());
        this._hoverId = this.connect('notify::hover', () => this._onHoverChanged());
        this._menuOpenId = this.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._tooltip.hide();
        });

        this._sync();
    }

    _isLowBattery(device) {
        return device.percentage !== null &&
            device.percentage < this._settings.get_int('low-battery-threshold');
    }

    _sync() {
        this._devices = this._client.listDevices()
            .filter(device => device.connected)
            .sort((a, b) => a.name.localeCompare(b.name));
        this._updatePanel();
        this._updateMenu();
    }

    _updatePanel() {
        this._box.destroy_all_children();

        const withBattery = this._devices.filter(device => device.percentage !== null);
        if (withBattery.length === 0) {
            this._box.add_child(new St.Icon({
                icon_name: IDLE_ICON_NAME,
                style_class: 'system-status-icon',
            }));
            return;
        }

        if (withBattery.some(device => this._isLowBattery(device))) {
            this._box.add_child(new St.Icon({
                icon_name: LOW_BATTERY_ICON_NAME,
                style_class: `system-status-icon ${LOW_BATTERY_STYLE_CLASS}`,
            }));
        }

        for (const device of withBattery) {
            const icon = new St.Icon({
                icon_name: deviceIconName(device),
                fallback_icon_name: FALLBACK_ICON_NAME,
                style_class: 'system-status-icon',
            });
            const label = new St.Label({
                text: batteryText(device),
                y_align: Clutter.ActorAlign.CENTER,
            });
            if (this._isLowBattery(device)) {
                icon.add_style_class_name(LOW_BATTERY_STYLE_CLASS);
                label.add_style_class_name(LOW_BATTERY_STYLE_CLASS);
            }
            this._box.add_child(icon);
            this._box.add_child(label);
        }
    }

    _updateMenu() {
        this._devicesSection.removeAll();

        if (this._devices.length === 0) {
            this._devicesSection.addMenuItem(
                new PopupMenu.PopupMenuItem(NO_DEVICES_TEXT, {reactive: false, can_focus: false}));
            return;
        }

        for (const device of this._devices) {
            const item = new PopupMenu.PopupImageMenuItem(
                `${device.name} · ${batteryText(device)}`,
                deviceIconName(device),
                {reactive: false, can_focus: false});
            if (this._isLowBattery(device))
                item.add_style_class_name(LOW_BATTERY_STYLE_CLASS);
            this._devicesSection.addMenuItem(item);
        }
    }

    _tooltipText() {
        if (this._devices.length === 0)
            return NO_DEVICES_TEXT;
        return this._devices.map(device => `${device.name} · ${batteryText(device)}`).join('\n');
    }

    _onHoverChanged() {
        if (!this.hover) {
            this._tooltip.hide();
            return;
        }

        this._tooltip.text = this._tooltipText();
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

    _openPreferences() {
        this._extension.openPreferences();
        this.menu.close();
    }

    destroy() {
        this._settings.disconnect(this._settingsChangedId);
        this._settingsChangedId = 0;
        this._settings = null;
        this._extension = null;
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
