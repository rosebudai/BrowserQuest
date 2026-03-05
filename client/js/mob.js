import Types from './gametypes.js';
import Character from './character.js';
import MOB_CONFIG from './mob-config.js';

class Mob extends Character {
    constructor(id, kind) {
        super(id, kind);
        this.aggroRange = 1;
        this.isAggressive = true;

        const kindName = Types.getKindAsString(kind);
        const config = MOB_CONFIG[kindName];
        if (config) {
            if (config.moveSpeed !== undefined) this.moveSpeed = config.moveSpeed;
            if (config.atkSpeed !== undefined) this.atkSpeed = config.atkSpeed;
            if (config.idleSpeed !== undefined) this.idleSpeed = config.idleSpeed;
            if (config.walkSpeed !== undefined) this.walkSpeed = config.walkSpeed;
            if (config.shadowOffsetY !== undefined) this.shadowOffsetY = config.shadowOffsetY;
            if (config.isAggressive !== undefined) this.isAggressive = config.isAggressive;
            if (config.aggroRange !== undefined) this.aggroRange = config.aggroRange;
            if (config.attackRate) this.setAttackRate(config.attackRate);
            if (config.customIdle) this._customIdle = true;
        }
    }

    idle(orientation) {
        if (this._customIdle && !this.hasTarget()) {
            super.idle(Types.Orientations.DOWN);
        } else {
            super.idle(orientation);
        }
    }
}

export default Mob;
