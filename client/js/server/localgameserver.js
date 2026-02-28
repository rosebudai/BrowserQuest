import WorldServer from './worldserver.js';
import ServerMap from './map.js';
import Player from './player.js';

/* Uses global Class */
var LocalGameServer = Class.extend({
    init: function() {
        this.isConnected = false;
        this.callbacks = {};
        this.nextEntityId = 100;

        this.worldServer = null;
        this.player = null;
        this.playerConnection = null;
        this.connections = {};
        this.pendingMessages = [];
    },

    connect: function() {
        var self = this;
        var map = new ServerMap('maps/world_server.json');

        map.ready(function() {
            self.worldServer = new WorldServer('local-1', 1, self);
            self.worldServer.run('maps/world_server.json');

            self.waitForWorldReady(function() {
                self.playerConnection = self.createPlayerConnection();
                self.isConnected = true;

                if(self.callbacks.onopen) {
                    self.callbacks.onopen();
                }

                self.player = new Player(self.playerConnection, self.worldServer);
                self.worldServer.connect_callback(self.player);

                self.flushPendingMessages();
            });
        });
    },

    waitForWorldReady: function(callback) {
        var self = this;
        var checkReady = function() {
            if(self.worldServer && self.worldServer.map && self.worldServer.map.isLoaded && self.worldServer.zoneGroupsReady) {
                callback();
                return;
            }
            setTimeout(checkReady, 20);
        };

        checkReady();
    },

    createPlayerConnection: function() {
        var self = this;
        var connectionId = '5' + this.nextEntityId++;
        var closed = false;
        var connection = {
            id: connectionId,
            remoteAddress: '127.0.0.1',
            listen_callback: null,
            close_callback: null,

            listen: function(callback) {
                this.listen_callback = callback;
            },

            onClose: function(callback) {
                this.close_callback = callback;
            },

            send: function(message) {
                self.deliverToClient(message);
            },

            sendUTF8: function(data) {
                self.deliverRawToClient(data);
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

                if(self.callbacks.onclose) {
                    self.callbacks.onclose();
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
        var message;

        if(!this.playerConnection) {
            this.pendingMessages.push(data);
            return;
        }

        try {
            message = JSON.parse(data);
        } catch (e) {
            if(this.callbacks.onerror) {
                this.callbacks.onerror(e);
            }
            return;
        }

        this.playerConnection.receive(message);
    },

    flushPendingMessages: function() {
        var self = this;

        if(!this.playerConnection || this.pendingMessages.length === 0) {
            return;
        }

        _.each(this.pendingMessages, function(data) {
            self.send(data);
        });

        this.pendingMessages = [];
    },

    close: function() {
        if(this.playerConnection) {
            this.playerConnection.close();
        } else {
            this.isConnected = false;
            if(this.callbacks.onclose) {
                this.callbacks.onclose();
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

    set onopen(fn) { this.callbacks.onopen = fn; },
    set onmessage(fn) { this.callbacks.onmessage = fn; },
    set onerror(fn) { this.callbacks.onerror = fn; },
    set onclose(fn) { this.callbacks.onclose = fn; },

    get readyState() { return this.isConnected ? 1 : 0; },

    deliverToClient: function(message) {
        if(this.callbacks.onmessage) {
            this.callbacks.onmessage({ data: JSON.stringify(message) });
        }
    },

    deliverRawToClient: function(data) {
        if(this.callbacks.onmessage) {
            this.callbacks.onmessage({ data: data });
        }
    }
});

export default LocalGameServer;
