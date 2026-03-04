const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(30000);

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  const categories = [];

  function logCategory(name, passed, total, details) {
    categories.push({ name, passed: passed === total, passCount: passed, total, details });
    const icon = passed === total ? '\u2713' : '\u2717';
    const color = passed === total ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${name}: ${passed}/${total} passed`);
    if (details && details.length > 0 && passed < total) {
      details.forEach(d => {
        if (!d.ok) console.log(`    \x1b[31m- ${d.name}: ${d.reason}\x1b[0m`);
      });
    }
  }

  try {
    // Navigate and start game
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    // Enter name and click play
    await page.evaluate(() => {
      const input = document.getElementById('nameinput');
      input.value = 'AssetTest';
      input.setAttribute('value', 'AssetTest');
      input.dispatchEvent(new Event('keyup', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    await page.click('.play div');

    // Wait for game to be ready
    await page.waitForFunction(
      () => window.__game && window.__game.started === true,
      null,
      { timeout: 30000 }
    );
    console.log('Game started, running asset tests...\n');

    // ---- Category 1: Sprite JSON files ----
    const spriteNames = [
      'agent', 'arrow', 'axe', 'bat', 'beachnpc', 'bluesword', 'boss',
      'chest', 'clotharmor', 'coder', 'crab', 'death', 'deathknight',
      'desertnpc', 'eye', 'firefox', 'forestnpc', 'goblin', 'goldenarmor',
      'goldensword', 'guard', 'hand', 'impact', 'item-axe', 'item-bluesword',
      'item-burger', 'item-cake', 'item-firepotion', 'item-flask',
      'item-goldenarmor', 'item-goldensword', 'item-leatherarmor',
      'item-mailarmor', 'item-morningstar', 'item-platearmor', 'item-redarmor',
      'item-redsword', 'item-sword1', 'item-sword2', 'king', 'lavanpc',
      'leatherarmor', 'loot', 'mailarmor', 'morningstar', 'nyan', 'octocat',
      'ogre', 'platearmor', 'priest', 'rat', 'redarmor', 'redsword', 'rick',
      'scientist', 'shadow16', 'skeleton', 'skeleton2', 'snake', 'sorcerer',
      'sparks', 'spectre', 'sword', 'sword1', 'sword2', 'talk', 'target',
      'villagegirl', 'villager', 'wizard'
    ];

    const jsonResults = await page.evaluate(async (names) => {
      const results = [];
      for (const name of names) {
        try {
          const resp = await fetch('sprites/' + name + '.json');
          if (!resp.ok) {
            results.push({ name, ok: false, reason: 'HTTP ' + resp.status });
            continue;
          }
          const data = await resp.json();
          if (!data.id) {
            results.push({ name, ok: false, reason: 'Missing id field' });
            continue;
          }
          results.push({ name, ok: true });
        } catch (e) {
          results.push({ name, ok: false, reason: e.message });
        }
      }
      return results;
    }, spriteNames);

    const jsonPassed = jsonResults.filter(r => r.ok).length;
    logCategory('Sprite JSON files', jsonPassed, spriteNames.length, jsonResults);

    // ---- Category 2: Sprite images at active scale ----
    const spriteImageResults = await page.evaluate(() => {
      const game = window.__game;
      const sprites = game.sprites;
      const results = [];
      for (const name in sprites) {
        const s = sprites[name];
        results.push({
          name: name,
          ok: s.isLoaded === true,
          reason: s.isLoaded ? '' : 'isLoaded is false'
        });
      }
      return results;
    });

    const imgPassed = spriteImageResults.filter(r => r.ok).length;
    logCategory('Sprite images (active scale)', imgPassed, spriteImageResults.length, spriteImageResults);

    // ---- Category 3: Tileset images ----
    const tilesetLoaded = await page.evaluate(() => {
      return window.__game.map.tilesetsLoaded === true;
    });
    logCategory('Tileset images', tilesetLoaded ? 1 : 0, 1,
      [{ name: 'tilesetsLoaded', ok: tilesetLoaded, reason: tilesetLoaded ? '' : 'tilesetsLoaded is false' }]);

    // ---- Category 4: Map data ----
    const mapLoaded = await page.evaluate(() => {
      return window.__game.map.mapLoaded === true;
    });
    logCategory('Map data', mapLoaded ? 1 : 0, 1,
      [{ name: 'mapLoaded', ok: mapLoaded, reason: mapLoaded ? '' : 'mapLoaded is false' }]);

    // ---- Category 5: Audio sounds ----
    const expectedSounds = [
      'loot', 'hit1', 'hit2', 'hurt', 'heal', 'chat', 'revive', 'death',
      'firefox', 'achievement', 'kill1', 'kill2', 'noloot', 'teleport',
      'chest', 'npc', 'npc-end'
    ];

    const soundResults = await page.evaluate((names) => {
      const game = window.__game;
      const sounds = game.audioManager.sounds;
      return names.map(name => ({
        name,
        ok: sounds[name] != null && sounds[name].length > 0,
        reason: sounds[name] == null ? 'not loaded' : (sounds[name].length === 0 ? 'empty array' : '')
      }));
    }, expectedSounds);

    const soundPassed = soundResults.filter(r => r.ok).length;
    logCategory('Audio sounds', soundPassed, expectedSounds.length, soundResults);

    // ---- Category 6: Audio music ----
    const expectedMusic = ['village', 'beach', 'forest', 'cave', 'desert', 'lavaland', 'boss'];

    const musicResults = await page.evaluate((names) => {
      const game = window.__game;
      const sounds = game.audioManager.sounds;
      return names.map(name => ({
        name,
        ok: sounds[name] != null && sounds[name].length > 0,
        reason: sounds[name] == null ? 'not loaded' : (sounds[name].length === 0 ? 'empty array' : '')
      }));
    }, expectedMusic);

    const musicPassed = musicResults.filter(r => r.ok).length;
    logCategory('Audio music', musicPassed, expectedMusic.length, musicResults);

  } catch (err) {
    console.error('\x1b[31mFATAL ERROR:\x1b[0m', err.message);
  }

  // Summary
  console.log('\n--- ASSET TEST RESULTS ---');
  const allPassed = categories.every(c => c.passed);
  const catPassed = categories.filter(c => c.passed).length;
  console.log(`${catPassed}/${categories.length} categories passed`);

  if (errors.length) {
    console.log(`\nConsole errors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  } else {
    console.log('No console errors.');
  }

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
