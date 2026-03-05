import { Class } from '../lib/class.js';
import Types from '../gametypes.js';
import log from '../lib/log.js';

const FormatChecker = Class.extend({
    init: function() {
        this.formats = [];
        this.formats[Types.Messages.HELLO] = ['s', 'n', 'n'],
        this.formats[Types.Messages.MOVE] = ['n', 'n'],
        this.formats[Types.Messages.LOOTMOVE] = ['n', 'n', 'n'],
        this.formats[Types.Messages.AGGRO] = ['n'],
        this.formats[Types.Messages.ATTACK] = ['n'],
        this.formats[Types.Messages.HIT] = ['n'],
        this.formats[Types.Messages.HURT] = ['n'],
        this.formats[Types.Messages.CHAT] = ['s'],
        this.formats[Types.Messages.LOOT] = ['n'],
        this.formats[Types.Messages.TELEPORT] = ['n', 'n'],
        this.formats[Types.Messages.ZONE] = [],
        this.formats[Types.Messages.OPEN] = ['n'],
        this.formats[Types.Messages.CHECK] = ['n']
    },
    
    check: function(msg) {
        const message = msg.slice(0), type = message[0], format = this.formats[type];
        
        message.shift();
        
        if(format) {    
            if(message.length !== format.length) {
                return false;
            }
            for(let i = 0, n = message.length; i < n; i += 1) {
                if(format[i] === 'n' && typeof message[i] !== 'number') {
                    return false;
                }
                if(format[i] === 's' && typeof message[i] !== 'string') {
                    return false;
                }
            }
            return true;
        }
        else if(type === Types.Messages.WHO) {
            // WHO messages have a variable amount of params, all of which must be numbers.
            return message.length > 0 && message.every(function(param) { return typeof param === 'number' });
        }
        else {
            log.error("Unknown message type: "+type);
            return false;
        }
    }
});

const checker = new FormatChecker();
const check = checker.check.bind(checker);

export { FormatChecker, check };
