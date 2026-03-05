# BrowserQuest

HTML5 canvas-based MMORPG running entirely in-browser. Single-player mode with a local game server emulating multiplayer protocol. Built with ESM modules, jQuery, underscore, and a Class.extend inheritance system (no build step).

## File Map

### Core Game Loop

| File | Purpose |
|------|---------|
| `index.html` | Entry point. Loads global libs, UI shells, then ESM entrypoint |
| `js/main.js` | Bootstraps App and Game, wires callbacks, starts game |
| `js/app.js` | UI orchestration: intro flow, chat, achievements modal, storage |
| `js/game.js` | Runtime core: init subsystems, game loop (`tick()`), entity management, achievements |
| `js/updater.js` | Per-frame update: movement transitions, animations, zoning |
| `js/renderer.js` | Canvas rendering: camera, terrain, entities, UI overlays, dirty-rect mobile path |
| `js/camera.js` | Viewport tracking, grid-to-pixel math |

### Entities

| File | Purpose |
|------|---------|
| `js/gametypes.js` | Entity kind enums, type checks (`Types.isMob()`, `Types.isItem()`), kind-to-string maps |
| `js/entity.js` | Base entity: position, sprite, animations |
| `js/character.js` | Moving entities: pathfinding, combat, HP, aggro |
| `js/player.js` | Player-specific: equipment, loot, move queuing |
| `js/mob.js` | Mob base class |
| `js/mobs.js` | Mob subclasses (Rat, Skeleton, Boss, etc.) — sprite + idle speed |
| `js/npc.js` | NPC base class + `NpcTalk` dialog table |
| `js/npcs.js` | NPC subclasses |
| `js/item.js` | Item/loot base class |
| `js/items.js` | Item subclasses |
| `js/entityfactory.js` | `EntityFactory.createEntity(kind)` — maps kind enums to classes |

### Assets

| File | Purpose |
|------|---------|
| `js/manifest.js` | Single source of truth for all asset paths — complete quoted strings for Rosebud rewriter compatibility |
| `js/asset-resolver.js` | Typed lookup functions over the manifest (name → path) |
| `js/sprite.js` | Sprite loading: JSON metadata + PNG image, scale-aware |
| `js/sprites.js` | Loads all sprite JSON data from manifest |
| `sprites/*.json` | Per-sprite animation metadata (frames, row, width, height) |
| `img/{1,2,3}/*.png` | Sprite images at 3 scales (1=small, 2=medium, 3=large) |

### Map & World

| File | Purpose |
|------|---------|
| `js/map.js` | Map loading, collision grid, tilesets, doors, checkpoints, music areas, camera zones |
| `js/mapworker.js` | Web Worker for map parsing (desktop path) |
| `maps/world_client.json` | Full map data: tiles, collision, doors, checkpoints, music areas |
| `maps/world_server.json` | Server map: mob spawn areas, chest areas, static entities, doors |

### Local Server (Single-Player)

| File | Purpose |
|------|---------|
| `js/server/localgameserver.js` | In-browser server bootstrap: loads map, starts WorldServer, fake connection |
| `js/server/worldserver.js` | Game simulation: mob spawning, combat resolution, loot drops, zone management |
| `js/server/properties.js` | Entity stats: HP, armor, weapon damage, XP, drop tables |
| `js/server/mob.js` | Server-side mob: aggro, regen, respawn timer |
| `js/server/player.js` | Server-side player: inventory, combat, level-up |
| `js/server/map.js` | Server map utilities, collision checks |

### Networking

| File | Purpose |
|------|---------|
| `js/gameclient.js` | Client protocol: message handlers (WELCOME, SPAWN, MOVE, ATTACK, etc.) |

### Audio & UI

| File | Purpose |
|------|---------|
| `js/audio.js` | Sound/music loading, area-based music switching, fade in/out |
| `css/main.css` | All game styles: intro, status bar, achievements, chat, responsive breakpoints |

## Conventions

**Inheritance:** All game classes use `Class.extend({ init: function() {}, ... })` from `js/lib/class.js`. No ES6 classes.

**Globals loaded by index.html** (available everywhere, not imported):
- `Class` — inheritance
- `Types` — entity kind enums and type checks
- `_` — underscore.js
- `$` — jQuery
- `log` — logging
- `isInt`, `TRANSITIONEND`, `requestAnimFrame` — utilities

**Module style:** ESM `import`/`export` for game modules. Global libs are NOT imported — they're assumed present.

**Entity kind system:** Every entity type has a numeric `kind` in `gametypes.js`. Mobs, NPCs, items, and armors each occupy a numeric range. `Types.isMob(kind)`, `Types.isItem(kind)`, etc. check ranges.

## Asset System

All asset paths are defined in `js/manifest.js` and accessed through `js/asset-resolver.js`.

**Binary assets** (images, audio) are served from the Rosebud assets URL. **Text assets** (JS, JSON, CSS, HTML) are served from `/api/server/`. The manifest is the single source of truth for all asset paths — to update asset URLs after upload, edit `manifest.js` only.

To add a new sprite asset:
1. Add entries to `manifest.js` (spriteData + sprites at each scale)
2. The resolver functions handle path resolution automatically
3. Add the sprite JSON to `sprites/` and PNGs to `img/{1,2,3}/`

## Gotchas

**Two server code trees exist.** `js/server/` (browser local server) is the active runtime. `../../server/js/` (Node multiplayer) is legacy and unused. Always edit `js/server/` for gameplay changes.

**Adding entities is cross-cutting.** A new mob requires changes in 5+ files: `gametypes.js` (kind enum), `mobs.js` (class), `entityfactory.js` (registration), `js/server/properties.js` (stats), `maps/world_server.json` (spawn placement), plus sprite assets and manifest entries.

**Map files are huge single-line JSON.** `world_client.json` and `world_server.json` are 450KB+ each. Be precise with edits — corruption is easy and hard to debug.

**Map worker bypasses the asset resolver.** `mapworker.js` uses `importScripts('../maps/world_client.js')` directly. If you change map file paths, the worker won't pick up resolver changes.

**Entity kind IDs must be unique and contiguous within their range.** Check the existing ranges in `gametypes.js` before adding new kinds. Gaps or collisions break `Types.isMob()` etc.

**NPC dialog has a duplicate key.** `NpcTalk` in `npc.js` has two `beachnpc` entries — the second silently overrides the first.

**`equalPositions` bug.** In `js/server/map.js`, `equalPositions` compares `pos2.y === pos2.y` (always true). Be aware if using position equality checks.

## Playbooks

### Add/Modify a Mob

1. **`js/gametypes.js`** — Add kind enum to `Types.Entities` (pick next ID in mob range). Add to `kinds` object mapping.
2. **`js/mobs.js`** — Add mob subclass: `Mobs.YourMob = Mob.extend({ ... })` with `init` calling `this._super(id, kind)`.
3. **`js/entityfactory.js`** — Register in `EntityFactory.builders`: `Types.Entities.YOURMOB: Mobs.YourMob`.
4. **`js/server/properties.js`** — Add stats in `Properties.properties`: HP, armor, weapon, XP, drops (array of item kind IDs).
5. **`maps/world_server.json`** — Add to `roamingAreas` (for wandering mobs) or `staticEntities` (for fixed position). Roaming area format: `{ id, x, y, width, height, type: "yourmob", nb: count }`.
6. **Assets** — Add sprite JSON to `sprites/yourmob.json`, PNGs to `img/{1,2,3}/yourmob.png`, then add entries to `js/manifest.js`.
7. **`js/game.js`** — Add to `manifest.gameSprites` array in `manifest.js` if the sprite should preload.

To just change mob stats (HP, damage, drops), only edit `js/server/properties.js`.

### Add/Modify an NPC

1. **`js/gametypes.js`** — Add kind enum in NPC range.
2. **`js/npcs.js`** — Add NPC subclass.
3. **`js/entityfactory.js`** — Register builder.
4. **`js/npc.js`** — Add dialog in `NpcTalk` object: `yournpc: [["Line 1", "Line 2"], "achievement_id"]`.
5. **`maps/world_server.json`** — Add to `staticEntities`: `{ "x,y": "yournpc" }`.
6. **Assets** — Sprite JSON + PNGs + manifest entries.

### Add/Modify an Item

1. **`js/gametypes.js`** — Add kind enum in item range. If weapon: add to `Types.Weapons` ranking array. If armor: add to `Types.Armors` ranking array.
2. **`js/items.js`** — Add item subclass.
3. **`js/entityfactory.js`** — Register builder.
4. **`js/server/properties.js`** — If weapon/armor: add damage/defense values. Add to mob drop tables as needed.
5. **Assets** — Sprite JSON + PNGs + manifest. Items need both the item sprite (`item-youritem`) and the equipped sprite (`youritem`) if it's equippable.

### Change Combat / Game Balance

- **Mob HP, armor, XP:** `js/server/properties.js` — edit the mob's entry
- **Weapon damage:** `js/server/properties.js` — `properties[kind].weapon`
- **Armor defense:** `js/server/properties.js` — `properties[kind].armor`
- **Drop tables:** `js/server/properties.js` — `properties[kind].drops` (array of item kind IDs)
- **Combat formulas:** `js/server/formulas.js` — damage calculation, HP scaling
- **Player level-up:** `js/server/formulas.js` — XP thresholds, HP per level
- **Mob aggro range:** `js/server/mob.js` — `aggroRange` property
- **Mob respawn time:** `js/server/mob.js` — `respawnTimeout`

### Add an Achievement

1. **`js/game.js`** — Find `initAchievements()`. Add entry to the achievements object:
   ```
   { id: N, name: "YOUR_ACHIEVEMENT", desc: "Description", hidden: 0/1 }
   ```
2. **`js/game.js`** — Add unlock trigger. Search for `tryUnlockingAchievement` calls to see patterns. Common triggers: mob kill count, entering an area, talking to NPC, looting item.
3. **`js/npc.js`** — If triggered by NPC talk, reference the achievement ID in `NpcTalk`.

Achievement IDs must be sequential. Check the last ID before adding.

### Modify the Map

**Client map** (`maps/world_client.json`):
- `data` — tile indices (rendering)
- `high` — high tiles drawn over entities
- `animated` — animated tile positions
- `doors` — teleport links: `{ x, y, tx, ty, orientation }`
- `checkpoints` — respawn zones: `{ id, x, y, w, h, s }`
- `musicAreas` — background music regions: `{ id, x, y, w, h }`
- `cameraZones` — viewport bounds for interiors

**Server map** (`maps/world_server.json`):
- `roamingAreas` — mob spawn zones
- `chestAreas` — chest spawn zones with item contents
- `staticEntities` — fixed NPCs, chests, mob spawns by grid position

Both maps share the same grid coordinate system. Client map handles rendering/collision, server map handles gameplay population.

### Change UI / CSS

- **Status bar:** `css/main.css` — search for `#bar-container`, `#healthbar`
- **Intro screen:** `css/main.css` — `#parchment`, `#nameinput`
- **Achievements panel:** `css/main.css` — `.achievement`, `#achievements`
- **Chat:** `css/main.css` — `#chatbox`, `#chatinput`
- **Responsive breakpoints:** `css/main.css` — media queries at 1500px, 1000px, 600px control game scale
- **HTML structure:** `index.html` — all UI containers are in the HTML, shown/hidden via CSS classes

### Add New Game Mechanics

For new systems, understand the game loop:

1. `Game.tick()` calls `Updater.update()` every frame
2. `Updater` advances entity transitions, animations, zoning
3. `Game` processes player input, combat results, entity interactions
4. `GameClient` receives server messages and dispatches handlers
5. `LocalGameServer` processes client messages and sends responses

**To add a new mechanic:**
1. Define any new message types in `js/gametypes.js` if client-server communication is needed
2. Add server-side logic in `js/server/worldserver.js` (handles incoming messages, game state)
3. Add client-side handlers in `js/gameclient.js` (processes server responses)
4. Add game logic in `js/game.js` (player actions, UI updates)
5. Add per-frame updates in `js/updater.js` if the mechanic needs tick-based processing
6. Add rendering in `js/renderer.js` if new visual elements are needed

### Change Audio

- **Sound effects:** `js/audio.js` — `loadSound(name)`. Sounds are in `audio/sounds/`.
- **Music tracks:** `js/audio.js` — `loadMusic(name)`. Music is in `audio/music/`.
- **Music area triggers:** `maps/world_client.json` — `musicAreas` array defines regions and which track plays.
- **Adding new audio:** Add files to `audio/sounds/` or `audio/music/`, add entries to `js/manifest.js`, then reference in code.
- **Audio format:** MP3 is primary. OGG files exist as fallback for older browsers.

### Add a New Sprite

1. Create sprite JSON in `sprites/yoursprite.json` — defines animation frames, dimensions, offsets. Follow an existing sprite as template (e.g., `sprites/rat.json` for mobs).
2. Create PNGs at all 3 scales: `img/1/yoursprite.png`, `img/2/yoursprite.png`, `img/3/yoursprite.png`. Scale 1 is base, scale 2 is 2x, scale 3 is 3x.
3. Add to `js/manifest.js`:
   - `manifest.spriteData.yoursprite` — path to JSON
   - `manifest.sprites.yoursprite` — paths to PNGs at each scale
4. If the sprite should preload at game start, add `"yoursprite"` to the `gameSprites` array in `manifest.js`.
