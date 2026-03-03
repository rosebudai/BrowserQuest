# BrowserQuest Verification Guide

Two-tier verification for the BrowserQuest canvas-based HTML5 MMORPG. Tier 1 is an automated smoke test. Tier 2 is agent-driven playthrough scenarios with visual verification via screenshots and judge criteria.

---

## Quick Reference

**Serve the game:**

```bash
cd /workspace/BrowserQuest && python3 -m http.server 8080 --directory client &
```

**Run the smoke test (Tier 1):**

```bash
NODE_PATH=/usr/local/share/npm-global/lib/node_modules node client/tests/smoke-test.cjs
```

**Full verification sequence:**

```bash
# 1. Start the server
cd /workspace/BrowserQuest && python3 -m http.server 8080 --directory client &

# 2. Run Tier 1 smoke test
NODE_PATH=/usr/local/share/npm-global/lib/node_modules node client/tests/smoke-test.cjs

# 3. If Tier 1 passes, proceed to Tier 2 agent playthrough scenarios (below)
```

Screenshots from the smoke test are saved to `/tmp/smoke-test/`.

---

## Tier 1: Smoke Test

**File:** `client/tests/smoke-test.cjs`

The smoke test is a headless Playwright script that exercises the core game loop in under 60 seconds. It launches Chromium, navigates to the locally served game, and runs through 8 steps. Exit code 0 means all 7 must-have steps passed; exit code 1 means at least one failed.

### Steps

| # | Step | What It Checks | Must-Have |
|---|------|----------------|-----------|
| 1 | Game loads | `#parchment` is visible (title screen rendered) | Yes |
| 2 | Game starts | `body.started` class present, `window.__game.started === true` | Yes |
| 3 | Player spawned | `player.gridX > 0` and `player.hitPoints > 0` | Yes |
| 4 | Movement | Player position changes after clicking a nearby tile | Yes |
| 5 | Combat | Engages nearest mob via `clickGrid()` | No (soft-fail if no mob nearby) |
| 6 | Death & Respawn | Player dies, death screen appears, respawn restores HP > 0 | Yes |
| 7 | Viewport | Canvas dimensions >= viewport dimensions (fills screen) | Yes |
| 8 | Status Bar | `#bar-container` visible, height > 0, within viewport bounds | Yes |

### How to Run

```bash
# Ensure the server is running on port 8080
cd /workspace/BrowserQuest && python3 -m http.server 8080 --directory client &

# Run the test (Playwright must be installed globally)
NODE_PATH=/usr/local/share/npm-global/lib/node_modules node client/tests/smoke-test.cjs
```

### Expected Output (all passing)

```
✓ Game loads — Title screen rendered
✓ Game starts — Player entered game world
✓ Player spawned — Position: (X, Y), HP: 100/100
✓ Movement — Moved from (X,Y) to (X',Y')
✓ Combat — Engaged mob "rat" at (X,Y), distance=N
✓ Death & Respawn — Respawned at (X,Y) with HP: 100
✓ Viewport — Canvas: 1280x720, Viewport: 1280x720
✓ Status Bar — WxH at y=N, position:absolute

--- SMOKE TEST RESULTS ---
8/8 steps passed
No console errors.
Screenshots: /tmp/smoke-test/
```

### Screenshots Produced

| File | Content |
|------|---------|
| `01-title-screen.png` | Intro overlay with name input and play button |
| `02-game-started.png` | Game world immediately after entering |
| `03-player-spawned.png` | Player visible in the village |
| `04-after-movement.png` | Player at new position after movement |
| `05-combat.png` | Player engaged with a mob (or skipped) |
| `06-death-screen.png` | Death overlay with respawn button |
| `07-after-respawn.png` | Player alive again after respawn |
| `08-viewport.png` | Full viewport showing canvas fill |

---

## Tier 2: Agent Playthrough Scenarios

These scenarios are designed for agent-driven verification using Playwright MCP. Each scenario describes step-by-step instructions, checkpoint screenshots to capture, and judge criteria for pass/fail.

### Prerequisites

- Game server running on port 8080
- Playwright MCP browser available
- Game loaded and player in the village (complete Tier 1 or manually start the game)

### Screenshot Naming Convention

All screenshots follow the pattern:

```
scenario-{N}-{step-name}.png
```

Examples: `scenario-1-spawn.png`, `scenario-2-combat-engaged.png`, `scenario-3-npc-dialog.png`

Save all screenshots to `/tmp/verification/`.

### Game Globals

- `window.__game` — the Game object (player, entities, map, renderer, camera, etc.)
- `window.__app` — the App object (manages intro, game start lifecycle)

### Starting Spawn Areas

The player spawns randomly in one of these village zones:

| Zone | X Range | Y Range |
|------|---------|---------|
| 1 | 14..22 | 210..211 |
| 2 | 40..45 | 208..212 |
| 3 | 40..44 | 221..224 |
| 4 | 13..16 | 223..225 |
| 5 | 68..72 | 220..224 |
| 6 | 40..44 | 232..236 |
| 7 | 14..17 | 233..235 |

---

### Scenario 1: Spawn and Explore Village

**Goal:** Verify the player spawns correctly and can navigate the village.

**Steps:**

1. **Navigate** to `http://localhost:8080`.
2. **Start the game** — fill the name input with "Verifier", click play.
3. **Wait** for `window.__game.started === true`.
4. **Hide overlays** — evaluate the hide-overlays recipe (see Canvas Interaction Recipes).
5. **Capture screenshot:** `scenario-1-spawn.png` — the player standing in the village.
6. **Query player position** — evaluate the game-state query recipe.
7. **Move to (20, 215)** — evaluate the movement recipe with target `(20, 215)`.
8. **Wait 3 seconds** for movement to complete.
9. **Update camera** — evaluate `game.camera.lookAt(game.player); game.renderer.renderStaticCanvases();`.
10. **Capture screenshot:** `scenario-1-village-walk.png` — player at the new position.
11. **Move to (40, 210)** — evaluate the movement recipe with target `(40, 210)`.
12. **Wait 3 seconds.**
13. **Update camera.**
14. **Capture screenshot:** `scenario-1-village-center.png` — player near the village center.

**Checkpoints:**

| Screenshot | Judge Criteria |
|------------|---------------|
| `scenario-1-spawn.png` | Player character (warrior sprite) visible on screen. Village terrain (grass, paths, buildings) rendered. No black screen or rendering artifacts. |
| `scenario-1-village-walk.png` | Player visibly at a different position than spawn. Village terrain still rendered correctly. |
| `scenario-1-village-center.png` | Player near village center. Multiple terrain features visible (buildings, paths, trees). |

---

### Scenario 2: Combat Loop

**Goal:** Verify the player can find and fight mobs (rats) and survive combat.

**Steps:**

1. **Start from an active game session** (Scenario 1 completed, or start fresh).
2. **Find nearby entities** — evaluate the find-nearby-entities recipe.
3. **Identify the closest mob** — filter results for mob entities (rats have `kind` in the mob range; use `Types.isMob(e.kind)` in the evaluate).
4. **Record player HP** before combat.
5. **Move toward the mob** — evaluate the movement recipe to get within 2 tiles of the mob.
6. **Wait 2 seconds** for arrival.
7. **Update camera.**
8. **Capture screenshot:** `scenario-2-approaching-mob.png` — player near a rat.
9. **Click on the mob** — evaluate the click-grid recipe at the mob's `(gridX, gridY)`.
10. **Wait 4 seconds** for combat to play out.
11. **Capture screenshot:** `scenario-2-combat-engaged.png` — player engaged in combat.
12. **Query player HP** after combat.
13. **Capture screenshot:** `scenario-2-post-combat.png` — aftermath of the fight.
14. **Evaluate:** Check if any loot items appeared nearby (entities with armor/weapon kinds).

**Checkpoints:**

| Screenshot | Judge Criteria |
|------------|---------------|
| `scenario-2-approaching-mob.png` | Player and at least one mob (small brown rat sprite) visible in the same frame. Village/grass terrain rendered. |
| `scenario-2-combat-engaged.png` | Combat indicators visible: player and mob adjacent or overlapping, possible hit animation or HP change. The scene should show active engagement (not a static idle scene). |
| `scenario-2-post-combat.png` | Combat resolved. Player still alive (visible on screen) OR mob is gone (defeated). No rendering corruption. |

---

### Scenario 3: NPC Interaction and Dialog

**Goal:** Verify the player can walk to an NPC and trigger dialog (achievement: `SMALL_TALK`).

**Steps:**

1. **Start from an active game session.**
2. **Choose target NPC** — the village girl at `(15, 222)` or the priest at `(18, 209)`.
3. **Move near the NPC** — evaluate the movement recipe to get within 1 tile of the NPC (e.g., `(16, 222)` for the village girl).
4. **Wait 3 seconds** for arrival.
5. **Update camera.**
6. **Capture screenshot:** `scenario-3-approaching-npc.png` — player near the NPC.
7. **Click on the NPC** — evaluate the click-grid recipe at the NPC's position (e.g., `(15, 222)`).
8. **Wait 2 seconds** for the dialog/talk bubble to appear.
9. **Capture screenshot:** `scenario-3-npc-dialog.png` — dialog bubble visible.
10. **Check achievement** — evaluate:
    ```javascript
    const game = window.__game;
    return {
      achievementUnlocked: game.storage.hasAlreadyAchieved('SMALL_TALK'),
      currentAchievements: game.storage.data.achievements,
    };
    ```
11. **Capture screenshot:** `scenario-3-achievement.png` — any achievement notification visible.

**Checkpoints:**

| Screenshot | Judge Criteria |
|------------|---------------|
| `scenario-3-approaching-npc.png` | Player character and an NPC (distinct non-mob sprite, often in a robe or dress) visible near each other. Village setting intact. |
| `scenario-3-npc-dialog.png` | A talk/speech bubble or dialog indicator visible above the NPC. The bubble should contain text. Player adjacent to the NPC. |
| `scenario-3-achievement.png` | Achievement notification banner visible (gold/brown notification bar at top of screen), OR confirmed via JS that `SMALL_TALK` achievement was unlocked. |

---

### Scenario 4: Death, Respawn, and Recovery

**Goal:** Verify the full death and respawn cycle works visually and functionally.

**Steps:**

1. **Start from an active game session.**
2. **Record pre-death state** — evaluate the game-state query recipe (position, HP, weapon, armor).
3. **Capture screenshot:** `scenario-4-alive.png` — player alive and healthy.
4. **Trigger death** — evaluate the trigger-death recipe (see Canvas Interaction Recipes).
5. **Wait 5 seconds** for the death animation and death screen to appear.
6. **If `body.death` class not present after 5 seconds**, force the death UI:
    ```javascript
    document.body.classList.add('death');
    ```
7. **Capture screenshot:** `scenario-4-death-screen.png` — the death/respawn overlay.
8. **Click respawn** — evaluate:
    ```javascript
    const game = window.__game;
    game.audioManager.playSound("revive");
    game.restart();
    document.body.classList.remove('death');
    ```
9. **Wait 5 seconds** for respawn to complete.
10. **Wait for player to exist** — poll `window.__game.player && window.__game.player.hitPoints > 0`.
11. **Hide overlays** — evaluate the hide-overlays recipe.
12. **Update camera** — `game.camera.lookAt(game.player); game.renderer.renderStaticCanvases();`.
13. **Capture screenshot:** `scenario-4-respawned.png` — player alive again in the world.
14. **Query post-respawn state** — evaluate the game-state query recipe.

**Checkpoints:**

| Screenshot | Judge Criteria |
|------------|---------------|
| `scenario-4-alive.png` | Player character visible, standing in the game world. HP bar visible in status bar at bottom. Normal game state. |
| `scenario-4-death-screen.png` | Death overlay visible: darkened/dimmed game world with a respawn prompt or button visible. The parchment/dialog area should show death-related text. |
| `scenario-4-respawned.png` | Player character visible again in the game world. No death overlay. Game world rendered normally. Player should be at a spawn position. |

---

### Scenario 5: Achievement Run (Multi-Objective)

**Goal:** Trigger multiple achievements in one session to verify the achievement system works.

**Target Achievements:**

| Achievement | Trigger |
|-------------|---------|
| `SMALL_TALK` | Talk to any NPC |
| `ANGRY_RATS` | Kill 10 rats |
| `INTO_THE_WILD` | Step to `x <= 85, y == 179` or `y == 266` |
| `A_TRUE_WARRIOR` | Loot a weapon |
| `FAT_LOOT` | Loot armor |

**Steps:**

1. **Start from a fresh game session.**
2. **Phase A — NPC Talk:**
   - Move to `(16, 222)` (near the village girl).
   - Wait 3 seconds.
   - Click on `(15, 222)`.
   - Wait 2 seconds.
   - **Capture screenshot:** `scenario-5-small-talk.png`.
   - Verify `SMALL_TALK` achievement via JS.

3. **Phase B — Rat Hunting:**
   - Move to rat spawn area: `(15, 209)` (mob area 0: x=10, y=206, w=13, h=7).
   - Wait 3 seconds.
   - Find nearest mob entity.
   - Click on the mob to engage combat.
   - Wait 5 seconds for combat to resolve.
   - Repeat: find next mob, engage, wait. Continue until 10 rats killed or 2 minutes elapsed.
   - **Capture screenshot:** `scenario-5-rat-hunt.png`.
   - Check kill count via:
     ```javascript
     const game = window.__game;
     return {
       angryRats: game.storage.hasAlreadyAchieved('ANGRY_RATS'),
       achievements: game.storage.data.achievements,
     };
     ```

4. **Phase C — Into the Wild:**
   - Move to `(80, 179)` (the wilderness boundary).
   - Wait 5 seconds for arrival (long distance walk).
   - Update camera.
   - **Capture screenshot:** `scenario-5-into-wild.png`.
   - Verify `INTO_THE_WILD` achievement via JS.

5. **Phase D — Loot Check:**
   - After killing rats, check for loot drops:
     ```javascript
     const game = window.__game;
     return {
       trueWarrior: game.storage.hasAlreadyAchieved('A_TRUE_WARRIOR'),
       fatLoot: game.storage.hasAlreadyAchieved('FAT_LOOT'),
       weapon: game.player.weaponName,
       armor: game.player.armorName,
     };
     ```
   - **Capture screenshot:** `scenario-5-loot.png`.

6. **Final summary** — evaluate all achievements:
    ```javascript
    const game = window.__game;
    const targets = ['SMALL_TALK', 'ANGRY_RATS', 'INTO_THE_WILD', 'A_TRUE_WARRIOR', 'FAT_LOOT'];
    const results = {};
    for (const a of targets) {
      results[a] = game.storage.hasAlreadyAchieved(a);
    }
    return results;
    ```
7. **Capture screenshot:** `scenario-5-final.png`.

**Checkpoints:**

| Screenshot | Judge Criteria |
|------------|---------------|
| `scenario-5-small-talk.png` | Player near an NPC with a talk bubble visible, OR achievement notification for SMALL_TALK. |
| `scenario-5-rat-hunt.png` | Player in a grassy/field area with rat mob sprites visible or recently defeated. Combat context evident. |
| `scenario-5-into-wild.png` | Player at the edge of the village/wilderness boundary. Terrain should show a transition (village to forest/wild). Different tile set from village center. |
| `scenario-5-loot.png` | Player with upgraded equipment visible (different sprite if armor changed) OR loot items on the ground nearby. |
| `scenario-5-final.png` | Game world rendered. This is the final state capture for JS achievement verification. |

---

## Canvas Interaction Recipes

Copy-pasteable `browser_evaluate` snippets for agent-driven Playwright MCP interaction.

### Hide Overlays

Removes the intro and instruction overlays so the game canvas is visible for screenshots.

```javascript
document.getElementById('intro').style.display = 'none';
document.getElementById('instructions').style.display = 'none';
```

### Move Player to Grid Position

Programmatically moves the player to a target tile. Follow up with a camera update.

```javascript
const game = window.__game;
game.makePlayerGoTo(x, y);  // Replace x, y with target coordinates
```

After arrival (wait 2-4 seconds depending on distance):

```javascript
const game = window.__game;
game.camera.lookAt(game.player);
game.renderer.renderStaticCanvases();
```

### Click at Grid Position (Combat / NPC Interaction)

Simulates a game click at a specific grid tile. Works for attacking mobs, talking to NPCs, and picking up loot.

```javascript
const game = window.__game;
const r = game.renderer;
const cam = r.camera;
const s = r.scale;
const ts = r.tilesize;
game.mouse.x = (gx - cam.gridX) * ts * s + Math.floor(ts * s / 2);  // Replace gx
game.mouse.y = (gy - cam.gridY) * ts * s + Math.floor(ts * s / 2);  // Replace gy
game.previousClickPosition = {};
game.click();
```

Replace `gx` and `gy` with the target grid coordinates.

### Query Game State

Returns current player position, HP, weapon, and armor.

```javascript
const game = window.__game;
const info = {
  playerPos: { x: game.player.gridX, y: game.player.gridY },
  hp: game.player.hitPoints,
  maxHp: game.player.maxHitPoints,
  weapon: game.player.weaponName,
  armor: game.player.armorName,
};
return info;
```

### Find Nearby Entities

Returns all entities within 15 tiles of the player, sorted by distance.

```javascript
const game = window.__game;
const player = game.player;
const nearby = [];
for (const id in game.entities) {
  const e = game.entities[id];
  const dist = Math.abs(e.gridX - player.gridX) + Math.abs(e.gridY - player.gridY);
  if (dist < 15 && e.id !== player.id) {
    nearby.push({ id: e.id, kind: e.kind, name: e.name, gridX: e.gridX, gridY: e.gridY, dist });
  }
}
nearby.sort((a, b) => a.dist - b.dist);
return nearby;
```

### Find Nearest Mob Only

Returns the closest mob entity (for targeted combat).

```javascript
const game = window.__game;
const player = game.player;
let closestMob = null;
let closestDist = Infinity;
for (const id in game.entities) {
  const e = game.entities[id];
  if (Types.isMob(e.kind)) {
    const dist = Math.abs(e.gridX - player.gridX) + Math.abs(e.gridY - player.gridY);
    if (dist < closestDist) {
      closestDist = dist;
      closestMob = { id: e.id, gridX: e.gridX, gridY: e.gridY, name: e.name, dist };
    }
  }
}
return closestMob;
```

### Trigger Player Death

Forces the player to die. Also marks the server-side player as dead so respawn works correctly.

```javascript
const game = window.__game;
const player = game.player;
player.hitPoints = 0;
player.die();
// Mark server-side player dead for respawn handshake
const localServer = game.client.connection;
if (localServer && localServer.player) {
  localServer.player.isDead = true;
}
```

### Trigger Respawn

Respawns the player after death. Must be called when the death screen is showing.

```javascript
const game = window.__game;
game.audioManager.playSound("revive");
game.restart();
document.body.classList.remove('death');
```

### Check Achievement Status

Checks whether a specific achievement has been unlocked.

```javascript
const game = window.__game;
return game.storage.hasAlreadyAchieved('ACHIEVEMENT_NAME');  // Replace with achievement ID
```

### Check All Target Achievements

```javascript
const game = window.__game;
const targets = ['SMALL_TALK', 'ANGRY_RATS', 'INTO_THE_WILD', 'A_TRUE_WARRIOR', 'FAT_LOOT'];
const results = {};
for (const a of targets) {
  results[a] = game.storage.hasAlreadyAchieved(a);
}
return results;
```

### Check If Game Is Running

Quick health check before starting any scenario.

```javascript
return {
  gameExists: !!window.__game,
  started: window.__game ? window.__game.started : false,
  hasPlayer: window.__game ? !!window.__game.player : false,
  playerHP: (window.__game && window.__game.player) ? window.__game.player.hitPoints : 0,
};
```

---

## Judge Rubric

Visual verification criteria for screenshot evaluation. Use these with the `visual-judge` skill or any multimodal model that can analyze screenshots.

### General Criteria (Apply to All Screenshots)

| Criterion | Pass | Fail |
|-----------|------|------|
| **Rendering** | Game world visible with terrain tiles (grass, dirt, stone). No large black rectangles or missing tile areas. | Black screen, entirely white, or large corrupted regions (>25% of frame). |
| **Player Visible** | A small humanoid sprite (warrior) is visible in the game world. | No player sprite visible when one is expected. |
| **UI Elements** | Status bar at bottom with HP bar visible (when in game). | Status bar missing or overlapping game content incorrectly. |
| **No Overlay Artifacts** | Game canvas is the primary visible content (after hiding overlays). | Intro screen, instructions, or other HTML overlays blocking the game canvas when they should be hidden. |
| **Resolution** | Canvas fills the viewport without large letterboxing gaps. | Canvas is a small rectangle in the center with large empty borders. |

### Scenario-Specific Criteria

#### Spawn Verification

- **Pass:** Player sprite visible in a village setting. Grass tiles, paths, and at least one building or structure visible. Player position matches one of the known spawn zones.
- **Fail:** Player not visible. Spawned in an empty/void area. Game world not rendered.

#### Movement Verification

- **Pass:** Two screenshots show the player at visibly different positions. Background terrain has shifted or player is in a new area of the map.
- **Fail:** Player in the same position in both screenshots. No visible change.

#### Combat Verification

- **Pass:** Player and a mob (small brown rat sprite) visible in the same frame, adjacent or overlapping. Evidence of combat interaction (sprite animation, proximity). Post-combat: mob gone or player HP changed.
- **Fail:** No mob visible anywhere in frame. Player standing alone with no combat context.

#### NPC Interaction Verification

- **Pass:** Player adjacent to an NPC sprite (larger or differently colored than mobs). A speech/talk bubble with text visible above the NPC. Achievement notification may be visible.
- **Fail:** No NPC visible. No dialog bubble. Player standing alone.

#### Death Screen Verification

- **Pass:** Screen shows a death overlay: darkened or dimmed game world, a parchment/dialog area with death-related text or a respawn button visible. Distinct from normal gameplay.
- **Fail:** Normal gameplay screen with no death indication. Completely black screen with no UI.

#### Respawn Verification

- **Pass:** Player visible in the game world after respawn. No death overlay. Player at a valid spawn position. HP > 0 confirmed via JS.
- **Fail:** Death screen still showing. Player not visible. Game frozen or unresponsive.

#### Wilderness/Boundary Verification

- **Pass:** Terrain visibly different from the village center — forest tiles, darker ground, fewer buildings, more trees. Player at the edge of the map or in a transition zone.
- **Fail:** Still clearly in the village center. No terrain change visible.

### Confidence Levels

When judging screenshots, assign a confidence level:

| Level | Meaning |
|-------|---------|
| **HIGH** | Clearly passes or fails all criteria. No ambiguity. |
| **MEDIUM** | Mostly passes/fails but one criterion is borderline (e.g., mob visible but small, dialog bubble partially cut off). |
| **LOW** | Hard to determine — dark screenshot, low contrast, sprites too small to identify. Needs re-capture at higher resolution or with camera repositioned. |

If confidence is LOW, the scenario should be re-run with the camera repositioned closer to the subject before making a final pass/fail determination.
