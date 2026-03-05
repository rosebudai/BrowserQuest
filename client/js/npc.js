import Types from './gametypes.js';
import Character from './character.js';
import NPC_CONFIG from './npc-config.js';

class Npc extends Character {
    constructor(id, kind) {
        super(id, kind, 1);
        this.itemKind = Types.getKindAsString(this.kind);
        const config = NPC_CONFIG[this.itemKind];
        if (config) {
            this.talkCount = config.dialog.length;
            if (config.idleSpeed !== undefined) this.idleSpeed = config.idleSpeed;
        } else {
            this.talkCount = 0;
        }
        this.talkIndex = 0;
    }

    talk() {
        let msg = null;
        if (this.talkIndex > this.talkCount) {
            this.talkIndex = 0;
        }
        if (this.talkIndex < this.talkCount) {
            const config = NPC_CONFIG[this.itemKind];
            msg = config.dialog[this.talkIndex];
        }
        this.talkIndex += 1;
        return msg;
    }
}

export default Npc;
