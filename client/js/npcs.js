import Types from './gametypes.js';
import Npc from './npc.js';

const NPCs = {
    Guard: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.GUARD, 1);
        }
    },

    King: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.KING, 1);
        }
    },

    Agent: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.AGENT, 1);
        }
    },

    Rick: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.RICK, 1);
        }
    },

    VillageGirl: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.VILLAGEGIRL, 1);
        }
    },

    Villager: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.VILLAGER, 1);
        }
    },

    Coder: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.CODER, 1);
        }
    },

    Scientist: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.SCIENTIST, 1);
        }
    },

    Nyan: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.NYAN, 1);
            this.idleSpeed = 50;
        }
    },

    Sorcerer: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.SORCERER, 1);
            this.idleSpeed = 150;
        }
    },

    Priest: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.PRIEST, 1);
        }
    },

    BeachNpc: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.BEACHNPC, 1);
        }
    },

    ForestNpc: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.FORESTNPC, 1);
        }
    },

    DesertNpc: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.DESERTNPC, 1);
        }
    },

    LavaNpc: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.LAVANPC, 1);
        }
    },

    Octocat: class extends Npc {
        constructor(id) {
            super(id, Types.Entities.OCTOCAT, 1);
        }
    }
};

export default NPCs;
