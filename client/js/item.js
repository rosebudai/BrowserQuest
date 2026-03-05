import Types from './gametypes.js';
import Entity from './entity.js';
import ITEM_CONFIG from './item-config.js';

class Item extends Entity {
    constructor(id, kind) {
        super(id, kind);
        this.itemKind = Types.getKindAsString(kind);
        this.wasDropped = false;

        const config = ITEM_CONFIG[this.itemKind];
        if (config) {
            this.type = config.type;
            this.lootMessage = config.lootMessage;
            if (config.onLoot) this._onLootAction = config.onLoot;
        }
    }

    hasShadow() {
        return true;
    }

    onLoot(player) {
        if (this._onLootAction) {
            player[this._onLootAction]();
        } else if (this.type === 'weapon') {
            player.switchWeapon(this.itemKind);
        } else if (this.type === 'armor') {
            player.armorloot_callback(this.itemKind);
        }
    }

    getSpriteName() {
        return 'item-' + this.itemKind;
    }

    getLootMessage() {
        return this.lootMessage;
    }
}

export default Item;
