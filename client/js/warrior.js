import Player from './player.js';

    const Warrior = Player.extend({
        init: function(id, name) {
            this._super(id, name, Types.Entities.WARRIOR);
        },
    });

export default Warrior;
