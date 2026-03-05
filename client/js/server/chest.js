import Types from '../gametypes.js';
import Item from "./item.js";
import Utils from "./utils.js";

class Chest extends Item {
    constructor(id, x, y) {
        super(id, Types.Entities.CHEST, x, y);
    }

    setItems(items) {
        this.items = items;
    }

    getRandomItem() {
        const nbItems = this.items.length;
        let item = null;

        if(nbItems > 0) {
            item = this.items[Utils.random(nbItems)];
        }
        return item;
    }
}

export default Chest;
