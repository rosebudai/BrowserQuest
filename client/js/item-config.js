const ITEM_CONFIG = {
    sword2: { type: 'weapon', lootMessage: 'You pick up a steel sword' },
    axe: { type: 'weapon', lootMessage: 'You pick up an axe' },
    redsword: { type: 'weapon', lootMessage: 'You pick up a blazing sword' },
    bluesword: { type: 'weapon', lootMessage: 'You pick up a magic sword' },
    goldensword: { type: 'weapon', lootMessage: 'You pick up the ultimate sword' },
    morningstar: { type: 'weapon', lootMessage: 'You pick up a morning star' },
    leatherarmor: { type: 'armor', lootMessage: 'You equip a leather armor' },
    mailarmor: { type: 'armor', lootMessage: 'You equip a mail armor' },
    platearmor: { type: 'armor', lootMessage: 'You equip a plate armor' },
    redarmor: { type: 'armor', lootMessage: 'You equip a ruby armor' },
    goldenarmor: { type: 'armor', lootMessage: 'You equip a golden armor' },
    flask: { type: 'object', lootMessage: 'You drink a health potion' },
    cake: { type: 'object', lootMessage: 'You eat a cake' },
    burger: { type: 'object', lootMessage: 'You can haz rat burger' },
    firepotion: {
        type: 'object',
        lootMessage: 'You feel the power of Firefox!',
        onLoot: 'startInvincibility'
    }
};

export default ITEM_CONFIG;
