// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BluetoothBatteryIndicator} from './indicator.js';

export default class BluetoothBatteryExtension extends Extension {
    enable() {
        this._indicator = new BluetoothBatteryIndicator(this);

        const {dateMenu} = Main.panel.statusArea;
        const position = dateMenu
            ? dateMenu.container.get_parent().get_children().indexOf(dateMenu.container)
            : 0;
        Main.panel.addToStatusArea(this.uuid, this._indicator, position, 'center');
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
