// Sprite JSON files loaded via fetch, driven by the asset manifest.
import manifest from './asset-manifest.js';
import { resolveSpriteData } from './asset-resolver.js';

async function loadSprites() {
    var spriteNames = Object.keys(manifest.spriteData);
    var sprites = {};

    var results = await Promise.all(
        spriteNames.map(function(name) {
            return fetch(resolveSpriteData(name))
                .then(function(r) {
                    if (!r.ok) {
                        throw new Error('HTTP ' + r.status + ' for ' + name);
                    }
                    return r.json();
                })
                .then(function(data) {
                    return { name: name, data: data, ok: true };
                })
                .catch(function(err) {
                    log.error('Failed to load sprite data: ' + name + ' — ' + err.message);
                    return { name: name, data: null, ok: false };
                });
        })
    );

    results.forEach(function(result) {
        if (result.ok && result.data && result.data.id) {
            sprites[result.data.id] = result.data;
        }
    });

    var loaded = results.filter(function(r) { return r.ok; }).length;
    var failed = results.length - loaded;
    if (failed > 0) {
        log.warn('Sprite loading: ' + loaded + '/' + results.length + ' succeeded, ' + failed + ' failed');
    }

    return sprites;
}

export default loadSprites;
