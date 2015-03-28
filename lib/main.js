"use strict";

var sonos = require('sonos');
var portastic = require('portastic');
var ip = require('ip');
var alsa = require('alsa');
var Nicercast = require('nicercast');
var flags = require('flags');

flags.defineBoolean('diagnostics', false, 'run diagnostics utility');
flags.defineBoolean('version', false, 'return version number');
flags.defineInteger('timeout', 5, 'disconnect timeout (in seconds)');
flags.defineBoolean('verbose', false, 'show verbose output');
flags.parse();

if (flags.get('version')) {

    var pjson = require('../package.json');
    console.log(pjson.version);

} else if (flags.get('diagnostics')) {

    var diag = require('./diagnostics');
    diag();

} else {

    console.log('Searching for Sonos devices on network...');
    sonos.LogicalDevice.search(function (err, devices) {
        devices.forEach(function (device) {

            device.getZoneAttrs(function (err, zoneAttrs) {
                if (err) throw err;

                var deviceName = zoneAttrs.CurrentZoneName;

                console.log('Setting up AirSonos for', deviceName, '{' + device.host + ':' + device.port + '}');

                var clientName = 'AirSonos';

                portastic.find({
                    min: 8000,
                    max: 8050,
                    retrieve: 1
                }, function (err, port) {
                    var streamLineIn = new alsa.Capture;
                    var icecastServer = new Nicercast(streamLineIn, {
                        name: 'AirSonos @ ' + deviceName
                    });
                    icecastServer.start(port);

                    device.play({
                        uri: 'x-rincon-mp3radio://' + ip.address() + ':' + port + '/listen.m3u',
                        metadata: '<?xml version="1.0"?>' +
                        '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">' +
                        '<item id="R:0/0/49" parentID="R:0/0" restricted="true">' +
                        '<dc:title>' + clientName + '</dc:title>' +
                        '<upnp:class>object.item.audioItem.audioBroadcast</upnp:class>' +
                        '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON65031_</desc>' +
                        '</item>' +
                        '</DIDL-Lite>'
                    });
                });
            });
        });
    });
}
