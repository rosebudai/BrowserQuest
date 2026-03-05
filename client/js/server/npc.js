import Entity from "./entity.js";

const Npc = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "npc", kind, x, y);
    }
});

export default Npc;
