// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BluetoothBatteryPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({icon_name: 'bluetooth-active-symbolic'});
        const group = new Adw.PreferencesGroup({
            title: 'Batería baja',
            description: 'Los dispositivos por debajo de este porcentaje se muestran en rojo.',
        });

        const row = new Adw.SpinRow({
            title: 'Umbral de batería baja (%)',
            adjustment: new Gtk.Adjustment({lower: 1, upper: 100, step_increment: 1, page_increment: 5}),
        });
        settings.bind('low-battery-threshold', row, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);

        page.add(group);
        window.add(page);
    }
}
