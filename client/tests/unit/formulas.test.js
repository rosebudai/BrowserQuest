const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let Formulas;

before(async () => {
    Formulas = (await import('../../js/server/formulas.js')).default;
});

describe('Formulas', () => {
    describe('dmg()', () => {
        it('returns non-negative damage', () => {
            for (let i = 0; i < 200; i += 1) {
                const damage = Formulas.dmg(1, 1000);
                assert.ok(damage >= 0, `expected non-negative damage, got ${damage}`);
            }
        });

        it('handles edge combat values without going negative', () => {
            const low = Formulas.dmg(1, 1);
            const high = Formulas.dmg(999, 999);

            assert.ok(low >= 0);
            assert.ok(high >= 0);
        });
    });

    describe('hp()', () => {
        it('scales with armor level', () => {
            const hp1 = Formulas.hp(1);
            const hp2 = Formulas.hp(2);
            const hp10 = Formulas.hp(10);

            assert.ok(hp2 > hp1, `expected hp(2) > hp(1), got ${hp2} <= ${hp1}`);
            assert.ok(hp10 > hp2, `expected hp(10) > hp(2), got ${hp10} <= ${hp2}`);
        });

        it('returns expected edge values for level 1 and high levels', () => {
            assert.equal(Formulas.hp(1), 80);
            assert.equal(Formulas.hp(100), 3050);
        });
    });

    describe('optional progression methods', () => {
        it('xp(level) thresholds increase with level when implemented', () => {
            if (typeof Formulas.xp !== 'function') {
                return;
            }

            const xp1 = Formulas.xp(1);
            const xp2 = Formulas.xp(2);
            const xp10 = Formulas.xp(10);

            assert.ok(xp2 > xp1, `expected xp(2) > xp(1), got ${xp2} <= ${xp1}`);
            assert.ok(xp10 > xp2, `expected xp(10) > xp(2), got ${xp10} <= ${xp2}`);
        });

        it('maxHp(level) increases with level when implemented', () => {
            if (typeof Formulas.maxHp !== 'function') {
                return;
            }

            const maxHp1 = Formulas.maxHp(1);
            const maxHp2 = Formulas.maxHp(2);
            const maxHp50 = Formulas.maxHp(50);

            assert.ok(maxHp2 > maxHp1, `expected maxHp(2) > maxHp(1), got ${maxHp2} <= ${maxHp1}`);
            assert.ok(maxHp50 > maxHp2, `expected maxHp(50) > maxHp(2), got ${maxHp50} <= ${maxHp2}`);
        });
    });
});
