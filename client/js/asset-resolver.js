import manifest from './asset-manifest.js';

function resolve(p) { return (window.__resolveAsset || function(q) { return q; })(p); }

export function resolveSprite(name, scale) {
    var path = manifest.sprites[name] && manifest.sprites[name][scale];
    if (!path) throw new Error('Unknown sprite: ' + name + '@' + scale);
    return resolve(path);
}

export function resolveSpriteData(name) {
    var path = manifest.spriteData[name];
    if (!path) throw new Error('Unknown sprite data: ' + name);
    return resolve(path);
}

export function resolveMusic(name) {
    var path = manifest.audio.music[name];
    if (!path) throw new Error('Unknown music: ' + name);
    return resolve(path);
}

export function resolveSound(name) {
    var path = manifest.audio.sounds[name];
    if (!path) throw new Error('Unknown sound: ' + name);
    return resolve(path);
}

export function resolveTileset(scale) {
    var path = manifest.tilesets[scale];
    if (!path) throw new Error('Unknown tileset scale: ' + scale);
    return resolve(path);
}

export function resolveMap(key) {
    var path = manifest.maps[key];
    if (!path) throw new Error('Unknown map: ' + key);
    return resolve(path);
}

export default { resolveSprite, resolveSpriteData, resolveMusic, resolveSound, resolveTileset, resolveMap };
