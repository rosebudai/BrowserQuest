const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let Types;

before(async () => {
    Types = (await import('../../js/gametypes.js')).default;
});

describe('Types utilities', () => {
    it('isMob() is true for mobs and false for NPCs/items', () => {
        assert.equal(Types.isMob(Types.Entities.RAT), true);
        assert.equal(Types.isMob(Types.Entities.BOSS), true);

        assert.equal(Types.isMob(Types.Entities.GUARD), false);
        assert.equal(Types.isMob(Types.Entities.SWORD1), false);
        assert.equal(Types.isMob(Types.Entities.FLASK), false);
    });

    it('isNpc() is true for NPC kinds', () => {
        assert.equal(Types.isNpc(Types.Entities.GUARD), true);
        assert.equal(Types.isNpc(Types.Entities.NYAN), true);

        assert.equal(Types.isNpc(Types.Entities.RAT), false);
        assert.equal(Types.isNpc(Types.Entities.SWORD1), false);
    });

    it('isItem() is true for weapons/armor/objects except chest', () => {
        assert.equal(Types.isItem(Types.Entities.SWORD1), true);
        assert.equal(Types.isItem(Types.Entities.CLOTHARMOR), true);
        assert.equal(Types.isItem(Types.Entities.FLASK), true);

        assert.equal(Types.isItem(Types.Entities.CHEST), false);
        assert.equal(Types.isItem(Types.Entities.GUARD), false);
        assert.equal(Types.isItem(Types.Entities.RAT), false);
    });

    it('kind string and id round-trip', () => {
        const kindsToCheck = [
            Types.Entities.RAT,
            Types.Entities.GUARD,
            Types.Entities.SWORD2,
            Types.Entities.REDARMOR,
            Types.Entities.FIREPOTION,
        ];

        for (const kind of kindsToCheck) {
            const kindString = Types.getKindAsString(kind);
            const roundTripKind = Types.getKindFromString(kindString);
            assert.equal(roundTripKind, kind, `round-trip mismatch for ${kindString}`);
        }
    });

    it('isWeapon() and isArmor() classify correctly', () => {
        assert.equal(Types.isWeapon(Types.Entities.SWORD1), true);
        assert.equal(Types.isWeapon(Types.Entities.AXE), true);
        assert.equal(Types.isWeapon(Types.Entities.CLOTHARMOR), false);

        assert.equal(Types.isArmor(Types.Entities.CLOTHARMOR), true);
        assert.equal(Types.isArmor(Types.Entities.GOLDENARMOR), true);
        assert.equal(Types.isArmor(Types.Entities.SWORD1), false);
    });
});
