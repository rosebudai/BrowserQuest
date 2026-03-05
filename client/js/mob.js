import Character from './character.js';

    class Mob extends Character {
        constructor(id, kind) {
            super(id, kind);

            this.aggroRange = 1;
            this.isAggressive = true;
        }
    }

export default Mob;
