import Timer from './timer.js';

    class Bubble {
        constructor(id, element, time) {
            this.id = id;
            this.element = element;
            this.timer = new Timer(5000, time);
        }

        isOver(time) {
            if(this.timer.isOver(time)) {
                return true;
            }
            return false;
        }

        destroy() {
            if(this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }

        reset(time) {
            this.timer.lastTime = time;
        }
    }

    class BubbleManager {
        constructor(container) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;
            this.bubbles = {};
        }

        getBubbleById(id) {
            if(id in this.bubbles) {
                return this.bubbles[id];
            }
            return null;
        }

        create(id, message, time) {
            if(this.bubbles[id]) {
                this.bubbles[id].reset(time);
                const existing = document.getElementById(id);
                if(existing) {
                    const p = existing.querySelector('p');
                    if(p) { p.innerHTML = message; }
                }
            }
            else {
                const el = document.createElement('div');
                el.id = id;
                el.className = 'bubble';
                el.innerHTML = '<p>' + message + '</p><div class="thingy"></div>';
                this.container.appendChild(el);

                this.bubbles[id] = new Bubble(id, el, time);
            }
        }

        update(time) {
            const self = this, bubblesToDelete = [];

            for(const bubble of Object.values(this.bubbles)) {
                if(bubble.isOver(time)) {
                    bubble.destroy();
                    bubblesToDelete.push(bubble.id);
                }
            }

            bubblesToDelete.forEach(function(id) {
                delete self.bubbles[id];
            });
        }

        clean() {
            const self = this, bubblesToDelete = [];

            for(const bubble of Object.values(this.bubbles)) {
                bubble.destroy();
                bubblesToDelete.push(bubble.id);
            }

            bubblesToDelete.forEach(function(id) {
                delete self.bubbles[id];
            });

            this.bubbles = {};
        }

        destroyBubble(id) {
            const bubble = this.getBubbleById(id);

            if(bubble) {
                bubble.destroy();
                delete this.bubbles[id];
            }
        }

        forEachBubble(callback) {
            for(const bubble of Object.values(this.bubbles)) {
                callback(bubble);
            }
        }
    }

export default BubbleManager;
