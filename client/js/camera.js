import { Class } from './lib/class.js';
import log from './lib/log.js';

const Camera = Class.extend({
    init: function(renderer) {
        this.renderer = renderer;
        this.x = 0;
        this.y = 0;
        this.gridX = 0;
        this.gridY = 0;
        this.offset = 0.5;
        this.mapWidth = null;
        this.mapHeight = null;
        this.activeZone = null;
        this.rescale();
    },

    rescale: function() {
        const renderer = this.renderer, scale = renderer.scale, tilesize = renderer.tilesize;

        const borderPad = 5 * scale, barHeight = 17 * scale, availW = window.innerWidth - 2 * borderPad, availH = window.innerHeight - 2 * borderPad - barHeight;

        let gridW = Math.floor(availW / (tilesize * scale));
        let gridH = Math.floor(availH / (tilesize * scale));

        // Ensure odd
        if (gridW % 2 === 0) { gridW -= 1; }
        if (gridH % 2 === 0) { gridH -= 1; }

        // Enforce minimums
        this.gridW = Math.max(gridW, 15);
        this.gridH = Math.max(gridH, 7);

        log.debug("---------");
        log.debug("Scale:" + scale);
        log.debug("W:" + this.gridW + " H:" + this.gridH);
    },

    setMapBounds: function(mapWidth, mapHeight) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
    },

    setActiveZone: function(zone) {
        this.activeZone = zone || null;
    },

    setPosition: function(x, y) {
        this.x = x;
        this.y = y;

        const zone = this.activeZone;
        if (zone) {
            // Zone-aware clamping (per axis)
            if (this.gridW >= zone.width) {
                this.x = (zone.x - (this.gridW - zone.width) / 2) * 16;
            } else {
                const minX = zone.x * 16;
                const maxX = (zone.x + zone.width - this.gridW) * 16;
                this.x = Math.max(minX, Math.min(this.x, maxX));
            }
            if (this.gridH >= zone.height) {
                this.y = (zone.y - (this.gridH - zone.height) / 2) * 16;
            } else {
                const minY = zone.y * 16;
                const maxY = (zone.y + zone.height - this.gridH) * 16;
                this.y = Math.max(minY, Math.min(this.y, maxY));
            }
        } else if (this.mapWidth !== null && this.mapHeight !== null) {
            const maxX = (this.mapWidth - this.gridW) * 16,
                maxY = (this.mapHeight - this.gridH) * 16;
            this.x = Math.max(0, Math.min(this.x, maxX));
            this.y = Math.max(0, Math.min(this.y, maxY));
        }

        this.gridX = Math.floor(this.x / 16);
        this.gridY = Math.floor(this.y / 16);
    },

    setGridPosition: function(x, y) {
        this.gridX = x;
        this.gridY = y;

        const zone = this.activeZone;
        if (zone) {
            if (this.gridW >= zone.width) {
                this.gridX = Math.floor(zone.x - (this.gridW - zone.width) / 2);
            } else {
                this.gridX = Math.max(zone.x, Math.min(this.gridX, zone.x + zone.width - this.gridW));
            }
            if (this.gridH >= zone.height) {
                this.gridY = Math.floor(zone.y - (this.gridH - zone.height) / 2);
            } else {
                this.gridY = Math.max(zone.y, Math.min(this.gridY, zone.y + zone.height - this.gridH));
            }
        } else if (this.mapWidth !== null && this.mapHeight !== null) {
            this.gridX = Math.max(0, Math.min(this.gridX, this.mapWidth - this.gridW));
            this.gridY = Math.max(0, Math.min(this.gridY, this.mapHeight - this.gridH));
        }

        this.x = this.gridX * 16;
        this.y = this.gridY * 16;
    },

    lookAt: function(entity) {
        const r = this.renderer, x = Math.round( entity.x - (Math.floor(this.gridW / 2) * r.tilesize) ), y = Math.round( entity.y - (Math.floor(this.gridH / 2) * r.tilesize) );

        this.setPosition(x, y);
    },

    forEachVisiblePosition: function(callback, extra) {
        extra = extra || 0;
        for(let y=this.gridY-extra, maxY=this.gridY+this.gridH+(extra*2); y < maxY; y += 1) {
            for(let x=this.gridX-extra, maxX=this.gridX+this.gridW+(extra*2); x < maxX; x += 1) {
                callback(x, y);
            }
        }
    },

    isVisible: function(entity) {
        return this.isVisiblePosition(entity.gridX, entity.gridY);
    },

    isVisiblePosition: function(x, y) {
        if(y >= this.gridY && y < this.gridY + this.gridH
        && x >= this.gridX && x < this.gridX + this.gridW) {
            return true;
        } else {
            return false;
        }
    },

    focusEntity: function(entity) {
        const w = this.gridW - 2, h = this.gridH - 2, x = Math.floor((entity.gridX - 1) / w) * w, y = Math.floor((entity.gridY - 1) / h) * h;

        this.setGridPosition(x, y);
    }
});

export default Camera;
