import log from '../lib/log.js';
import Entity from "./entity.js";
import Messages from "./message.js";
import Utils from "./utils.js";

const Character = Entity.extend({
    init: function(id, type, kind, x, y) {
        this._super(id, type, kind, x, y);
        
        this.orientation = Utils.randomOrientation();
        this.attackers = {};
        this.target = null;
    },
    
    getState: function() {
        const basestate = this._getBaseState(), state = [];
        
        state.push(this.orientation);
        if(this.target) {
            state.push(this.target);
        }
        
        return basestate.concat(state);
    },
    
    resetHitPoints: function(maxHitPoints) {
        this.maxHitPoints = maxHitPoints;
        this.hitPoints = this.maxHitPoints;
    },
    
    regenHealthBy: function(value) {
        const hp = this.hitPoints, max = this.maxHitPoints;
            
        if(hp < max) {
            if(hp + value <= max) {
                this.hitPoints += value;
            }
            else {
                this.hitPoints = max;
            }
        }
    },
    
    hasFullHealth: function() {
        return this.hitPoints === this.maxHitPoints;
    },
    
    setTarget: function(entity) {
        this.target = entity.id;
    },
    
    clearTarget: function() {
        this.target = null;
    },
    
    hasTarget: function() {
        return this.target !== null;
    },
    
    attack: function() {
        return new Messages.Attack(this.id, this.target);
    },
    
    health: function() {
        return new Messages.Health(this.hitPoints, false);
    },
    
    regen: function() {
        return new Messages.Health(this.hitPoints, true);
    },
    
    addAttacker: function(entity) {
        if(entity) {
            this.attackers[entity.id] = entity;
        }
    },
    
    removeAttacker: function(entity) {
        if(entity && entity.id in this.attackers) {
            delete this.attackers[entity.id];
            log.debug(this.id +" REMOVED ATTACKER "+ entity.id);
        }
    },
    
    forEachAttacker: function(callback) {
        for(const id in this.attackers) {
            callback(this.attackers[id]);
        }
    }
});

export default Character;
