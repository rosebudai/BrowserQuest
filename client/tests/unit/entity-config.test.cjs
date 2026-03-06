const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let MOB_CONFIG;
let NPC_CONFIG;
let ITEM_CONFIG;

before(async () => {
    MOB_CONFIG = (await import('../../js/mob-config.js')).default;
    NPC_CONFIG = (await import('../../js/npc-config.js')).default;
    ITEM_CONFIG = (await import('../../js/item-config.js')).default;
});

describe('Entity config tables', () => {
    it('every mob has moveSpeed and idleSpeed', () => {
        for (const [mobName, mobConfig] of Object.entries(MOB_CONFIG)) {
            assert.equal(typeof mobConfig.moveSpeed, 'number', `${mobName} missing numeric moveSpeed`);
            assert.equal(typeof mobConfig.idleSpeed, 'number', `${mobName} missing numeric idleSpeed`);
        }
    });

    it('every NPC has a dialog array with at least one entry', () => {
        for (const [npcName, npcConfig] of Object.entries(NPC_CONFIG)) {
            assert.ok(Array.isArray(npcConfig.dialog), `${npcName} dialog must be an array`);
            assert.ok(npcConfig.dialog.length >= 1, `${npcName} dialog must have at least one entry`);
        }
    });

    it('every item has type and lootMessage', () => {
        for (const [itemName, itemConfig] of Object.entries(ITEM_CONFIG)) {
            assert.equal(typeof itemConfig.type, 'string', `${itemName} missing string type`);
            assert.equal(typeof itemConfig.lootMessage, 'string', `${itemName} missing string lootMessage`);
        }
    });

    it('FirePotion has onLoot=startInvincibility', () => {
        assert.equal(ITEM_CONFIG.firepotion.onLoot, 'startInvincibility');
    });

    it('Deathknight and Boss have customIdle=true', () => {
        assert.equal(MOB_CONFIG.deathknight.customIdle, true);
        assert.equal(MOB_CONFIG.boss.customIdle, true);
    });

    it('Nyan and Sorcerer have expected idleSpeed overrides', () => {
        assert.equal(NPC_CONFIG.nyan.idleSpeed, 50);
        assert.equal(NPC_CONFIG.sorcerer.idleSpeed, 150);
    });
});
