import manifest from './manifest.js';

export function resolveSprite(name, scale) {
    const path = manifest.sprites[name] && manifest.sprites[name][scale];
    if (!path) throw new Error('Unknown sprite: ' + name + '@' + scale);
    return path;
}

export function resolveSpriteData(name) {
    const path = manifest.spriteData[name];
    if (!path) throw new Error('Unknown sprite data: ' + name);
    return path;
}

export function resolveMusic(name) {
    const path = manifest.audio.music[name];
    if (!path) throw new Error('Unknown music: ' + name);
    return path;
}

export function resolveSound(name) {
    const path = manifest.audio.sounds[name];
    if (!path) throw new Error('Unknown sound: ' + name);
    return path;
}

export function resolveTileset(scale) {
    const path = manifest.tilesets[scale];
    if (!path) throw new Error('Unknown tileset scale: ' + scale);
    return path;
}

export function resolveMap(key) {
    const path = manifest.maps[key];
    if (!path) throw new Error('Unknown map: ' + key);
    return path;
}

export default { resolveSprite, resolveSpriteData, resolveMusic, resolveSound, resolveTileset, resolveMap };
