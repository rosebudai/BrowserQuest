import manifest from './asset-manifest.js';

var resolver = window.__resolveAsset || function(p) { return p; };

export function resolveSprite(name, scale) {
    var path = manifest.sprites[name] && manifest.sprites[name][scale];
    if (!path) throw new Error('Unknown sprite: ' + name + '@' + scale);
    return resolver(path);
}

export function resolveSpriteData(name) {
    var path = manifest.spriteData[name];
    if (!path) throw new Error('Unknown sprite data: ' + name);
    return resolver(path);
}

export function resolveMusic(name) {
    var path = manifest.audio.music[name];
    if (!path) throw new Error('Unknown music: ' + name);
    return resolver(path);
}

export function resolveSound(name) {
    var path = manifest.audio.sounds[name];
    if (!path) throw new Error('Unknown sound: ' + name);
    return resolver(path);
}

export function resolveTileset(scale) {
    var path = manifest.tilesets[scale];
    if (!path) throw new Error('Unknown tileset scale: ' + scale);
    return resolver(path);
}

export function resolveMap(key) {
    var path = manifest.maps[key];
    if (!path) throw new Error('Unknown map: ' + key);
    return resolver(path);
}

export { manifest };
export default { resolveSprite, resolveSpriteData, resolveMusic, resolveSound, resolveTileset, resolveMap, manifest };
