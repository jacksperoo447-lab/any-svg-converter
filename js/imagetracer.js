/**
 * ImageTracer & Vectorizer Engine for AnySVG
 * High-performance browser-based raster-to-SVG vector tracing.
 * Completely Iterative (Zero Recursion) - Immune to Call Stack Size Errors.
 * Includes Auto-scaling for large images with lossless viewBox preservation.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ImageTracer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var ImageTracer = {};

  ImageTracer.defaultOptions = {
    mode: 'color',            // 'color' or 'monochrome'
    numberofcolors: 8,        // 2 - 32
    minarea: 4,               // ignore tiny noise specks
    blurradius: 0,
    smoothness: 1,            // 0: sharp, 1: balanced, 2: ultra smooth
    simplifyThreshold: 1.2,
    removeBackground: false,
    threshold: 128,           // for monochrome
    invert: false,
    scaleX: 1,
    scaleY: 1
  };

  /**
   * Main Entry: Vectorize Image element or Canvas to SVG string
   */
  ImageTracer.imageToSVG = function(source, options, callback) {
    var opts = Object.assign({}, ImageTracer.defaultOptions, options);

    var origW = source.naturalWidth || source.width || 800;
    var origH = source.naturalHeight || source.height || 600;

    // Safety: Auto-scale canvas processing to maximum 1024px for instant speed & zero memory overflow
    var maxDimension = 1024;
    var fitScale = 1;
    if (origW > maxDimension || origH > maxDimension) {
      fitScale = maxDimension / Math.max(origW, origH);
    }

    var targetW = Math.max(1, Math.round(origW * fitScale));
    var targetH = Math.max(1, Math.round(origH * fitScale));

    var canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);

    var imgData = ctx.getImageData(0, 0, targetW, targetH);

    opts.scaleX = origW / targetW;
    opts.scaleY = origH / targetH;
    opts.origWidth = origW;
    opts.origHeight = origH;

    try {
      var svgString = ImageTracer.imageDataToSVG(imgData, opts);
      if (typeof callback === 'function') callback(null, svgString);
      return svgString;
    } catch (err) {
      if (typeof callback === 'function') callback(err, null);
      else throw err;
    }
  };

  /**
   * Process ImageData into SVG string
   */
  ImageTracer.imageDataToSVG = function(imgData, opts) {
    opts = Object.assign({}, ImageTracer.defaultOptions, opts);
    var width = imgData.width;
    var height = imgData.height;

    var processedData = imgData;
    if (opts.blurradius > 0) {
      processedData = ImageTracer.boxBlur(imgData, opts.blurradius);
    }

    var layers = [];
    var palette = [];

    if (opts.mode === 'monochrome') {
      var monoResult = ImageTracer.traceMonochrome(processedData, opts);
      layers = monoResult.layers;
      palette = monoResult.palette;
    } else {
      var colorResult = ImageTracer.traceMultiColor(processedData, opts);
      layers = colorResult.layers;
      palette = colorResult.palette;
    }

    return ImageTracer.buildSVG(layers, palette, opts.origWidth || width, opts.origHeight || height, opts);
  };

  /**
   * Fast Box Blur pre-filter
   */
  ImageTracer.boxBlur = function(imgData, radius) {
    var w = imgData.width;
    var h = imgData.height;
    var src = imgData.data;
    var out = new ImageData(w, h);
    var dst = out.data;
    var r = Math.max(1, Math.min(3, Math.floor(radius)));

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
        for (var ky = -r; ky <= r; ky++) {
          var py = y + ky;
          if (py < 0 || py >= h) continue;
          for (var kx = -r; kx <= r; kx++) {
            var px = x + kx;
            if (px < 0 || px >= w) continue;
            var idx = (py * w + px) * 4;
            rSum += src[idx];
            gSum += src[idx + 1];
            bSum += src[idx + 2];
            aSum += src[idx + 3];
            count++;
          }
        }
        var oIdx = (y * w + x) * 4;
        dst[oIdx] = Math.round(rSum / count);
        dst[oIdx + 1] = Math.round(gSum / count);
        dst[oIdx + 2] = Math.round(bSum / count);
        dst[oIdx + 3] = Math.round(aSum / count);
      }
    }
    return out;
  };

  /**
   * Monochrome Tracing
   */
  ImageTracer.traceMonochrome = function(imgData, opts) {
    var w = imgData.width;
    var h = imgData.height;
    var data = imgData.data;
    var threshold = opts.threshold;
    var invert = opts.invert;

    var grid = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        var a = data[idx + 3];
        if (a < 64) {
          grid[y * w + x] = invert ? 1 : 0;
          continue;
        }
        var lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        var isDark = lum < threshold;
        if (invert) isDark = !isDark;
        grid[y * w + x] = isDark ? 1 : 0;
      }
    }

    var paths = ImageTracer.traceGridContours(grid, w, h, opts);
    return {
      palette: [{ r: 15, g: 23, b: 42, a: 255, hex: '#0f172a' }],
      layers: [{ colorIdx: 0, paths: paths }]
    };
  };

  /**
   * Multi-Color Tracing
   */
  ImageTracer.traceMultiColor = function(imgData, opts) {
    var w = imgData.width;
    var h = imgData.height;
    var data = imgData.data;
    var numColors = Math.max(2, Math.min(32, opts.numberofcolors));

    var palette = ImageTracer.quantizeColors(data, numColors);

    var bgColorIndex = -1;
    if (opts.removeBackground) {
      var cornerIndices = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
      var cornerVotes = {};
      cornerIndices.forEach(function(cIdx) {
        var r = data[cIdx], g = data[cIdx + 1], b = data[cIdx + 2], a = data[cIdx + 3];
        var matched = ImageTracer.closestPaletteIndex(r, g, b, a, palette);
        cornerVotes[matched] = (cornerVotes[matched] || 0) + 1;
      });
      var maxVotes = 0;
      for (var k in cornerVotes) {
        if (cornerVotes[k] > maxVotes) {
          maxVotes = cornerVotes[k];
          bgColorIndex = parseInt(k, 10);
        }
      }
    }

    var indexed = new Int16Array(w * h);
    for (var i = 0; i < w * h; i++) {
      var p = i * 4;
      var a = data[p + 3];
      if (a < 32) {
        indexed[i] = -1;
      } else {
        indexed[i] = ImageTracer.closestPaletteIndex(data[p], data[p + 1], data[p + 2], a, palette);
      }
    }

    var layers = [];
    for (var c = 0; c < palette.length; c++) {
      if (opts.removeBackground && c === bgColorIndex) continue;

      var layerGrid = new Uint8Array(w * h);
      var pixelCount = 0;
      for (var j = 0; j < w * h; j++) {
        if (indexed[j] === c) {
          layerGrid[j] = 1;
          pixelCount++;
        } else {
          layerGrid[j] = 0;
        }
      }

      if (pixelCount < opts.minarea) continue;

      var paths = ImageTracer.traceGridContours(layerGrid, w, h, opts);
      if (paths.length > 0) {
        layers.push({
          colorIdx: c,
          paths: paths
        });
      }
    }

    return {
      palette: palette,
      layers: layers
    };
  };

  /**
   * Fast K-Means Color Quantization
   */
  ImageTracer.quantizeColors = function(data, numColors) {
    var step = Math.max(1, Math.floor(data.length / (4 * 3000)));
    var samples = [];
    for (var i = 0; i < data.length; i += step * 4) {
      if (data[i + 3] > 32) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }

    if (samples.length === 0) {
      return [{ r: 0, g: 0, b: 0, a: 255, hex: '#000000' }];
    }

    var centroids = [];
    var stepSample = Math.max(1, Math.floor(samples.length / numColors));
    for (var k = 0; k < numColors && k * stepSample < samples.length; k++) {
      centroids.push([samples[k * stepSample][0], samples[k * stepSample][1], samples[k * stepSample][2]]);
    }

    for (var iter = 0; iter < 3; iter++) {
      var clusters = centroids.map(function() { return [0, 0, 0]; });
      var counts = centroids.map(function() { return 0; });

      for (var s = 0; s < samples.length; s++) {
        var sp = samples[s];
        var minDist = Infinity, best = 0;
        for (var c = 0; c < centroids.length; c++) {
          var cd = centroids[c];
          var dist = (sp[0] - cd[0]) * (sp[0] - cd[0]) + (sp[1] - cd[1]) * (sp[1] - cd[1]) + (sp[2] - cd[2]) * (sp[2] - cd[2]);
          if (dist < minDist) { minDist = dist; best = c; }
        }
        clusters[best][0] += sp[0];
        clusters[best][1] += sp[1];
        clusters[best][2] += sp[2];
        counts[best]++;
      }

      for (var u = 0; u < centroids.length; u++) {
        if (counts[u] > 0) {
          centroids[u][0] = Math.round(clusters[u][0] / counts[u]);
          centroids[u][1] = Math.round(clusters[u][1] / counts[u]);
          centroids[u][2] = Math.round(clusters[u][2] / counts[u]);
        }
      }
    }

    return centroids.map(function(c) {
      var r = Math.max(0, Math.min(255, c[0]));
      var g = Math.max(0, Math.min(255, c[1]));
      var b = Math.max(0, Math.min(255, c[2]));
      var hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      return { r: r, g: g, b: b, a: 255, hex: hex };
    });
  };

  ImageTracer.closestPaletteIndex = function(r, g, b, a, palette) {
    var minDist = Infinity, best = 0;
    for (var i = 0; i < palette.length; i++) {
      var p = palette[i];
      var dist = (r - p.r) * (r - p.r) + (g - p.g) * (g - p.g) + (b - p.b) * (b - p.b);
      if (dist < minDist) { minDist = dist; best = i; }
    }
    return best;
  };

  /**
   * Fast Iterative Contour Tracing with Flat Visited Array
   */
  ImageTracer.traceGridContours = function(grid, width, height, opts) {
    var visited = new Uint8Array(width * height * 4);
    var paths = [];
    var dx = [1, 0, -1, 0];
    var dy = [0, 1, 0, -1];

    function getPixel(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      return grid[y * width + x];
    }

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (getPixel(x, y) === 1 && getPixel(x, y - 1) === 0) {
          var edgeIdx = (y * width + x) * 4;
          if (visited[edgeIdx] === 0) {
            var points = [];
            var cx = x, cy = y, dir = 0;
            var maxSteps = (width + height) * 6;
            var steps = 0;

            while (steps < maxSteps) {
              points.push({ x: cx, y: cy });
              var eKey = (cy * width + cx) * 4 + dir;
              if (visited[eKey]) break;
              visited[eKey] = 1;

              var found = false;
              for (var i = 0; i < 4; i++) {
                var cdir = (dir + 3 + i) % 4;
                var nx = cx + dx[cdir];
                var ny = cy + dy[cdir];
                if (getPixel(nx, ny) === 1) {
                  cx = nx;
                  cy = ny;
                  dir = cdir;
                  found = true;
                  break;
                }
              }

              if (!found) break;
              if (cx === x && cy === y && dir === 0) break;
              steps++;
            }

            if (points.length >= 3) {
              var poly = ImageTracer.simplifyPath(points, opts.simplifyThreshold || 1.2);
              if (poly.length >= 3) {
                paths.push(poly);
              }
            }
          }
        }
      }
    }
    return paths;
  };

  /**
   * 100% Iterative Douglas-Peucker Polygon Simplification
   * NEVER recurses -> Completely eliminates "Maximum call stack size exceeded"
   */
  ImageTracer.simplifyPath = function(points, tolerance) {
    if (!points || points.length <= 2) return points || [];

    var len = points.length;
    var sqTol = (tolerance || 1.2) * (tolerance || 1.2);
    var markers = new Uint8Array(len);
    markers[0] = 1;
    markers[len - 1] = 1;

    // Explicit loop stack instead of recursive function calls
    var stack = [[0, len - 1]];

    function getSqSegDist(p, p1, p2) {
      var x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
      if (dx !== 0 || dy !== 0) {
        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2.x;
          y = p2.y;
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }
      dx = p.x - x;
      dy = p.y - y;
      return dx * dx + dy * dy;
    }

    while (stack.length > 0) {
      var range = stack.pop();
      var first = range[0];
      var last = range[1];
      var maxSqDist = 0;
      var index = -1;

      for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTol && index !== -1) {
        markers[index] = 1;
        if (index - first > 1) stack.push([first, index]);
        if (last - index > 1) stack.push([index, last]);
      }
    }

    var result = [];
    for (var k = 0; k < len; k++) {
      if (markers[k]) result.push(points[k]);
    }
    return result;
  };

  /**
   * Points to SVG Path String with Scale Adjustment
   */
  ImageTracer.pointsToSVGPath = function(points, smoothness, scaleX, scaleY) {
    if (!points || points.length < 2) return '';
    scaleX = scaleX || 1;
    scaleY = scaleY || 1;

    function getX(pt) { return (pt.x * scaleX).toFixed(2); }
    function getY(pt) { return (pt.y * scaleY).toFixed(2); }

    if (smoothness === 0) {
      var d = 'M ' + getX(points[0]) + ' ' + getY(points[0]);
      for (var i = 1; i < points.length; i++) {
        d += ' L ' + getX(points[i]) + ' ' + getY(points[i]);
      }
      d += ' Z';
      return d;
    }

    var dPath = 'M ' + getX(points[0]) + ' ' + getY(points[0]);
    var len = points.length;
    var tension = smoothness === 2 ? 0.35 : 0.2;

    for (var j = 0; j < len; j++) {
      var p0 = points[(j - 1 + len) % len];
      var p1 = points[j];
      var p2 = points[(j + 1) % len];
      var p3 = points[(j + 2) % len];

      var cp1x = (p1.x + (p2.x - p0.x) * tension) * scaleX;
      var cp1y = (p1.y + (p2.y - p0.y) * tension) * scaleY;
      var cp2x = (p2.x - (p3.x - p1.x) * tension) * scaleX;
      var cp2y = (p2.y - (p3.y - p1.y) * tension) * scaleY;

      dPath += ' C ' + cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ', ' +
                       cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ', ' +
                       getX(p2) + ' ' + getY(p2);
    }
    dPath += ' Z';
    return dPath;
  };

  /**
   * Build Complete SVG Document
   */
  ImageTracer.buildSVG = function(layers, palette, width, height, opts) {
    var svg = [];
    svg.push('<?xml version="1.0" encoding="UTF-8"?>');
    svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">');
    svg.push('  <!-- Generated by AnySVG Pro Vectorizer (https://anysvg.com) -->');
    svg.push('  <defs/>');

    var scaleX = opts.scaleX || 1;
    var scaleY = opts.scaleY || 1;

    layers.forEach(function(layer) {
      var color = palette[layer.colorIdx];
      var hex = color.hex;
      var pathDataList = [];

      layer.paths.forEach(function(poly) {
        var pStr = ImageTracer.pointsToSVGPath(poly, opts.smoothness, scaleX, scaleY);
        if (pStr) pathDataList.push(pStr);
      });

      if (pathDataList.length > 0) {
        svg.push('  <path fill="' + hex + '" d="' + pathDataList.join(' ') + '" fill-rule="evenodd" />');
      }
    });

    svg.push('</svg>');
    return svg.join('\n');
  };

  return ImageTracer;
}));
