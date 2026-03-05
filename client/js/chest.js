import Types from './gametypes.js';
import Entity from './entity.js';

class Chest extends Entity {
    constructor(id, kind) {
        super(id, Types.Entities.CHEST);
    }

    getSpriteName() {
        return "chest";
    }

    isMoving() {
        return false;
    }

    open() {
        if(this.open_callback) {
            this.open_callback();
        }
    }

    onOpen(callback) {
        this.open_callback = callback;
    }
}

export default Chest;
