// Sprite JSON files loaded via fetch instead of RequireJS text! plugin
var spriteNames = [
    "agent", "arrow", "axe", "bat", "beachnpc", "bluesword", "boss",
    "chest", "clotharmor", "coder", "crab", "death", "deathknight",
    "desertnpc", "eye", "firefox", "forestnpc", "goblin", "goldenarmor",
    "goldensword", "guard", "hand", "impact", "item-axe", "item-bluesword",
    "item-burger", "item-cake", "item-firepotion", "item-flask",
    "item-goldenarmor", "item-goldensword", "item-leatherarmor",
    "item-mailarmor", "item-morningstar", "item-platearmor", "item-redarmor",
    "item-redsword", "item-sword1", "item-sword2", "king", "lavanpc",
    "leatherarmor", "loot", "mailarmor", "morningstar", "nyan", "octocat",
    "ogre", "platearmor", "priest", "rat", "redarmor", "redsword", "rick",
    "scientist", "shadow16", "skeleton", "skeleton2", "snake", "sorcerer",
    "sparks", "spectre", "sword", "sword1", "sword2", "talk", "target",
    "villagegirl", "villager", "wizard"
];

async function loadSprites() {
    var sprites = {};
    var responses = await Promise.all(
        spriteNames.map(function(name) {
            return fetch("sprites/" + name + ".json").then(function(r) { return r.json(); });
        })
    );
    responses.forEach(function(sprite) {
        sprites[sprite.id] = sprite;
    });
    return sprites;
}

export default loadSprites;
