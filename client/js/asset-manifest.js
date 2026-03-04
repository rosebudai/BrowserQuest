var spriteDataNames = [
    'agent', 'arrow', 'axe', 'bat', 'beachnpc', 'bluesword', 'boss',
    'chest', 'clotharmor', 'coder', 'crab', 'death', 'deathknight',
    'desertnpc', 'eye', 'firefox', 'forestnpc', 'goblin', 'goldenarmor',
    'goldensword', 'guard', 'hand', 'impact', 'item-axe', 'item-bluesword',
    'item-burger', 'item-cake', 'item-clotharmor', 'item-firepotion', 'item-flask',
    'item-goldenarmor', 'item-goldensword', 'item-leatherarmor',
    'item-mailarmor', 'item-morningstar', 'item-platearmor', 'item-redarmor',
    'item-redsword', 'item-sword1', 'item-sword2', 'king', 'lavanpc',
    'leatherarmor', 'loot', 'mailarmor', 'morningstar', 'nyan', 'octocat',
    'ogre', 'platearmor', 'priest', 'rat', 'redarmor', 'redsword', 'rick',
    'scientist', 'shadow16', 'skeleton', 'skeleton2', 'snake', 'sorcerer',
    'sparks', 'spectre', 'sword', 'sword1', 'sword2', 'talk', 'target',
    'villagegirl', 'villager', 'wizard'
];

var spriteImageNames = [
    'achievements', 'agent', 'axe', 'barsheet', 'bat', 'beachnpc', 'bluesword',
    'border', 'boss', 'chest', 'clotharmor', 'coder', 'crab', 'death',
    'deathknight', 'desertnpc', 'eye', 'firefox', 'forestnpc', 'goblin',
    'goldenarmor', 'goldensword', 'guard', 'hand', 'item-axe', 'item-bluesword',
    'item-burger', 'item-cake', 'item-clotharmor', 'item-firepotion', 'item-flask',
    'item-goldenarmor', 'item-goldensword', 'item-leatherarmor',
    'item-mailarmor', 'item-morningstar', 'item-platearmor', 'item-redarmor',
    'item-redsword', 'item-sword1', 'item-sword2', 'king', 'lavanpc',
    'leatherarmor', 'loot', 'mailarmor', 'morningstar', 'nyan', 'octocat',
    'ogre', 'platearmor', 'priest', 'rat', 'redarmor', 'redsword', 'rick',
    'scientist', 'shadow16', 'skeleton', 'skeleton2', 'snake', 'sorcerer',
    'sparks', 'spectre', 'spritesheet', 'sword', 'sword1', 'sword2', 'talk',
    'target', 'tilesheet', 'villagegirl', 'villager', 'wizard', 'wood',
    'wood2', 'wood3'
];

var musicNames = ['beach', 'boss', 'cave', 'desert', 'forest', 'lavaland', 'village'];

var soundNames = [
    'achievement', 'chat', 'chest', 'death', 'firefox', 'heal', 'hit1', 'hit2',
    'hurt', 'kill1', 'kill2', 'loot', 'noloot', 'npc', 'npc-end', 'npctalk',
    'revive', 'teleport'
];

// Build spriteData map: name -> path
var spriteData = {};
spriteDataNames.forEach(function(name) {
    spriteData[name] = 'sprites/' + name + '.json';
});

// Build sprites map: name -> { 1: path, 2: path, 3: path }
var sprites = {};
spriteImageNames.forEach(function(name) {
    sprites[name] = {
        1: 'img/1/' + name + '.png',
        2: 'img/2/' + name + '.png',
        3: 'img/3/' + name + '.png'
    };
});

var manifest = {
    spriteData: spriteData,
    sprites: sprites,
    audio: {
        music: {},
        sounds: {}
    },
    tilesets: {
        1: 'img/1/tilesheet.png',
        2: 'img/2/tilesheet.png',
        3: 'img/3/tilesheet.png'
    },
    maps: {
        world: 'maps/world_client.json',
        worldWorker: 'maps/world_client.js',
        worldServer: 'maps/world_server.json'
    }
};

musicNames.forEach(function(name) {
    manifest.audio.music[name] = 'audio/music/' + name + '.mp3';
});

soundNames.forEach(function(name) {
    manifest.audio.sounds[name] = 'audio/sounds/' + name;
});

export default manifest;
