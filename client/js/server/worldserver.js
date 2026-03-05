import Types from '../gametypes.js';
import log from '../lib/log.js';
import Entity from './entity.js';
import Character from './character.js';
import Mob from './mob.js';
import ServerMap from './map.js';
import Npc from './npc.js';
import Player from './player.js';
import Item from './item.js';
import MobArea from './mobarea.js';
import ChestArea from './chestarea.js';
import Chest from './chest.js';
import Messages from './message.js';
import Properties from './properties.js';
import Utils from './utils.js';
import { check } from './format.js';

// ======= GAME SERVER ========

class WorldServer {
    constructor(id, maxPlayers, websocketServer) {
        const self = this;

        this.id = id;
        this.maxPlayers = maxPlayers;
        this.server = websocketServer;
        this.ups = 50;
        
        this.map = null;
        
        this.entities = {};
        this.players = {};
        this.mobs = {};
        this.attackers = {};
        this.items = {};
        this.equipping = {};
        this.hurt = {};
        this.npcs = {};
        this.mobAreas = [];
        this.chestAreas = [];
        this.groups = {};
        
        this.outgoingQueues = {};
        
        this.itemCount = 0;
        this.playerCount = 0;
        
        this.zoneGroupsReady = false;
        
        this.onPlayerConnect(function(player) {
            player.onRequestPosition(function() {
                if(player.lastCheckpoint) {
                    return player.lastCheckpoint.getRandomPosition();
                } else {
                    return self.map.getRandomStartingPosition();
                }
            });
        });
        
        this.onPlayerEnter(function(player) {
            log.info(player.name + " has joined "+ self.id);
            
            if(!player.hasEnteredGame) {
                self.incrementPlayerCount();
            }
            
            // Number of players in this world
            self.pushToPlayer(player, new Messages.Population(self.playerCount));
            self.pushRelevantEntityListTo(player);
    
            const move_callback = function(x, y) {
                log.debug(player.name + " is moving to (" + x + ", " + y + ").");
                
                player.forEachAttacker(function(mob) {
                    const target = self.getEntityById(mob.target);
                    if(target) {
                        const pos = self.findPositionNextTo(mob, target);
                        if(mob.distanceToSpawningPoint(pos.x, pos.y) > 50) {
                            mob.clearTarget();
                            mob.forgetEveryone();
                            player.removeAttacker(mob);
                        } else {
                            self.moveEntity(mob, pos.x, pos.y);
                        }
                    }
                });
            };

            player.onMove(move_callback);
            player.onLootMove(move_callback);
            
            player.onZone(function() {
                const hasChangedGroups = self.handleEntityGroupMembership(player);
                
                if(hasChangedGroups) {
                    self.pushToPreviousGroups(player, new Messages.Destroy(player));
                    self.pushRelevantEntityListTo(player);
                }
            });

            player.onBroadcast(function(message, ignoreSelf) {
                self.pushToAdjacentGroups(player.group, message, ignoreSelf ? player.id : null);
            });
            
            player.onBroadcastToZone(function(message, ignoreSelf) {
                self.pushToGroup(player.group, message, ignoreSelf ? player.id : null);
            });
    
            player.onExit(function() {
                log.info(player.name + " has left the game.");
                self.removePlayer(player);
                self.decrementPlayerCount();
                
                if(self.removed_callback) {
                    self.removed_callback();
                }
            });
            
            if(self.added_callback) {
                self.added_callback();
            }
        });
        
        // Called when an entity is attacked by another entity
        this.onEntityAttack(function(attacker) {
            const target = self.getEntityById(attacker.target);
            if(target && attacker.type === "mob") {
                const pos = self.findPositionNextTo(attacker, target);
                self.moveEntity(attacker, pos.x, pos.y);
            }
        });
        
        this.onRegenTick(function() {
            self.forEachCharacter(function(character) {
                if(!character.hasFullHealth()) {
                    character.regenHealthBy(Math.floor(character.maxHitPoints / 25));
            
                    if(character.type === 'player') {
                        self.pushToPlayer(character, character.regen());
                    }
                }
            });
        });
    }
    
    run(mapFilePath) {
        const self = this;
        
        this.map = new ServerMap(mapFilePath);

        this.map.ready(function() {
            self.initZoneGroups();
            
            self.map.generateCollisionGrid();
            
            // Populate all mob "roaming" areas
            try {
                self.map.mobAreas.forEach(function(a) {
                    const area = new MobArea(a.id, a.nb, a.type, a.x, a.y, a.width, a.height, self);
                    area.spawnMobs();
                    area.onEmpty(self.handleEmptyMobArea.bind(self, area));

                    self.mobAreas.push(area);
                });
            } catch(e) {
                console.error('[WorldServer] Mob area population failed:', e.message, e.stack);
            }

            // Create all chest areas
            try {
                self.map.chestAreas.forEach(function(a) {
                    const area = new ChestArea(a.id, a.x, a.y, a.w, a.h, a.tx, a.ty, a.i, self);
                    self.chestAreas.push(area);
                    area.onEmpty(self.handleEmptyChestArea.bind(self, area));
                });
            } catch(e) {
                console.error('[WorldServer] Chest area creation failed:', e.message, e.stack);
            }

            // Spawn static chests
            try {
                self.map.staticChests.forEach(function(chest) {
                    const c = self.createChest(chest.x, chest.y, chest.i);
                    self.addStaticItem(c);
                });
            } catch(e) {
                console.error('[WorldServer] Static chest spawning failed:', e.message, e.stack);
            }

            // Spawn static entities
            try {
                self.spawnStaticEntities();
            } catch(e) {
                console.error('[WorldServer] Static entity spawning failed:', e.message, e.stack);
            }

            log.info('World populated: ' +
                Object.keys(self.mobs).length + ' mobs, ' +
                Object.keys(self.npcs).length + ' npcs, ' +
                Object.keys(self.items).length + ' items, ' +
                Object.keys(self.entities).length + ' total entities');

            self.populationComplete = true;

            // Set maximum number of entities contained in each chest area
            self.chestAreas.forEach(function(area) {
                area.setNumberOfEntities(area.entities.length);
            });
        });
        
        const regenCount = this.ups * 2;
        let updateCount = 0;
        setInterval(function() {
            self.processGroups();
            self.processQueues();
            
            if(updateCount < regenCount) {
                updateCount += 1;
            } else {
                if(self.regen_callback) {
                    self.regen_callback();
                }
                updateCount = 0;
            }
        }, 1000 / this.ups);
        
        log.info(""+this.id+" created (capacity: "+this.maxPlayers+" players).");
    }
    
    setUpdatesPerSecond(ups) {
        this.ups = ups;
    }
    
    onInit(callback) {
        this.init_callback = callback;
    }

    onPlayerConnect(callback) {
        this.connect_callback = callback;
    }
    
    onPlayerEnter(callback) {
        this.enter_callback = callback;
    }
    
    onPlayerAdded(callback) {
        this.added_callback = callback;
    }
    
    onPlayerRemoved(callback) {
        this.removed_callback = callback;
    }
    
    onRegenTick(callback) {
        this.regen_callback = callback;
    }
    
    pushRelevantEntityListTo(player) {
        let entities;
        
        if(player && (player.group in this.groups)) {
            entities = Object.keys(this.groups[player.group].entities);
            entities = entities.filter(function(id) { return id != player.id; });
            entities = entities.map(function(id) { return parseInt(id); });
            if(entities) {
                this.pushToPlayer(player, new Messages.List(entities));
            }
        }
    }
    
    pushSpawnsToPlayer(player, ids) {
        const self = this;
        
        ids.forEach(function(id) {
            const entity = self.getEntityById(id);
            if(entity) {
                self.pushToPlayer(player, new Messages.Spawn(entity));
            }
        });

        log.debug("Pushed "+ids.length+" new spawns to "+player.id);
    }
    
    pushToPlayer(player, message) {
        if(player && player.id in this.outgoingQueues) {
            this.outgoingQueues[player.id].push(message.serialize());
        } else {
            log.debug("pushToPlayer: player was undefined");
        }
    }
    
    pushToGroup(groupId, message, ignoredPlayer) {
        const self = this, group = this.groups[groupId];
        
        if(group) {
            group.players.forEach(function(playerId) {
                if(playerId != ignoredPlayer) {
                    self.pushToPlayer(self.getEntityById(playerId), message);
                }
            });
        } else {
            log.error("groupId: "+groupId+" is not a valid group");
        }
    }
    
    pushToAdjacentGroups(groupId, message, ignoredPlayer) {
        const self = this;
        self.map.forEachAdjacentGroup(groupId, function(id) {
            self.pushToGroup(id, message, ignoredPlayer);
        });
    }
    
    pushToPreviousGroups(player, message) {
        const self = this;
        
        // Push this message to all groups which are not going to be updated anymore,
        // since the player left them.
        player.recentlyLeftGroups.forEach(function(id) {
            self.pushToGroup(id, message);
        });
        player.recentlyLeftGroups = [];
    }
    
    pushBroadcast(message, ignoredPlayer) {
        for(const id in this.outgoingQueues) {
            if(id != ignoredPlayer) {
                this.outgoingQueues[id].push(message.serialize());
            }
        }
    }
    
    processQueues() {
        const self = this;
        let connection;

        for(const id in this.outgoingQueues) {
            if(this.outgoingQueues[id].length > 0) {
                connection = this.server.getConnection(id);
                // Clear queue BEFORE sending to avoid re-entrancy bug:
                // In local mode, send() is synchronous and may trigger new
                // messages to be queued. Clearing after would wipe them.
                const batch = this.outgoingQueues[id];
                this.outgoingQueues[id] = [];
                connection.send(batch);
            }
        }
    }
    
    addEntity(entity) {
        this.entities[entity.id] = entity;
        this.handleEntityGroupMembership(entity);
    }
    
    removeEntity(entity) {
        if(entity.id in this.entities) {
            delete this.entities[entity.id];
        }
        if(entity.id in this.mobs) {
            delete this.mobs[entity.id];
        }
        if(entity.id in this.items) {
            delete this.items[entity.id];
        }
        
        if(entity.type === "mob") {
            this.clearMobAggroLink(entity);
            this.clearMobHateLinks(entity);
        }
        
        entity.destroy();
        this.removeFromGroups(entity);
        log.debug("Removed "+ Types.getKindAsString(entity.kind) +" : "+ entity.id);
    }
    
    addPlayer(player) {
        this.addEntity(player);
        this.players[player.id] = player;
        this.outgoingQueues[player.id] = [];
        
        //log.info("Added player : " + player.id);
    }
    
    removePlayer(player) {
        player.broadcast(player.despawn());
        this.removeEntity(player);
        delete this.players[player.id];
        delete this.outgoingQueues[player.id];
    }
    
    addMob(mob) {
        this.addEntity(mob);
        this.mobs[mob.id] = mob;
    }
    
    addNpc(kind, x, y) {
        const npc = new Npc('8'+x+''+y, kind, x, y);
        this.addEntity(npc);
        this.npcs[npc.id] = npc;
        
        return npc;
    }
    
    addItem(item) {
        this.addEntity(item);
        this.items[item.id] = item;
        
        return item;
    }

    createItem(kind, x, y) {
        const id = '9'+this.itemCount++;
        let item = null;

        if(kind === Types.Entities.CHEST) {
            item = new Chest(id, x, y);
        } else {
            item = new Item(id, kind, x, y);
        }
        return item;
    }

    createChest(x, y, items) {
        const chest = this.createItem(Types.Entities.CHEST, x, y);
        chest.setItems(items);
        return chest;
    }
    
    addStaticItem(item) {
        item.isStatic = true;
        item.onRespawn(this.addStaticItem.bind(this, item));
        
        return this.addItem(item);
    }
    
    addItemFromChest(kind, x, y) {
        const item = this.createItem(kind, x, y);
        item.isFromChest = true;
        
        return this.addItem(item);
    }
    
    /**
     * The mob will no longer be registered as an attacker of its current target.
     */
    clearMobAggroLink(mob) {
        let player = null;
        if(mob.target) {
            player = this.getEntityById(mob.target);
            if(player) {
                player.removeAttacker(mob);
            }
        }
    }

    clearMobHateLinks(mob) {
        const self = this;
        if(mob) {
            mob.hatelist.forEach(function(obj) {
                const player = self.getEntityById(obj.id);
                if(player) {
                    player.removeHater(mob);
                }
            });
        }
    }
    
    forEachEntity(callback) {
        for(const id in this.entities) {
            callback(this.entities[id]);
        }
    }
    
    forEachPlayer(callback) {
        for(const id in this.players) {
            callback(this.players[id]);
        }
    }
    
    forEachMob(callback) {
        for(const id in this.mobs) {
            callback(this.mobs[id]);
        }
    }
    
    forEachCharacter(callback) {
        this.forEachPlayer(callback);
        this.forEachMob(callback);
    }
    
    handleMobHate(mobId, playerId, hatePoints) {
        const mob = this.getEntityById(mobId);
        const player = this.getEntityById(playerId);
        let mostHated;

        if(player && mob) {
            mob.increaseHateFor(playerId, hatePoints);
            player.addHater(mob);
            
            if(mob.hitPoints > 0) { // only choose a target if still alive
                this.chooseMobTarget(mob);
            }
        }
    }
    
    chooseMobTarget(mob, hateRank) {
        const player = this.getEntityById(mob.getHatedPlayerId(hateRank));
        
        // If the mob is not already attacking the player, create an attack link between them.
        if(player && !(mob.id in player.attackers)) {
            this.clearMobAggroLink(mob);
            
            player.addAttacker(mob);
            mob.setTarget(player);
            
            this.broadcastAttacker(mob);
            log.debug(mob.id + " is now attacking " + player.id);
        }
    }
    
    onEntityAttack(callback) {
        this.attack_callback = callback;
    }
    
    getEntityById(id) {
        if(id in this.entities) {
            return this.entities[id];
        } else {
            log.debug("Unknown entity : " + id);
        }
    }
    
    getPlayerCount() {
        let count = 0;
        for(const p in this.players) {
            if(this.players.hasOwnProperty(p)) {
                count += 1;
            }
        }
        return count;
    }
    
    broadcastAttacker(character) {
        if(character) {
            this.pushToAdjacentGroups(character.group, character.attack(), character.id);
        }
        if(this.attack_callback) {
            this.attack_callback(character);
        }
    }
    
    handleHurtEntity(entity, attacker, damage) {
        const self = this;
        
        if(entity.type === 'player') {
            // A player is only aware of his own hitpoints
            this.pushToPlayer(entity, entity.health());
        }
        
        if(entity.type === 'mob') {
            // Let the mob's attacker (player) know how much damage was inflicted
            this.pushToPlayer(attacker, new Messages.Damage(entity, damage));
        }

        // If the entity is about to die
        if(entity.hitPoints <= 0) {
            if(entity.type === "mob") {
                const mob = entity, item = this.getDroppedItem(mob);

                this.pushToPlayer(attacker, new Messages.Kill(mob));
                this.pushToAdjacentGroups(mob.group, mob.despawn()); // Despawn must be enqueued before the item drop
                if(item) {
                    this.pushToAdjacentGroups(mob.group, mob.drop(item));
                    this.handleItemDespawn(item);
                }
            }
    
            if(entity.type === "player") {
                this.handlePlayerVanish(entity);
                this.pushToAdjacentGroups(entity.group, entity.despawn());
            }
    
            this.removeEntity(entity);
        }
    }
    
    despawn(entity) {
        this.pushToAdjacentGroups(entity.group, entity.despawn());

        if(entity.id in this.entities) {
            this.removeEntity(entity);
        }
    }
    
    spawnStaticEntities() {
        const self = this;
        let count = 0;

        for(const [tid, kindName] of Object.entries(this.map.staticEntities)) {
            const kind = Types.getKindFromString(kindName), pos = self.map.tileIndexToGridPosition(tid);

            if(Types.isNpc(kind)) {
                self.addNpc(kind, pos.x + 1, pos.y);
            }
            if(Types.isMob(kind)) {
                const mob = new Mob('7' + kind + count++, kind, pos.x + 1, pos.y);
                mob.onRespawn(function() {
                    mob.isDead = false;
                    self.addMob(mob);
                    if(mob.area && mob.area instanceof ChestArea) {
                        mob.area.addToArea(mob);
                    }
                });
                mob.onMove(self.onMobMoveCallback.bind(self));
                self.addMob(mob);
                self.tryAddingMobToChestArea(mob);
            }
            if(Types.isItem(kind)) {
                self.addStaticItem(self.createItem(kind, pos.x + 1, pos.y));
            }
        }
    }

    isValidPosition(x, y) {
        if(this.map && typeof x === 'number' && typeof y === 'number' && !this.map.isOutOfBounds(x, y) && !this.map.isColliding(x, y)) {
            return true;
        }
        return false;
    }
    
    handlePlayerVanish(player) {
        const self = this, previousAttackers = [];
        
        // When a player dies or teleports, all of his attackers go and attack their second most hated player.
        player.forEachAttacker(function(mob) {
            previousAttackers.push(mob);
            self.chooseMobTarget(mob, 2);
        });
        
        previousAttackers.forEach(function(mob) {
            player.removeAttacker(mob);
            mob.clearTarget();
            mob.forgetPlayer(player.id, 1000);
        });
        
        this.handleEntityGroupMembership(player);
    }
    
    setPlayerCount(count) {
        this.playerCount = count;
    }
    
    incrementPlayerCount() {
        this.setPlayerCount(this.playerCount + 1);
    }
    
    decrementPlayerCount() {
        if(this.playerCount > 0) {
            this.setPlayerCount(this.playerCount - 1);
        }
    }
    
    getDroppedItem(mob) {
        const kind = Types.getKindAsString(mob.kind);
        const drops = Properties[kind].drops;
        const v = Utils.random(100);
        let p = 0;
        let item = null;

        for(const itemName in drops) {
            const percentage = drops[itemName];
            
            p += percentage;
            if(v <= p) {
                item = this.addItem(this.createItem(Types.getKindFromString(itemName), mob.x, mob.y));
                break;
            }
        }

        return item;
    }
    
    onMobMoveCallback(mob) {
        this.pushToAdjacentGroups(mob.group, new Messages.Move(mob));
        this.handleEntityGroupMembership(mob);
    }
    
    findPositionNextTo(entity, target) {
        let valid = false, pos;
        
        while(!valid) {
            pos = entity.getPositionNextTo(target);
            valid = this.isValidPosition(pos.x, pos.y);
        }
        return pos;
    }
    
    initZoneGroups() {
        const self = this;
        
        this.map.forEachGroup(function(id) {
            self.groups[id] = { entities: {},
                                players: [],
                                incoming: []};
        });
        this.zoneGroupsReady = true;
    }
    
    removeFromGroups(entity) {
        const self = this, oldGroups = [];
        
        if(entity && entity.group) {
            
            const group = this.groups[entity.group];
            if(entity instanceof Player) {
                group.players = group.players.filter(function(id) { return id !== entity.id; });
            }
            
            this.map.forEachAdjacentGroup(entity.group, function(id) {
                if(entity.id in self.groups[id].entities) {
                    delete self.groups[id].entities[entity.id];
                    oldGroups.push(id);
                }
            });
            entity.group = null;
        }
        return oldGroups;
    }
    
    /**
     * Registers an entity as "incoming" into several groups, meaning that it just entered them.
     * All players inside these groups will receive a Spawn message when WorldServer.processGroups is called.
     */
    addAsIncomingToGroup(entity, groupId) {
        const self = this, isChest = entity && entity instanceof Chest, isItem = entity && entity instanceof Item, isDroppedItem =  entity && isItem && !entity.isStatic && !entity.isFromChest;
        
        if(entity && groupId) {
            this.map.forEachAdjacentGroup(groupId, function(id) {
                const group = self.groups[id];
                
                if(group) {
                    if(!Object.values(group.entities).includes(entity.id)
                    //  Items dropped off of mobs are handled differently via DROP messages. See handleHurtEntity.
                    && (!isItem || isChest || (isItem && !isDroppedItem))) {
                        group.incoming.push(entity);
                    }
                }
            });
        }
    }
    
    addToGroup(entity, groupId) {
        const self = this, newGroups = [];
        
        if(entity && groupId && (groupId in this.groups)) {
            this.map.forEachAdjacentGroup(groupId, function(id) {
                self.groups[id].entities[entity.id] = entity;
                newGroups.push(id);
            });
            entity.group = groupId;
            
            if(entity instanceof Player) {
                this.groups[groupId].players.push(entity.id);
            }
        }
        return newGroups;
    }
    
    logGroupPlayers(groupId) {
        log.debug("Players inside group "+groupId+":");
        this.groups[groupId].players.forEach(function(id) {
            log.debug("- player "+id);
        });
    }
    
    handleEntityGroupMembership(entity) {
        let hasChangedGroups = false;
        if(entity) {
            const groupId = this.map.getGroupIdFromPosition(entity.x, entity.y);
            if(!entity.group || (entity.group && entity.group !== groupId)) {
                hasChangedGroups = true;
                this.addAsIncomingToGroup(entity, groupId);
                const oldGroups = this.removeFromGroups(entity);
                const newGroups = this.addToGroup(entity, groupId);
                
                if(oldGroups.length > 0) {
                    entity.recentlyLeftGroups = oldGroups.filter(function(x) { return !newGroups.includes(x); });
                    log.debug("group diff: " + entity.recentlyLeftGroups);
                }
            }
        }
        return hasChangedGroups;
    }
    
    processGroups() {
        const self = this;
        
        if(this.zoneGroupsReady) {
            this.map.forEachGroup(function(id) {
                let spawns = [];
                if(self.groups[id].incoming.length > 0) {
                    self.groups[id].incoming.forEach(function(entity) {
                        if(entity instanceof Player) {
                            self.pushToGroup(id, new Messages.Spawn(entity), entity.id);
                        } else {
                            self.pushToGroup(id, new Messages.Spawn(entity));
                        }
                    });
                    self.groups[id].incoming = [];
                }
            });
        }
    }
    
    moveEntity(entity, x, y) {
        if(entity) {
            entity.setPosition(x, y);
            this.handleEntityGroupMembership(entity);
        }
    }
    
    handleItemDespawn(item) {
        const self = this;
        
        if(item) {
            item.handleDespawn({
                beforeBlinkDelay: 10000,
                blinkCallback: function() {
                    self.pushToAdjacentGroups(item.group, new Messages.Blink(item));
                },
                blinkingDuration: 4000,
                despawnCallback: function() {
                    self.pushToAdjacentGroups(item.group, new Messages.Destroy(item));
                    self.removeEntity(item);
                }
            });
        }
    }
    
    handleEmptyMobArea(area) {

    }
    
    handleEmptyChestArea(area) {
        if(area) {
            const chest = this.addItem(this.createChest(area.chestX, area.chestY, area.items));
            this.handleItemDespawn(chest);
        }
    }
    
    handleOpenedChest(chest, player) {
        this.pushToAdjacentGroups(chest.group, chest.despawn());
        this.removeEntity(chest);
        
        const kind = chest.getRandomItem();
        if(kind) {
            const item = this.addItemFromChest(kind, chest.x, chest.y);
            this.handleItemDespawn(item);
        }
    }
    
    tryAddingMobToChestArea(mob) {
        this.chestAreas.forEach(function(area) {
            if(area.contains(mob)) {
                area.addToArea(mob);
            }
        });
    }
    
    updatePopulation(totalPlayers) {
        this.pushBroadcast(new Messages.Population(this.playerCount, totalPlayers ? totalPlayers : this.playerCount));
    }

}

export default WorldServer;
