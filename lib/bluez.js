// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

const BUS_NAME = 'org.bluez';
const MANAGER_PATH = '/';
const MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';
const DEVICE_INTERFACE = 'org.bluez.Device1';
const BATTERY_INTERFACE = 'org.bluez.Battery1';

const DEVICE_PROPERTIES = ['Alias', 'Name', 'Connected', 'Icon'];
const BATTERY_PROPERTIES = ['Percentage'];

export const BlueZClient = GObject.registerClass({
    GTypeName: 'BluetoothBatteryBlueZClient',
    Signals: {
        'changed': {param_types: [GObject.TYPE_STRING]},
        'devices-changed': {},
    },
}, class BlueZClient extends GObject.Object {
    _init() {
        super._init();

        this._manager = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SYSTEM,
            Gio.DBusProxyFlags.NONE,
            null,
            BUS_NAME,
            MANAGER_PATH,
            MANAGER_INTERFACE,
            null);

        this._managerSignalId = this._manager.connect('g-signal',
            (_proxy, _sender, signal) => {
                if (signal === 'InterfacesAdded' || signal === 'InterfacesRemoved')
                    this.emit('devices-changed');
            });

        this._propertiesSignalId = Gio.DBus.system.signal_subscribe(
            BUS_NAME,
            PROPERTIES_INTERFACE,
            'PropertiesChanged',
            null,
            null,
            Gio.DBusSignalFlags.NONE,
            (_connection, _sender, path, _interface, _signal, parameters) => {
                if (this._isRelevantChange(parameters))
                    this.emit('changed', path);
            });
    }

    listDevices() {
        const reply = this._manager.call_sync('GetManagedObjects', null, Gio.DBusCallFlags.NONE, -1, null);
        const objects = reply.recursiveUnpack()[0];

        const devices = [];
        for (const [path, interfaces] of Object.entries(objects)) {
            const device = interfaces[DEVICE_INTERFACE];
            if (!device)
                continue;

            const battery = interfaces[BATTERY_INTERFACE];
            devices.push({
                path,
                name: device.Alias || device.Name || '',
                icon: device.Icon ?? '',
                connected: device.Connected ?? false,
                percentage: battery?.Percentage ?? null,
            });
        }
        return devices;
    }

    _isRelevantChange(parameters) {
        const [interfaceName, changed] = parameters.deepUnpack();
        if (interfaceName === DEVICE_INTERFACE)
            return DEVICE_PROPERTIES.some(name => name in changed);
        if (interfaceName === BATTERY_INTERFACE)
            return BATTERY_PROPERTIES.some(name => name in changed);
        return false;
    }

    destroy() {
        this._manager.disconnect(this._managerSignalId);
        this._managerSignalId = 0;
        this._manager = null;

        Gio.DBus.system.signal_unsubscribe(this._propertiesSignalId);
        this._propertiesSignalId = 0;
    }
});
