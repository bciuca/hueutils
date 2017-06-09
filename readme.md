# Hue Utils

Image color analysis using a modified version of [Color Thief](http://www.lokeshdhakar.com).

## Features
Analyzes HTML5 video in near real time. Retrieve dominant color, brightest perceived color ([luma](http://en.wikipedia.org/wiki/Luma_%28video%29)), average color, and get a palette of colors.

    
### Options
* `quality` - 0 is best but slower - 10 is default.
* `sampleTime` - interval at which to sample video - default is 100ms.
* `algorithm` - `brightest`, `dominant`, `average`, or `completePalette` (default).
* `player` - video element or object to draw
* `event` - the event name to listen for when analyzing the video - `timeupdate` is default.
* `callback` - the callback when a color or palette is available.
* `debug` - boolean - when `true` displays a palette div with the current colors retrieved.

All options except `player` and `event` can be set after initialization. For example
```javascript
    HueUtils.callback = function(palette) {
        CoolLightsAPI.set(palette);
    };
```


### API

Public methods to pause analysis, resume anaysis, and destroy the instance (clean up).
    
    HueUtils.initialize(options);
    HueUtils.pause(); 
    HueUtils.resume();
    HueUtils.destroy();
