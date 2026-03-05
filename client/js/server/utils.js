import Types from '../gametypes.js';

const Utils = {};

function sanitize(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

Utils.sanitize = function(string) {
    return sanitize(string);
};

Utils.random = function(range) {
    return Math.floor(Math.random() * range);
};

Utils.randomRange = function(min, max) {
    return min + (Math.random() * (max - min));
};

Utils.randomInt = function(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
};

Utils.clamp = function(min, max, value) {
    if(value < min) {
        return min;
    } else if(value > max) {
        return max;
    } else {
        return value;
    }
};

Utils.randomOrientation = function() {
    let o;
    const r = Utils.random(4);

    if(r === 0)
        o = Types.Orientations.LEFT;
    if(r === 1)
        o = Types.Orientations.RIGHT;
    if(r === 2)
        o = Types.Orientations.UP;
    if(r === 3)
        o = Types.Orientations.DOWN;

    return o;
};

Utils.Mixin = function(target, source) {
  if (source) {
    for (let key, keys = Object.keys(source), l = keys.length; l--; ) {
      key = keys[l];

      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

Utils.distanceTo = function(x, y, x2, y2) {
    const distX = Math.abs(x - x2);
    const distY = Math.abs(y - y2);

    return (distX > distY) ? distX : distY;
};

export default Utils;
