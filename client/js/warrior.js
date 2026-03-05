import Types from './gametypes.js';
import Player from './player.js';

class Warrior extends Player {
    constructor(id, name) {
        super(id, name, Types.Entities.WARRIOR);
    }
}

export default Warrior;
