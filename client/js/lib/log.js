
var Logger = function(level) {
    this.level = level;
};

Logger.prototype.info = function() {};
Logger.prototype.debug = function() {};
Logger.prototype.error = function() {};

//>>excludeStart("prodHost", pragmas.prodHost);
Logger.prototype.info = function(message) {
    if(this.level === "debug" || this.level === "info") {
        if(window.console) {
            console.info(message);
        }
    }
};

Logger.prototype.debug = function(message) {
    if(this.level === "debug") {
        if(window.console) {
            console.log(message);
        }
    }
};

Logger.prototype.warn = function(message) {
    if(window.console) {
        console.warn(message);
    }
};

Logger.prototype.error = function(message, stacktrace) {
    if(window.console) {
        console.error(message);
        if(stacktrace !== undefined && stacktrace === true) {
            if(typeof printStackTrace === 'function') {
                var trace = printStackTrace();
                console.error(trace.join('\n\n'));
            } else if(typeof Error !== 'undefined') {
                console.error(new Error().stack);
            }
        }
    }
};
//>>excludeEnd("prodHost");

var log = new Logger("debug");
window.log = log;