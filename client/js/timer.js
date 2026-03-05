import { Class } from './lib/class.js';

const Timer = Class.extend({
    init: function(duration, startTime) {
        this.lastTime = startTime || 0;
        this.duration = duration;
    },

    isOver: function(time) {
        let over = false;

        if((time - this.lastTime) > this.duration) {
            over = true;
            this.lastTime = time;
        }
        return over;
    }
});

export default Timer;
