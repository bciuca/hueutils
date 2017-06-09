/**
 * Created by bogdanc on 8/8/14.
 *
 */

(function(global) {

    'use strict';

    var _initialized = false,
        _quality,
        _sampleTime,
        _algorithm,
        _debug,
        _debugDiv,
        _paletteUtil,
        _video,
        _player,
        _event,
        _disposed,
        _active,
        _onColor,

        NOOP = function() {};

    /**
     * General error handler.
     * @param err
     */
    function onError(err) {
        console.warn(err.stack);
    }

    /**
     * Initialize objects.
     * @param options - set options:
     *      quality - 0 is best.
     *      sampleTime - interval at which to sample video.
     *      algorithm - brightest, dominant, or average.
     *      player - the player object, video element is default.
     *      event - the time update event name - 'timeupdate' is default.
     *      callback - the callback when a color is available.
     *      debug - boolean.
     */
    function init(options) {
        if (_initialized) return;
        _initialized = true;

        options = options || {};

        _disposed = new Rx.Subject();
        _video = document.querySelector('video');
        _active = true;

        _quality = options.quality || 10;
        _sampleTime = options.sampleTime || 100;
        _algorithm = options.algorithm || 'brightest';
        _player = options.player || _video;
        _event = options.event || 'timeupdate';
        _onColor = typeof options.callback === 'function' ? options.callback : NOOP;
        _debug = !!options.debug;

        _paletteUtil = new ColorThief();
        setupVideoHandler();
    }

    /**
     * Create observable for listening for video updates.
     */
    function setupVideoHandler() {
        if (!_active) return;

        // Dispose old player listeners.
        _disposed.onNext();

        Rx.Observable.fromEvent(_player, _event)
            .takeUntil(_disposed)
            .throttle(_sampleTime)
            .doAction(sample)
            .subscribe(NOOP, onError, NOOP);
    }

    /**
     * Sample the current video frame and analyze the palette.
     */
    function sample() {
        var algo;

        switch (_algorithm) {
            case 'brightest':
                algo = getBrightestColor;
                break;

            case 'average':
                algo = getAverageColor;
                break;

            case 'dominant':
                algo = getDominantColor;
                break;

            case 'completePalette':
            default :
                algo = getSortedPaletteObjects;
                break;
        }

        _debug && drawPalette(getSortedPaletteObjects());
        _onColor && _onColor(algo());
    }

    /**
     * Gets the dominant color.
     * @returns { Array } RGB.
     */
    function getDominantColor() {
        return _paletteUtil.getDominantColor(_video, _quality);
    }

    /**
     * Get the palette list sorted by brightest first.
     * @returns { Array } RGB
     */
    function getBrightestColor() {
        return getCompletePalette()[0];
    }

    /**
     * Returns the complete palette sorted by brightest first.
     * @returns {Array} Collection of RGB arrays
     */
    function getCompletePalette() {
        return getSortedPaletteObjects().map(function(obj) {
            return obj.color;
        });
    }

    /**
     * Gets the average color for the current scene.
     * @returns {Array} RGB
     */
    function getAverageColor() {
        return _paletteUtil.getAverageColor(_video, _quality);
    }

    /**
     * Gets the palette collection sorted by luminosity (brightest first).
     * @returns {Array} - Array of color objects: { color: array (rgb), value: number (luminosity), dominant: boolean (dominant color)}
     */
    function getSortedPaletteObjects() {
        return _paletteUtil.getSortedPalette(_video, 10, _quality);

    }

    /**
     * Pauses color analysis, to be resumed at a later time.
     */
    function pause() {
        if (!_initialized) return;
        _active = false;

        _disposed.onNext();
    }

    /**
     * Resume listening to video updates.
     */
    function resume() {
        if (!_initialized) return;
        _active = true;

        setupVideoHandler();
    }

    /**
     * Setup color bar for displaying palette.
     * Debug only.
     * @param palette
     */
    function drawPalette(palette) {
        if (!_debugDiv) {
            _debugDiv = document.createElement('div');
            _debugDiv.style.cssText = 'width: 100%; height: 80px; position: absolute; top: 0; z-index: 999;';
            document.body.appendChild(_debugDiv);
        }

        // Make a color filled div.
        palette.forEach(function(c, i) {
            addDiv(c, i);
        });

        function addDiv(c, i) {
            var ch = _debugDiv.children;
            var div;
            var w = 100 / palette.length;
            if (!ch[i]) {
                div = document.createElement('div');
                div.style.cssText = 'width:' + w + '%; height: 100%; display: inline-block; color: #333; text-shadow: gray 0 1px 0; font-size: 12px; font-family: Arial; margin: 0;';
                _debugDiv.appendChild(div);
            } else {
                div = ch[i];
            }
            div.style.backgroundColor = 'rgb(' + c.color.join() + ')';
            div.innerHTML = '<p style="margin: 0;">Luma:' + Math.floor(c.value) + '</p>'
                + '<p style="margin: 0;">RGB:' + c.color.join() + '</p>';
            if (c.dominant) div.innerHTML += '<p style="margin: 0;">dominant</p>';
        }
    }

    /**
     * Tear down all objects.
     */
    function destroy() {
        _disposed && _disposed.onNext();
        _paletteUtil && _paletteUtil.destroy();
        _debugDiv && _debugDiv.parentNode.removeChild(_debugDiv);

        _initialized = false;
        _quality = null;
        _sampleTime = null;
        _algorithm = null;
        _debug = null;
        _debugDiv = null;
        _paletteUtil = null;
        _video = null;
        _player = null;
        _event = null;
        _disposed = null;
        _active = null;
        _onColor = null;

    }

    /**
     * Expose public methods/properties.
     * Defining an object with properties for the convenience
     * of getters/setters and read-only properties.
     */
    global.HueUtils = Object.defineProperties({}, {
        // Algorithm enums.
        DOMINANT: {
            enumerable: true,
            writable: false,
            value: 'dominant'
        },

        BRIGHTEST: {
            enumerable: true,
            writable: false,
            value: 'brightest'
        },

        AVERAGE: {
            enumerable: true,
            value: 'average'
        },

        COMPLETE_PALETTE: {
            enumerable: true,
            writable: false,
            value: 'completePalette'
        },

        // Public methods and getters/setters.

        /**
         * Enables debug mode. Shows palette bar in browser window.
         */
        debug: {
            enumerable: true,
            get: function() { return _debug; },
            set: function(val) {
                _debug = !!val;
                setupVideoHandler();
            }
        },

        /**
         * Set the time in ms to sample video frame.
         */
        sampleTime: {
            enumerable: true,
            get: function() { return _sampleTime; },
            set: function(val) {
                _sampleTime = val;
                setupVideoHandler();
            }
        },

        /**
         * Set the color analyzer algorithm.
         */
        algorithm: {
            enumerable: true,
            get: function() { return _algorithm;},
            set: function(val) {
                _algorithm = val;
                setupVideoHandler();
            }
        },

        /**
         * Set the callback when the color palette is returned.
         * onColor takes 1 parameter, the color array.
         */
        callback: {
            enumerable: true,
            get: function() { return _onColor; },
            set: function(val) {
                _onColor = typeof val === 'function' ? val : NOOP;
                setupVideoHandler();
            }
        },


        // Public methods.

        /**
         * Initialize the module.
         */
        initialize: {
            enumerable: true,
            value: init
        },

        destroy: {
            enumerable: true,
            value: destroy
        },

        /**
         * Pause color analysis.
         */
        pause: {
            enumerable: true,
            value: pause
        },

        /**
         * Resume color analysis.
         */
        resume: {
            enumerable: true,
            value: resume
        }
    });

})(this);
