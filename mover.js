window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
})();
/**
 * Available corner modes;
 * @enum {string}
 * @type {{topLeft: string, topCenter: string, topRight: string, centerRight: string, bottomRight: string, bottomCenter: string, bottomLeft: string, centerLeft: string, centerCenter: string, center: string}}
 */
var corners= {
    topLeft: 'top-left',
    topCenter: 'top-center',
    topRight: 'top-right',
    centerRight: 'center-right',
    bottomRight: 'bottom-right',
    bottomCenter: 'bottom-center',
    bottomLeft: 'bottom-left',
    centerLeft: 'center-left',
    centerCenter: 'center-center',
    center: 'center-center'
};
/**
 * Creates a movable element or attache movable behaviour to existing
 * @param {string|DOMElement|null|undefined} element CSS selector or DOMElement
 * @param {object} options Object of options
 * @param {corners} options.mode One of available corners mode
 * @class
 * @classdesc Class representing a "move-to-clickpoint" behaviour of HTML elements. It's required for element to be absolutely positioned
 */
function Mover(element, options) {
    options = options || {};
    this.element = document.querySelector(element) || element;
    if (!this.element) {
        var el = document.createElement('div');
        el.style = 'position:absolute; width:50px; height:50px; background-color:#fea';
        this.element = el;
        document.body.appendChild(this.element);
    }
    this.options = {
        mode: options.mode || 'top-left'
    };
    Object.defineProperty(this, 'left', {
        get: function () {
            return parseFloat(this.element.style.left) || 0;
        },
        set: function (offset) {
            this.element.style.left = offset + 'px';
        }
    });
    Object.defineProperty(this, 'top', {
        get: function () {
            return parseFloat(this.element.style.top) || 0;
        },
        set: function (offset) {
            this.element.style.top = offset + 'px';
        }
    });
    Object.defineProperty(this, 'height', {
        get: function () {
            return parseFloat(this.element.style.height) || 0;
        },
        set: function (offset) {
            this.element.style.height = offset + 'px';
        }
    });
    Object.defineProperty(this, 'width', {
        get: function () {
            return parseFloat(this.element.style.width) || 0;
        },
        set: function (offset) {
            this.element.style.width = offset + 'px';
        }
    });

    window.addEventListener('click', this.moveElement.bind(this));
}

/**
 *
 * @param {event} clickObj Click event
 * @param {string} mode Corner mode
 * @returns {{top: number, left: number}}
 */
Mover.prototype.coordsMapper = function (clickObj, mode) {
    var width = this.width,
        height = this.height,
        modeArray = mode.split('-'),
        verticalMode = modeArray[0],
        horizontalMode = modeArray[1],
        verticalModeMapper = {
            top: clickObj.y,
            center: clickObj.y - height / 2,
            bottom: clickObj.y - height
        },
        horizontalModeWrapper = {
            left: clickObj.x,
            center: clickObj.x - width / 2,
            right: clickObj.x - width
        };
    return {
        top: verticalModeMapper[verticalMode],
        left: horizontalModeWrapper[horizontalMode]
    };
};
/**
 * Handle click event and move element to click point
 * @param {event} event Click event
 */
Mover.prototype.moveElement = function (event) {
    var newCoords = this.coordsMapper(event, this.options.mode);
    this.top = newCoords.top;
    this.left = newCoords.left;
};

/**
 * Creates a smooth movable element or attache movable behaviour to existing
 * @extends Mover
 * @param {string|DOMElement|null|undefined} element CSS selector or DOMElement
 * @param {object} options Object of options
 * @param {corners} options.mode One of available corners mode
 * @param {function} options.animationFunction Function to describe moving velocity curve. Simple uniform motion is function that returns constant.
 * @class
 * @classdesc Class representing a "smooth move-to-clickpoint" behaviour of HTML elements. It's required for element to be absolutely positioned
 */
function SmoothMover() {
    Mover.apply(this, arguments);
    this.animationFunction=arguments[1].animationFunction || function () {return 1;};
}

SmoothMover.prototype = Object.create(Mover.prototype);
SmoothMover.prototype.constructor = Mover.constructor;
/**
 * Checks if element coordinates is equal to params
 * @param {number} x left offset
 * @param {number} y right offset
 * @returns {boolean}
 */
SmoothMover.prototype.isElementInPoint = function (x, y) {
    return parseInt(this.element.style.top) == y && parseInt(this.element.style.left) == x;
};
/**
 * Handle click event and move element to click point
 * @param {event} event Click event
 */
SmoothMover.prototype.moveElement = function (event) {
    if(this.timeout){
        clearTimeout(this.timeout);
    }
    var velocity = 220, //Velocity of element moving
        fps = 30, //Number of calls of redrawing function per second. Not exactly frames per second because using requestAnimationFrame
        speedPerFrame = velocity/fps,
        newCoords = this.coordsMapper(event, this.options.mode),
        yDirection = this.top < newCoords.top ? 1 : -1,
        xDirection = this.left < newCoords.left ? 1 : -1,
        xDistance = Math.abs(this.left - newCoords.left),
        yDistance = Math.abs(this.top - newCoords.top),
        speedNormalizeK = Math.min(xDistance, yDistance) / Math.max(xDistance, yDistance),
        xK = xDistance > yDistance ? 1 : speedNormalizeK,
        yK = yDistance > xDistance ? 1 : speedNormalizeK,
        steps=1/(Math.sqrt((xDistance*xDistance+yDistance*yDistance))/speedPerFrame),
        counter=0,
        self = this;
    function step() {
        counter++;
        var setLeft=self.left+speedPerFrame*xDirection*xK*self.animationFunction(counter*steps),
            setTop=self.top+speedPerFrame*yDirection*yK*self.animationFunction(counter*steps);
        if (self.left != newCoords.left) {
            self.left = xDirection>0?
                Math.min(setLeft, newCoords.left):
                Math.max(setLeft, newCoords.left);
        }
        if (self.top != newCoords.top) {
            self.top = yDirection>0?
                Math.min(setTop, newCoords.top):
                Math.max(setTop, newCoords.top);
        }
        if (!self.isElementInPoint(newCoords.left, newCoords.top)) {
            self.timeout=setTimeout(function () {
                requestAnimationFrame(step);
            }, 1000 / fps);
        }
    }
    step();
};




