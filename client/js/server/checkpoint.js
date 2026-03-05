import { Class } from '../lib/class.js';
import Utils from "./utils.js";

const Checkpoint = Class.extend({
    init: function(id, x, y, width, height) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    },
    
    getRandomPosition: function() {
        const pos = {};
        
        pos.x = this.x + Utils.randomInt(0, this.width - 1);
        pos.y = this.y + Utils.randomInt(0, this.height - 1);
        return pos;
    }
});

export default Checkpoint;
