(function() {
    "use strict";

    var LOCATIONS = {
        spawn:  { x: 15, y: 210 },
        house:  { x: 126, y: 143 },
        cave:   { x: 157, y: 120 },
        beach:  { x: 26, y: 296 },
        desert: { x: 49, y: 97 },
        boss:   { x: 155, y: 71 }
    };

    function requireGame() {
        if (!window.__game) {
            throw new Error("[bq-debug] window.__game is not available. Has the game been initialized?");
        }
        if (!window.__game.player) {
            throw new Error("[bq-debug] game.player is not available.");
        }
        return window.__game;
    }

    var bq = {};

    /**
     * Start the game by entering a player name and clicking play.
     * Resolves when window.__game.started is true.
     */
    bq.startGame = function(name) {
        name = name || "Dev";

        return new Promise(function(resolve, reject) {
            // Already started
            if (window.__game && window.__game.started) {
                resolve(bq.state());
                return;
            }

            // Set name input and trigger the play button
            var $input = $('#nameinput');
            $input.val(name);
            $input[0].dispatchEvent(new Event('input', { bubbles: true }));
            $('.play div').click();

            var elapsed = 0;
            var interval = 200;
            var timeout = 15000;

            var poll = setInterval(function() {
                elapsed += interval;
                if (window.__game && window.__game.started) {
                    clearInterval(poll);
                    resolve(bq.state());
                } else if (elapsed >= timeout) {
                    clearInterval(poll);
                    reject(new Error("[bq-debug] Timed out waiting for game to start after " + timeout + "ms"));
                }
            }, interval);
        });
    };

    /**
     * Teleport to a named location from the LOCATIONS map.
     */
    bq.teleport = function(locationName) {
        var loc = LOCATIONS[locationName];
        if (!loc) {
            throw new Error("[bq-debug] Unknown location: '" + locationName + "'. Valid locations: " + Object.keys(LOCATIONS).join(", "));
        }
        return bq.teleportTo(loc.x, loc.y);
    };

    /**
     * Teleport the player to an arbitrary grid position.
     */
    bq.teleportTo = function(gridX, gridY) {
        var game = requireGame();

        game.player.setGridPosition(gridX, gridY);
        game.player.nextGridX = gridX;
        game.player.nextGridY = gridY;
        game.camera.focusEntity(game.player);
        game.resetZone();
        game.updatePlateauMode();
        game.player.forEachAttacker(function(a) {
            a.disengage();
            a.idle();
        });

        return bq.state();
    };

    /**
     * Simulate a click on a specific grid tile.
     * Sets game.mouse coordinates and calls game.click() directly.
     */
    bq.clickTile = function(gridX, gridY) {
        var game = requireGame();
        var scale = game.renderer.scale;
        var ts = game.renderer.tilesize;
        var camera = game.camera;

        // Center of the tile in mouse-space
        var mouseX = (gridX - camera.gridX) * ts * scale + (ts * scale / 2);
        var mouseY = (gridY - camera.gridY) * ts * scale + (ts * scale / 2);

        // Set mouse coordinates directly on the game object and invoke click
        game.mouse.x = mouseX;
        game.mouse.y = mouseY;
        game.click();

        return { gridX: gridX, gridY: gridY, mouseX: mouseX, mouseY: mouseY };
    };

    /**
     * Return the current game state snapshot.
     */
    bq.state = function() {
        var game = requireGame();

        return {
            player: {
                gridX: game.player.gridX,
                gridY: game.player.gridY,
                hp: game.player.hitPoints,
                maxHp: game.player.maxHitPoints,
                armor: game.player.armorName,
                weapon: game.player.weaponName,
                isDead: game.player.isDead
            },
            camera: {
                gridX: game.camera.gridX,
                gridY: game.camera.gridY
            },
            started: game.started
        };
    };

    /**
     * Find doors near the player within a given Manhattan distance radius.
     * Returns an array sorted by distance.
     */
    bq.doors = function(radius) {
        radius = (radius !== undefined) ? radius : 15;
        var game = requireGame();
        var map = game.map;
        var playerX = game.player.gridX;
        var playerY = game.player.gridY;
        var result = [];

        // map.doors is keyed by tile index: (y * width) + x + 1
        for (var idx in map.doors) {
            if (!map.doors.hasOwnProperty(idx)) {
                continue;
            }
            var numIdx = parseInt(idx, 10);
            // Reverse GridPositionToTileIndex: index = (y * width) + x + 1
            var adjustedIdx = numIdx - 1;
            var gridX = adjustedIdx % map.width;
            var gridY = Math.floor(adjustedIdx / map.width);

            var distance = Math.abs(gridX - playerX) + Math.abs(gridY - playerY);
            if (distance <= radius) {
                var door = map.doors[idx];
                result.push({
                    gridX: gridX,
                    gridY: gridY,
                    dest: {
                        x: door.x,
                        y: door.y,
                        portal: door.portal
                    },
                    _distance: distance
                });
            }
        }

        result.sort(function(a, b) {
            return a._distance - b._distance;
        });

        // Clean up internal _distance property
        for (var i = 0; i < result.length; i++) {
            delete result[i]._distance;
        }

        return result;
    };

    /**
     * List available named locations.
     */
    bq.locations = LOCATIONS;

    window.bq = bq;
    console.log("[bq-debug] ready");
})();
