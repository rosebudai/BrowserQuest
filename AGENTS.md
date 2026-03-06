# BrowserQuest

BrowserQuest is an HTML5 canvas MMORPG running in the browser with a local in-browser game server that emulates the multiplayer protocol. The modernized codebase uses native ES modules and ES6 classes end-to-end, with config-driven entity behavior for mobs, NPCs, and items. Client runtime, world simulation, assets, and map data are all wired through explicit imports and manifest-based path resolution.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run lint` | ESLint — catches undeclared refs, `var`, dead code |
| `npm test` | Unit tests (node:test) — config tables, formulas, gametypes |
| `npm run check` | Lint + tests combined |
| `python3 -m http.server 8080 --directory client` | Serve for browser playtesting |
| `NODE_PATH=/usr/local/share/npm-global/lib/node_modules node client/tests/smoke-test.cjs` | Headless Playwright smoke test |

Run `npm run check` before committing. Lint must have **0 errors** (warnings are acceptable).

## File Map

### Core Game Loop

| File | Purpose |
|------|---------|
| `client/index.html` | HTML shell and module entrypoint for the game client |
| `client/js/main.js` | Bootstraps app/game lifecycle and DOM event wiring |
| `client/js/app.js` | UI state orchestration (intro flow, chat, achievements, storage hooks) |
| `client/js/game.js` | Main runtime state, entity lifecycle, achievements, player interaction |
| `client/js/updater.js` | Per-tick simulation updates (movement, transitions, zoning) |
| `client/js/renderer.js` | Canvas rendering pipeline, camera framing, overlays |
| `client/js/camera.js` | World-to-screen translation and viewport tracking |

### Entities

| File | Purpose |
|------|---------|
| `client/js/gametypes.js` | Entity/message enums, kind <-> string mapping, type guards (`isMob/isNpc/isItem`) |
| `client/js/entity.js` | Base entity class |
| `client/js/character.js` | Shared moving/combat-capable entity behavior |
| `client/js/player.js` | Player-specific movement, equipment, and state |
| `client/js/mob.js` | Generic mob class reading behavior from `mob-config.js` |
| `client/js/npc.js` | Generic NPC class reading dialog/idle data from `npc-config.js` |
| `client/js/item.js` | Generic item class reading type/loot behavior from `item-config.js` |
| `client/js/entityfactory.js` | Config-driven entity constructor routing (`Types.isMob/isNpc/isItem`) |
| `client/js/warrior.js` | Warrior/player runtime entity |
| `client/js/chest.js` | Chest entity |

### Config Tables

| File | Purpose |
|------|---------|
| `client/js/mob-config.js` | Mob behavior tuning (speed, aggro, idle/attack pacing, flags) |
| `client/js/npc-config.js` | NPC dialog content and optional per-NPC overrides (e.g. `idleSpeed`) |
| `client/js/item-config.js` | Item type, loot messaging, optional on-loot action |
| `client/js/server/properties.js` | Server-side combat/drop stats (HP, armor, weapon level, drops) |

### Assets

| File | Purpose |
|------|---------|
| `client/js/manifest.js` | Canonical asset manifest (sprites, audio, tilesets, map paths, preloads) |
| `client/js/asset-resolver.js` | Manifest lookup helpers used by runtime code |
| `client/js/sprite.js` | Sprite object loading/animation metadata integration |
| `client/js/sprites.js` | Sprite data loading utilities |
| `client/sprites/*.json` | Sprite animation metadata |
| `client/img/{1,2,3}/*.png` | Multi-scale sprite atlases/assets |

### Map & World

| File | Purpose |
|------|---------|
| `client/js/map.js` | Client map loading, collision/plateau/camera/music area setup |
| `client/js/mapworker.js` | Worker-based map preprocessing path |
| `client/maps/world_client.json` | Client world geometry/tiles/collisions/areas |
| `client/maps/world_client.js` | Worker-consumable map payload |
| `client/maps/world_server.json` | Server world data (spawns, chests, static entities) |

### Local Server

| File | Purpose |
|------|---------|
| `client/js/server/localgameserver.js` | In-browser server transport and handshake bridge |
| `client/js/server/worldserver.js` | Core world simulation loop and entity management |
| `client/js/server/map.js` | Server map model and zone/group utilities |
| `client/js/server/player.js` | Server player simulation |
| `client/js/server/mob.js` | Server mob simulation (aggro/combat/respawn) |
| `client/js/server/formulas.js` | Combat and progression formulas |
| `client/js/server/properties.js` | Stat/drop table consumed by combat logic |

### Networking

| File | Purpose |
|------|---------|
| `client/js/gameclient.js` | Client message protocol handlers (`WELCOME`, `SPAWN`, `MOVE`, etc.) |
| `client/js/server/message.js` | Server-side message construction helpers |
| `client/js/server/format.js` | Wire-format helpers for server message payloads |

### Audio & UI

| File | Purpose |
|------|---------|
| `client/js/audio.js` | Music/sfx loading, playback, fades, and area transitions |
| `client/css/main.css` | Core game UI styling and responsive behavior |
| `client/css/achievements.css` | Achievement-specific UI styling |

## Conventions

**ESM imports only.**
No runtime globals for game modules. Every dependency is imported explicitly (for example `import Types from './gametypes.js'`).

**Native ES6 classes only.**
No `Class.extend`. Inheritance uses `class ... extends ...` and `super(...)`.

**Config-driven entities.**
`mob.js`, `npc.js`, and `item.js` are generic classes. Behavior/content lives in `mob-config.js`, `npc-config.js`, and `item-config.js`.

**Entity kind system is authoritative.**
Every entity kind must be added to `gametypes.js` (`Types.Entities` + `kinds` mapping). Runtime routing relies on `Types.isMob/isNpc/isItem` and kind-string resolution.

**EntityFactory is auto-routing, not registry-driven.**
`entityfactory.js` is intentionally minimal and uses type guards (`Types.isMob/isNpc/isItem`) to instantiate generic classes. Do not add per-entity factory registrations for mobs/NPCs/items.

**DOM and collections are modern JS.**
No jQuery, no underscore: use vanilla DOM APIs and native array/object methods.

**HTML bootstrap is module-first.**
Use the module entry pattern (`<script type="module" src="js/main.js"></script>`) as the canonical game bootstrap.

## Asset System

Assets are manifest-driven. `client/js/manifest.js` is the source of truth for sprite metadata paths, sprite image paths (all scales), map paths, tilesets, and audio files. Runtime code should resolve asset paths through `asset-resolver.js` instead of hardcoding paths across modules.

## Gotchas

**Map worker path is special-cased.**
`client/js/mapworker.js` uses `importScripts('../maps/world_client.js')` directly. Changes to map file names/locations must keep worker loading behavior in sync.

**Map files are large and easy to break.**
`client/maps/world_client.json` and `client/maps/world_server.json` are large data files; prefer precise, minimal edits and validate JSON integrity.

**Kind IDs must stay unique and consistent.**
When adding entities, update both `Types.Entities` and `kinds` in `gametypes.js`. ID collisions or missing mappings break `getKindAsString`, type guards, spawning, and config lookup.

## Playbooks

### Add Mob

1. **`client/js/gametypes.js`**: Add new mob kind enum and `kinds` mapping.
2. **`client/js/mob-config.js`**: Add mob config entry (`moveSpeed`, `idleSpeed`, `atkSpeed`, etc.).
3. **`client/js/server/properties.js`**: Add combat stats and drop table.
4. **`client/maps/world_server.json`**: Add spawn placement (`roamingAreas` or static placement, depending on behavior).
5. **Sprite assets + manifest**: Add sprite JSON, images (`img/1`, `img/2`, `img/3`), and manifest entries.

No `entityfactory.js` edits are needed.

### Add NPC

1. **`client/js/gametypes.js`**: Add new NPC kind enum and `kinds` mapping.
2. **`client/js/npc-config.js`**: Add NPC dialog and optional `idleSpeed`.
3. **`client/maps/world_server.json`**: Add NPC spawn in static entities.
4. **Sprite assets + manifest**: Add sprite JSON, images, and manifest entries.

No `entityfactory.js` edits are needed. NPC dialog belongs in `npc-config.js`, not `npc.js`.

### Add Item

1. **`client/js/gametypes.js`**: Add item kind enum and `kinds` mapping. If weapon/armor, also update ranking arrays (`rankedWeapons`/`rankedArmors`).
2. **`client/js/item-config.js`**: Add item entry (`type`, `lootMessage`, optional `onLoot`).
3. **`client/js/server/properties.js`**: For weapon/armor, add server stat support and wire into drops where needed.
4. **Sprite assets + manifest**: Add sprite JSON, item sprite image assets, and manifest entries.

No `entityfactory.js` edits are needed.

### Change Combat

1. Edit **`client/js/server/properties.js`** for mob HP/armor/weapon levels and drop tables.
2. Edit **`client/js/server/formulas.js`** for global damage/progression formulas.
3. Edit **`client/js/server/mob.js`** for aggro/respawn timing behavior.
4. Validate client feedback paths in **`client/js/game.js`** and **`client/js/gameclient.js`** if message semantics changed.

### Add Achievement

1. Add achievement metadata in **`client/js/game.js`** inside `initAchievements()`.
2. Hook unlock conditions by calling `tryUnlockingAchievement(...)` in relevant gameplay paths.
3. If tied to NPC interaction, trigger from gameplay/NPC interaction flow; NPC text itself is maintained in `npc-config.js`.
4. Keep achievement IDs unique and sequential.

### Modify Map

1. Edit **`client/maps/world_client.json`** for rendering/collision/doors/checkpoints/music/camera data.
2. Edit **`client/maps/world_server.json`** for gameplay population (spawns/chests/static entities).
3. If worker map loading is involved, ensure **`client/maps/world_client.js`** remains valid for `mapworker.js`.
4. Verify coordinate consistency between client and server maps.

### Change UI

1. Update DOM structure in **`client/index.html`** as needed.
2. Update styling in **`client/css/main.css`** and **`client/css/achievements.css`**.
3. Update event wiring/behavior in **`client/js/app.js`** and **`client/js/main.js`**.
4. Keep entrypoint script usage module-based (`js/main.js`).

### Add Mechanics

1. Add/extend message types in **`client/js/gametypes.js`** if protocol changes are needed.
2. Implement server-side state changes in **`client/js/server/worldserver.js`** (and related server modules).
3. Handle new messages in **`client/js/gameclient.js`**.
4. Integrate client gameplay/UI behavior in **`client/js/game.js`** and update per-tick logic in **`client/js/updater.js`** if required.
5. Render new visuals in **`client/js/renderer.js`**.

### Change Audio

1. Add/update audio files and register them in **`client/js/manifest.js`** (`audio.music` / `audio.sounds`).
2. Integrate playback behavior in **`client/js/audio.js`**.
3. Update area-driven music triggers via map data where appropriate (`musicAreas` in `world_client.json`).

### Add Sprite

1. Add sprite metadata JSON in **`client/sprites/`**.
2. Add PNG assets for all scales in **`client/img/1`**, **`client/img/2`**, **`client/img/3`**.
3. Register sprite metadata and image paths in **`client/js/manifest.js`** (`spriteData`, `sprites`).
4. If runtime preload is needed, add sprite name to `gameSprites` in **`client/js/manifest.js`**.
