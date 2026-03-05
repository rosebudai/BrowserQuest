import { Class } from '../lib/class.js';
import WorldServer from './worldserver.js';
import ServerMap from './map.js';
import Player from './player.js';
import { resolveMap } from '../asset-resolver.js';

const LocalGameServer = Class.extend({
    init: function() {
        this.isConnected = false;
        this.nextEntityId = 100;

        this.worldServer = null;
        this.player = null;
        this.playerConnection = null;
        this.connections = {};
        this.pendingMessages = [];

        // Callback properties set directly by gameclient.js
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
    },

    connect: function() {
        const self = this;
        const serverMapPath = resolveMap('worldServer');
        const map = new ServerMap(serverMapPath);

        map.ready(function() {
            self.worldServer = new WorldServer('local-1', 1, self);
            self.worldServer.run(serverMapPath);

            self.waitForWorldReady(function() {
                self.playerConnection = self.createPlayerConnection();
                self.isConnected = true;

                if(self.onopen) {
                    self.onopen();
                }

                self.player = new Player(self.playerConnection, self.worldServer);
                self.worldServer.connect_callback(self.player);

                // Enable delivery now that connect_callback has set up
                // requestpos_callback (needed before HELLO is processed)
                self.playerConnection.enableDelivery();

                // Send "go" to trigger the client handshake
                self.deliverRawToClient("go");

                self.flushPendingMessages();
            });
        });
    },

    waitForWorldReady: function(callback) {
        const self = this;
        const checkReady = function() {
            if(self.worldServer && self.worldServer.map && self.worldServer.map.isLoaded
               && self.worldServer.zoneGroupsReady && self.worldServer.populationComplete) {
                callback();
                return;
            }
            setTimeout(checkReady, 20);
        };

        checkReady();
    },

    createPlayerConnection: function() {
        const self = this;
        const connectionId = '5' + this.nextEntityId++;
        let closed = false;
        let suppressDelivery = true; // Suppress until connect_callback runs
        const connection = {
            id: connectionId,
            remoteAddress: '127.0.0.1',
            listen_callback: null,
            close_callback: null,
            enableDelivery: function() { suppressDelivery = false; },

            listen: function(callback) {
                this.listen_callback = callback;
            },

            onClose: function(callback) {
                this.close_callback = callback;
            },

            send: function(message) {
                if(!suppressDelivery) {
                    self.deliverToClient(message);
                }
            },

            sendUTF8: function(data) {
                if(!suppressDelivery) {
                    self.deliverRawToClient(data);
                }
            },

            sendUTF: function(data) {
                this.sendUTF8(data);
            },

            close: function() {
                if(closed) {
                    return;
                }
                closed = true;
                self.isConnected = false;

                if(this.close_callback) {
                    this.close_callback();
                }

                self.removeConnection(this.id);

                if(self.onclose) {
                    self.onclose();
                }
            },

            receive: function(message) {
                if(this.listen_callback) {
                    this.listen_callback(message);
                }
            }
        };

        this.addConnection(connection);
        return connection;
    },

    send: function(data) {
        let message;

        if(!this.playerConnection) {
            this.pendingMessages.push(data);
            return;
        }

        try {
            message = JSON.parse(data);
        } catch (e) {
            if(this.onerror) {
                this.onerror(e);
            }
            return;
        }

        this.playerConnection.receive(message);
    },

    flushPendingMessages: function() {
        const self = this;

        if(!this.playerConnection || this.pendingMessages.length === 0) {
            return;
        }

        this.pendingMessages.forEach(function(data) {
            self.send(data);
        });

        this.pendingMessages = [];
    },

    close: function() {
        if(this.playerConnection) {
            this.playerConnection.close();
        } else {
            this.isConnected = false;
            if(this.onclose) {
                this.onclose();
            }
        }
    },

    addConnection: function(connection) {
        this.connections[connection.id] = connection;
    },

    removeConnection: function(id) {
        delete this.connections[id];
    },

    getConnection: function(id) {
        return this.connections[id];
    },

    getReadyState: function() {
        return this.isConnected ? 1 : 0;
    },

    deliverToClient: function(message) {
        if(this.onmessage) {
            this.onmessage({ data: JSON.stringify(message) });
        }
    },

    deliverRawToClient: function(data) {
        if(this.onmessage) {
            this.onmessage({ data: data });
        }
    }
});

export default LocalGameServer;
