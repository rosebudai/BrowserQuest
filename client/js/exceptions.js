import { Class } from './lib/class.js';

const Exceptions = {

    LootException: Class.extend({
        init: function(message) {
            this.message = message;
        }
    })
};

export default Exceptions;
