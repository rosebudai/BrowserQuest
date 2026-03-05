import Area from "./area.js";
import Mob from "./mob.js";
import Utils from "./utils.js";

const MobArea = Area.extend({
    init: function(id, nb, kind, x, y, width, height, world) {
        this._super(id, x, y, width, height, world);
        this.nb = nb;
        this.kind = kind;
        this.respawns = [];
        this.setNumberOfEntities(this.nb);
        
        //this.initRoaming();
    },
    
    spawnMobs: function() {
        for(let i = 0; i < this.nb; i += 1) {
            this.addToArea(this._createMobInsideArea());
        }
    },
    
    _createMobInsideArea: function() {
        const k = Types.getKindFromString(this.kind), pos = this._getRandomPositionInsideArea(), mob = new Mob('1' + this.id + ''+ k + ''+ this.entities.length, k, pos.x, pos.y);
        
        mob.onMove(this.world.onMobMoveCallback.bind(this.world));

        return mob;
    },
    
    respawnMob: function(mob, delay) {
        const self = this;
        
        this.removeFromArea(mob);
        
        setTimeout(function() {
            const pos = self._getRandomPositionInsideArea();
            
            mob.x = pos.x;
            mob.y = pos.y;
            mob.isDead = false;
            self.addToArea(mob);
            self.world.addMob(mob);
        }, delay);
    },

    initRoaming: function(mob) {
        const self = this;
        
        setInterval(function() {
            self.entities.forEach(function(mob) {
                const canRoam = (Utils.random(20) === 1);
                let pos;

                if(canRoam) {
                    if(!mob.hasTarget() && !mob.isDead) {
                        pos = self._getRandomPositionInsideArea();
                        mob.move(pos.x, pos.y);
                    }
                }
            });
        }, 500);
    },
    
    createReward: function() {
        const pos = this._getRandomPositionInsideArea();
        
        return { x: pos.x, y: pos.y, kind: Types.Entities.CHEST };
    }
});

export default MobArea;
