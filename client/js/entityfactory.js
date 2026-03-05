import Types from './gametypes.js';
import log from './lib/log.js';
import Mob from './mob.js';
import Item from './item.js';
import Npc from './npc.js';
import Warrior from './warrior.js';
import Chest from './chest.js';

const EntityFactory = {
    createEntity(kind, id, name) {
        if (!kind) {
            log.error('kind is undefined', true);
            return;
        }

        if (kind === Types.Entities.WARRIOR) {
            return new Warrior(id, name);
        }
        if (kind === Types.Entities.CHEST) {
            return new Chest(id);
        }
        if (Types.isMob(kind)) {
            return new Mob(id, kind);
        }
        if (Types.isNpc(kind)) {
            return new Npc(id, kind);
        }
        if (Types.isItem(kind)) {
            return new Item(id, kind);
        }

        throw Error(kind + ' is not a valid Entity type');
    }
};

export default EntityFactory;
