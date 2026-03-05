/**
 * Mob configuration table. Adding a new mob requires:
 * 1. Add an entry here with stats
 * 2. Add kind enum to gametypes.js
 * 3. Add stats to server/properties.js
 * 4. Add sprite assets + manifest entries
 */
const MOB_CONFIG = {
    rat:         { moveSpeed: 350, idleSpeed: 700, shadowOffsetY: -2, isAggressive: false },
    skeleton:    { moveSpeed: 350, atkSpeed: 100, idleSpeed: 800, shadowOffsetY: 1, attackRate: 1300 },
    skeleton2:   { moveSpeed: 200, atkSpeed: 100, idleSpeed: 800, walkSpeed: 200, shadowOffsetY: 1, attackRate: 1300 },
    spectre:     { moveSpeed: 150, atkSpeed: 50, idleSpeed: 200, walkSpeed: 200, shadowOffsetY: 1, attackRate: 900 },
    deathknight: { atkSpeed: 50, moveSpeed: 220, walkSpeed: 100, idleSpeed: 450, attackRate: 800, aggroRange: 3, customIdle: true },
    goblin:      { moveSpeed: 150, atkSpeed: 60, idleSpeed: 600, attackRate: 700 },
    ogre:        { moveSpeed: 300, atkSpeed: 100, idleSpeed: 600 },
    crab:        { moveSpeed: 200, atkSpeed: 40, idleSpeed: 500 },
    snake:       { moveSpeed: 200, atkSpeed: 40, idleSpeed: 250, walkSpeed: 100, shadowOffsetY: -4 },
    eye:         { moveSpeed: 200, atkSpeed: 40, idleSpeed: 50 },
    bat:         { moveSpeed: 120, atkSpeed: 90, idleSpeed: 90, walkSpeed: 85, isAggressive: false },
    wizard:      { moveSpeed: 200, atkSpeed: 100, idleSpeed: 150 },
    boss:        { moveSpeed: 300, atkSpeed: 50, idleSpeed: 400, attackRate: 2000, aggroRange: 3, customIdle: true },
};

export default MOB_CONFIG;
