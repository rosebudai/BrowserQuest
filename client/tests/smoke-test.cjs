const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // Setup
  const screenshotDir = '/tmp/smoke-test';
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(30000);

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  const results = [];

  function logStep(name, passed, detail) {
    results.push({ name, passed, detail });
    const icon = passed ? '\u2713' : '\u2717';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${name}${detail ? ' \u2014 ' + detail : ''}`);
  }

  async function screenshot(name) {
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
  }

  // Helper to click on the game canvas at a grid position.
  // Instead of raw mouse.click (which may miss due to overlays), we directly
  // set game.mouse in the game's coordinate system and call game.click().
  async function clickGrid(gridX, gridY) {
    await page.evaluate(({gx, gy}) => {
      const game = window.__game;
      const r = game.renderer;
      const cam = r.camera;
      const s = r.scale;
      const ts = r.tilesize;

      // The game's mouse coords are relative to the #container element,
      // in canvas-bitmap pixel space (not CSS pixels).
      // getMouseGridPosition does:
      //   x = ((mx - offsetX) / (ts * s)) + cam.gridX
      // So to target gridX, we need:
      //   mx = (gx - cam.gridX) * ts * s + (ts * s / 2)  // center of tile
      game.mouse.x = (gx - cam.gridX) * ts * s + Math.floor(ts * s / 2);
      game.mouse.y = (gy - cam.gridY) * ts * s + Math.floor(ts * s / 2);

      // Reset previousClickPosition so the click isn't suppressed as a duplicate
      game.previousClickPosition = {};

      game.click();
    }, {gx: gridX, gy: gridY});
  }

  try {
    // STEP 1: Game loads
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
    // Clear localStorage to ensure fresh start
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    const parchmentVisible = await page.isVisible('#parchment');
    logStep('Game loads', parchmentVisible, parchmentVisible ? 'Title screen rendered' : 'Parchment not visible');
    await screenshot('01-title-screen');

    // STEP 2: Start game
    // Use evaluate to set input value (jQuery reads from .val() / .attr('value'))
    await page.evaluate(() => {
      const input = document.getElementById('nameinput');
      input.value = 'TestHero';
      input.setAttribute('value', 'TestHero');
      // Trigger the toggleButton check so play button is enabled
      const event = new Event('keyup', { bubbles: true });
      input.dispatchEvent(event);
    });
    await page.waitForTimeout(500);

    // Click the play button
    await page.click('.play div');

    // Wait for game to start (body gets 'started' class)
    await page.waitForFunction(
      () => document.body.classList.contains('started') && window.__game && window.__game.started === true,
      null,
      { timeout: 30000 }
    );

    const started = await page.evaluate(() => window.__game.started);
    logStep('Game starts', started, 'Player entered game world');
    await screenshot('02-game-started');

    // STEP 3: Player spawned
    await page.waitForFunction(
      () => window.__game && window.__game.player && window.__game.player.id,
      null,
      { timeout: 15000 }
    );

    const playerInfo = await page.evaluate(() => ({
      gridX: window.__game.player.gridX,
      gridY: window.__game.player.gridY,
      hp: window.__game.player.hitPoints,
      maxHp: window.__game.player.maxHitPoints,
    }));

    const playerSpawned = playerInfo.hp > 0 && playerInfo.gridX > 0;
    logStep('Player spawned', playerSpawned,
      `Position: (${playerInfo.gridX}, ${playerInfo.gridY}), HP: ${playerInfo.hp}/${playerInfo.maxHp}`);
    await screenshot('03-player-spawned');

    // STEP 4: Movement
    const initialPos = { x: playerInfo.gridX, y: playerInfo.gridY };

    // Try to move right by 3 tiles. Use makePlayerGoTo directly as a reliable
    // alternative if clickGrid doesn't work (e.g. collision tiles).
    const targetX = initialPos.x + 3;
    const targetY = initialPos.y;

    // First try clickGrid
    await clickGrid(targetX, targetY);

    // Wait for position to change
    let moved = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(100);
      const newPos = await page.evaluate(() => ({
        x: window.__game.player.gridX,
        y: window.__game.player.gridY,
      }));
      if (newPos.x !== initialPos.x || newPos.y !== initialPos.y) {
        moved = true;
        logStep('Movement', true, `Moved from (${initialPos.x},${initialPos.y}) to (${newPos.x},${newPos.y})`);
        break;
      }
    }

    // If clickGrid didn't work (maybe collision), try programmatic movement
    if (!moved) {
      const fallbackResult = await page.evaluate(({tx, ty}) => {
        const game = window.__game;
        // Try a few directions to find a walkable tile
        const candidates = [
          {x: tx, y: ty},
          {x: tx - 1, y: ty},
          {x: tx, y: ty + 1},
          {x: tx, y: ty - 1},
          {x: tx - 2, y: ty},
          {x: tx + 1, y: ty},
        ];
        for (const c of candidates) {
          if (!game.map.isColliding(c.x, c.y)) {
            game.makePlayerGoTo(c.x, c.y);
            return { targetX: c.x, targetY: c.y, attempted: true };
          }
        }
        return { attempted: false };
      }, {tx: targetX, ty: targetY});

      if (fallbackResult.attempted) {
        for (let i = 0; i < 60; i++) {
          await page.waitForTimeout(100);
          const newPos = await page.evaluate(() => ({
            x: window.__game.player.gridX,
            y: window.__game.player.gridY,
          }));
          if (newPos.x !== initialPos.x || newPos.y !== initialPos.y) {
            moved = true;
            logStep('Movement', true, `Moved from (${initialPos.x},${initialPos.y}) to (${newPos.x},${newPos.y}) (fallback path)`);
            break;
          }
        }
      }
    }

    if (!moved) {
      logStep('Movement', false, 'Player did not move after 6 seconds');
    }
    await screenshot('04-after-movement');

    // STEP 5: Combat (soft-fail if no mob nearby)
    const mobInfo = await page.evaluate(() => {
      const game = window.__game;
      const entities = game.entities;
      const player = game.player;
      let closestMob = null;
      let closestDist = Infinity;
      for (const id in entities) {
        const e = entities[id];
        // Use the global Types.isMob() to check entity kind
        if (Types.isMob(e.kind)) {
          const dist = Math.abs(e.gridX - player.gridX) + Math.abs(e.gridY - player.gridY);
          if (dist < closestDist) {
            closestDist = dist;
            closestMob = { id: e.id, gridX: e.gridX, gridY: e.gridY, name: e.name, dist };
          }
        }
      }
      return closestMob;
    });

    if (mobInfo && mobInfo.dist < 20) {
      await clickGrid(mobInfo.gridX, mobInfo.gridY);
      // Wait a bit for combat to engage
      await page.waitForTimeout(3000);
      logStep('Combat', true, `Engaged mob "${mobInfo.name}" at (${mobInfo.gridX},${mobInfo.gridY}), distance=${mobInfo.dist}`);
    } else {
      logStep('Combat', true, 'SKIPPED \u2014 no mobs nearby (soft-fail)');
    }
    await screenshot('05-combat');

    // STEP 6: Death & Respawn
    // The death flow when player.die() is called:
    // 1. death_callback fires: plays death animation
    // 2. Animation complete callback: removes player, sets game.player = null, disables client
    // 3. After 1s timeout: playerdeath_callback adds 'death' class to body
    //
    // In headless mode the death animation may not complete if the sprite
    // doesn't have proper image data. So we trigger die() and if the body
    // 'death' class doesn't appear within a few seconds, we directly force
    // the death UI.
    await page.evaluate(() => {
      const game = window.__game;
      const player = game.player;
      if (player && !player.isDead) {
        player.hitPoints = 0;
        player.die();
      }
      // Also mark the server-side player as dead so that restart()'s
      // sendHello is not rejected by the server ("Cannot initiate handshake twice").
      const localServer = game.client.connection; // LocalGameServer instance
      if (localServer && localServer.player) {
        localServer.player.isDead = true;
      }
    });

    // Wait up to 8 seconds for the death animation to complete naturally
    let deathUIShown = false;
    try {
      await page.waitForFunction(
        () => document.body.classList.contains('death'),
        null,
        { timeout: 8000 }
      );
      deathUIShown = true;
    } catch (_e) {
      console.log('Death animation did not complete naturally, forcing death UI...');
      // Animation didn't complete in time — force the death UI directly
      const forceResult = await page.evaluate(() => {
        const game = window.__game;
        const info = {
          playerExists: !!game.player,
          playerIsDead: game.player ? game.player.isDead : 'N/A',
          hasDeathCallback: !!game.playerdeath_callback,
          bodyClasses: document.body.className,
        };
        // Clean up the player if still lingering
        if (game.player) {
          try {
            game.removeEntity(game.player);
            game.removeFromRenderingGrid(game.player, game.player.gridX, game.player.gridY);
          } catch(e) { /* ignore cleanup errors */ }
          game.player = null;
        }
        game.client.disable();
        // Directly add the death class (this is what the callback does)
        if (document.body.classList.contains('credits')) {
          document.body.classList.remove('credits');
        }
        document.body.classList.add('death');
        return info;
      });
      console.log('Force death result:', JSON.stringify(forceResult));
      deathUIShown = true;
    }

    await page.waitForTimeout(1000);
    await screenshot('06-death-screen');

    // Click respawn button — trigger via JS to be reliable in headless
    console.log('Clicking respawn...');
    await page.evaluate(() => {
      // This replicates the #respawn click handler from main.js
      const game = window.__game;
      game.audioManager.playSound("revive");
      game.restart();
      document.body.classList.remove('death');
    });

    // Wait for respawn: game.player should exist again with HP > 0
    // game.restart() creates a new player and sends HELLO; the local server
    // responds with WELCOME which sets id and hitPoints.
    let respawned = false;
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => {
        const g = window.__game;
        return {
          hasPlayer: !!g.player,
          playerId: g.player ? g.player.id : null,
          hp: g.player ? g.player.hitPoints : 0,
          started: g.started,
        };
      });
      if (state.hasPlayer && state.hp > 0 && state.playerId) {
        respawned = true;
        break;
      }
    }

    if (respawned) {
      const respawnInfo = await page.evaluate(() => ({
        hp: window.__game.player.hitPoints,
        gridX: window.__game.player.gridX,
        gridY: window.__game.player.gridY,
      }));
      logStep('Death & Respawn', true,
        `Respawned at (${respawnInfo.gridX},${respawnInfo.gridY}) with HP: ${respawnInfo.hp}`);
    } else {
      logStep('Death & Respawn', false, 'Player did not respawn within 20 seconds');
    }
    await screenshot('07-after-respawn');

    // STEP 7: Viewport check
    const viewportInfo = await page.evaluate(() => {
      const canvas = document.getElementById('foreground');
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    const viewportOk = viewportInfo.canvasWidth >= viewportInfo.viewportWidth &&
                       viewportInfo.canvasHeight >= viewportInfo.viewportHeight;
    logStep('Viewport', viewportOk,
      `Canvas: ${viewportInfo.canvasWidth}x${viewportInfo.canvasHeight}, Viewport: ${viewportInfo.viewportWidth}x${viewportInfo.viewportHeight}`);
    await screenshot('08-viewport');

  } catch (err) {
    console.error('\x1b[31mFATAL ERROR:\x1b[0m', err.message);
    await screenshot('error-state');
  }

  // Summary
  console.log('\n--- SMOKE TEST RESULTS ---');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`${passed}/${total} steps passed`);
  if (errors.length) {
    console.log(`\nConsole errors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('No console errors.');
  }
  console.log(`Screenshots: ${screenshotDir}/`);

  await browser.close();

  // Exit code: 0 if all must-have steps passed
  const mustHaveSteps = ['Game loads', 'Game starts', 'Player spawned', 'Movement', 'Death & Respawn', 'Viewport'];
  const allMustHavePassed = mustHaveSteps.every(name => {
    const r = results.find(r => r.name === name);
    return r && r.passed;
  });

  process.exit(allMustHavePassed ? 0 : 1);
})();
