const isInt = function(n) {
    return (n % 1) === 0;
};
window.isInt = isInt;

const TRANSITIONEND = 'transitionend';
window.TRANSITIONEND = TRANSITIONEND;

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
const requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function(/* function */ callback, /* DOMElement */ _element){
            window.setTimeout(callback, 1000 / 60);
          };
})();
window.requestAnimFrame = requestAnimFrame;

export { isInt, TRANSITIONEND, requestAnimFrame };
