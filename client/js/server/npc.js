import Entity from "./entity.js";

class Npc extends Entity {
    constructor(id, kind, x, y) {
        super(id, "npc", kind, x, y);
    }
}

export default Npc;
