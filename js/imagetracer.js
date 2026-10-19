/**
 * ImageTracer & Vectorizer Engine for AnySVG
 * High-performance browser-based raster-to-SVG vector tracing.
 * Supports: Multi-color quantization, monochrome thresholding,
 * path simplification, Bezier curve smoothing, and background removal.
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

  // Default vectorization options
  ImageTracer.defaultOptions = {
    // Tracing Mode: 'color' or 'monochrome'
    mode: 'color',
    // Number of quantized colors (2 - 32)
    numberofcolors: 8,
    // Minimum speckle filter (ignore areas smaller than this in pixels)
    minarea: 4,
    // Blur radius before tracing (0 = none, 1 = slight, 2 = strong)
    blurradius: 0,
    // Curve smoothing level: 0 (sharp/pixel-exact), 1 (balanced), 2 (smooth curves)
    smoothness: 1,
    // Path simplification threshold (in pixels)
    simplifyThreshold: 1.2,
    // Remove the detected background color
    removeBackground: false,
    // Monochrome threshold (0 - 255)
    threshold: 128,
    // Invert monochrome result
    invert: false,
    // Output SVG viewbox scale
    scale: 1,
    // Line/fill mode: 'fill'
    fill: true,
    stroke: false,
    strokeWidth: 1
  };

  /**
   * Main function to vectorize an HTML Image, Canvas, or ImageData into SVG string
   */
  ImageTracer.imageToSVG = function(source, options, callback) {
    var opts = Object.assign({}, ImageTracer.defaultOptions, options);

    var imgData;
    if (source instanceof ImageData) {
      imgData = source;
    } else if (source instanceof HTMLCanvasElement) {
      var ctx = source.getContext('2d');
      imgData = ctx.getImageData(0, 0, source.width, source.height);
    } else if (source instanceof HTMLImageElement) {
      var canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth || source.width;
      canvas.height = source.naturalHeight || source.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0);
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      throw new Error('Unsupported source element for vectorization');
    }

    try {
      var svgString = ImageTracer.imageDataToSVG(imgData, opts);
      if (typeof callback === 'function') {
        callback(null, svgString);
      }
      return svgString;
    } catch (err) {
      if (typeof callback === 'function') {
        callback(err, null);
      } else {
        throw err;
      }
    }
  };

  /**
   * Process ImageData into SVG string synchronously
   */
  ImageTracer.imageDataToSVG = function(imgData, opts) {
    opts = Object.assign({}, ImageTracer.defaultOptions, opts);
    var width = imgData.width;
    var height = imgData.height;

    // Optional blur pre-processing
    var processedData = imgData;
    if (opts.blurradius > 0) {
      processedData = ImageTracer.boxBlur(imgData, opts.blurradius);
    }

    var layers = [];
    var palette = [];

    if (opts.mode === 'monochrome') {
      // Monochrome B&W Tracing
      var monoResult = ImageTracer.traceMonochrome(processedData, opts);
      layers = monoResult.layers;
      palette = monoResult.palette;
    } else {
      // Multi-Color Tracing
      var colorResult = ImageTracer.traceMultiColor(processedData, opts);
      layers = colorResult.layers;
      palette = colorResult.palette;
    }

    // Build SVG Document
    return ImageTracer.buildSVG(layers, palette, width, height, opts);
  };

  /**
   * Fast Box Blur for pre-filtering noise
   */
  ImageTracer.boxBlur = function(imgData, radius) {
    var w = imgData.width;
    var h = imgData.height;
    var src = imgData.data;
    var out = new ImageData(w, h);
    var dst = out.data;

    var r = Math.max(1, Math.min(4, Math.floor(radius)));
    var size = (2 * r + 1) * (2 * r + 1);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var rSum = 0, gSum = 0, bSum = 0, aSum = 0;
        var count = 0;

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
   * Trace Monochrome (Potrace style)
   */
  ImageTracer.traceMonochrome = function(imgData, opts) {
    var w = imgData.width;
    var h = imgData.height;
    var data = imgData.data;
    var threshold = opts.threshold;
    var invert = opts.invert;

    // Create 2D binary grid (1 = foreground path, 0 = background)
    var grid = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        var a = data[idx + 3];
        if (a < 64) {
          grid[y * w + x] = invert ? 1 : 0;
          continue;
        }
        // Perceptual luminance formula
        var lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        var isDark = lum < threshold;
        if (invert) isDark = !isDark;
        grid[y * w + x] = isDark ? 1 : 0;
      }
    }

    var paths = ImageTracer.traceGridContours(grid, w, h, opts);
    return {
      palette: [{ r: 0, g: 0, b: 0, a: 255, hex: '#0f172a' }],
      layers: [{ colorIdx: 0, paths: paths }]
    };
  };

  /**
   * Trace Multi-Color by Quantizing Palette and Separating Layers
   */
  ImageTracer.traceMultiColor = function(imgData, opts) {
    var w = imgData.width;
    var h = imgData.height;
    var data = imgData.data;
    var numColors = Math.max(2, Math.min(32, opts.numberofcolors));

    // Generate color palette using adaptive quantization
    var palette = ImageTracer.quantizeColors(data, numColors);

    // Identify background color if removeBackground requested
    var bgColorIndex = -1;
    if (opts.removeBackground) {
      // Sample 4 corners to determine dominant background color
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

    // Map every pixel to a palette index
    var indexed = new Int16Array(w * h);
    for (var i = 0; i < w * h; i++) {
      var p = i * 4;
      var a = data[p + 3];
      if (a < 32) {
        indexed[i] = -1; // Transparent
      } else {
        indexed[i] = ImageTracer.closestPaletteIndex(data[p], data[p + 1], data[p + 2], a, palette);
      }
    }

    // For each color in palette, trace layer
    var layers = [];
    for (var c = 0; c < palette.length; c++) {
      if (opts.removeBackground && c === bgColorIndex) {
        continue; // Skip background layer
      }

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

      if (pixelCount < opts.minarea) {
        continue; // Skip empty / tiny speckle layers
      }

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
   * Fast Adaptive Color Quantization (K-Means / Median Sample Hybrid)
   */
  ImageTracer.quantizeColors = function(data, numColors) {
    // Sample pixels evenly to keep speed blazingly fast
    var step = Math.max(1, Math.floor(data.length / (4 * 4000)));
    var samples = [];
    for (var i = 0; i < data.length; i += step * 4) {
      var a = data[i + 3];
      if (a > 32) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }

    if (samples.length === 0) {
      return [{ r: 0, g: 0, b: 0, a: 255, hex: '#000000' }];
    }

    // Initialize centroids spread across sample space
    var centroids = [];
    var stepSample = Math.max(1, Math.floor(samples.length / numColors));
    for (var k = 0; k < numColors && k * stepSample < samples.length; k++) {
      var s = samples[k * stepSample];
      centroids.push([s[0], s[1], s[2]]);
    }

    // Run 3 quick K-Means refinement iterations
    for (var iter = 0; iter < 4; iter++) {
      var clusters = [];
      var counts = [];
      for (var c = 0; c < centroids.length; c++) {
        clusters.push([0, 0, 0]);
        counts.push(0);
      }

      for (var sIdx = 0; sIdx < samples.length; sIdx++) {
        var sp = samples[sIdx];
        var minDist = Infinity;
        var bestC = 0;
        for (var c2 = 0; c2 < centroids.length; c2++) {
          var cd = centroids[c2];
          var dist = (sp[0] - cd[0]) * (sp[0] - cd[0]) +
                     (sp[1] - cd[1]) * (sp[1] - cd[1]) +
                     (sp[2] - cd[2]) * (sp[2] - cd[2]);
          if (dist < minDist) {
            minDist = dist;
            bestC = c2;
          }
        }
        clusters[bestC][0] += sp[0];
        clusters[bestC][1] += sp[1];
        clusters[bestC][2] += sp[2];
        counts[bestC]++;
      }

      for (var c3 = 0; c3 < centroids.length; c3++) {
        if (counts[c3] > 0) {
          centroids[c3][0] = Math.round(clusters[c3][0] / counts[c3]);
          centroids[c3][1] = Math.round(clusters[c3][1] / counts[c3]);
          centroids[c3][2] = Math.round(clusters[c3][2] / counts[c3]);
        }
      }
    }

    // Convert centroids to Palette format
    return centroids.map(function(c) {
      var r = Math.max(0, Math.min(255, c[0]));
      var g = Math.max(0, Math.min(255, c[1]));
      var b = Math.max(0, Math.min(255, c[2]));
      var hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      return { r: r, g: g, b: b, a: 255, hex: hex };
    });
  };

  /**
   * Find closest palette index by Euclidean distance
   */
  ImageTracer.closestPaletteIndex = function(r, g, b, a, palette) {
    var minDist = Infinity;
    var best = 0;
    for (var i = 0; i < palette.length; i++) {
      var p = palette[i];
      var dist = (r - p.r) * (r - p.r) + (g - p.g) * (g - p.g) + (b - p.b) * (b - p.b);
      if (dist < minDist) {
        minDist = dist;
        best = i;
      }
    }
    return best;
  };

  /**
   * Contour Tracing Algorithm: Extracts polygon boundary loops from binary grid
   */
  ImageTracer.traceGridContours = function(grid, width, height, opts) {
    var visitedEdges = new Set();
    var paths = [];

    // Direction vectors: 0: Right, 1: Down, 2: Left, 3: Up
    var dx = [1, 0, -1, 0];
    var dy = [0, 1, 0, -1];

    function getPixel(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      return grid[y * width + x];
    }

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (getPixel(x, y) === 1) {
          // Check top edge for starting outer contour
          if (getPixel(x, y - 1) === 0) {
            var edgeKey = x + ',' + y + ',0';
            if (!visitedEdges.has(edgeKey)) {
              var contour = traceContourLoop(x, y, 0);
              if (contour && contour.length >= 3) {
                var poly = ImageTracer.simplifyPath(contour, opts.simplifyThreshold);
                if (poly.length >= 3) {
                  paths.push(poly);
                }
              }
            }
          }
        }
      }
    }

    function traceContourLoop(startX, startY, startDir) {
      var points = [];
      var currX = startX;
      var currY = startY;
      var dir = startDir;
      var maxSteps = width * height * 4;
      var step = 0;

      while (step < maxSteps) {
        points.push({ x: currX, y: currY });
        var edgeKey = currX + ',' + currY + ',' + dir;
        visitedEdges.add(edgeKey);

        // Turn right and search for next pixel
        var nextFound = false;
        for (var i = 0; i < 4; i++) {
          var checkDir = (dir + 3 + i) % 4; // Check relative right, straight, left, back
          var nx = currX + dx[checkDir];
          var ny = currY + dy[checkDir];
          if (getPixel(nx, ny) === 1) {
            currX = nx;
            currY = ny;
            dir = checkDir;
            nextFound = true;
            break;
          }
        }

        if (!nextFound) break;
        if (currX === startX && currY === startY && dir === startDir) {
          break; // Loop completed
        }
        step++;
      }
      return points;
    }

    return paths;
  };

  /**
   * Douglas-Peucker Polygon Simplification
   */
  ImageTracer.simplifyPath = function(points, tolerance) {
    if (points.length <= 2) return points;

    function getSqDist(p1, p2) {
      var dx = p1.x - p2.x, dy = p1.y - p2.y;
      return dx * dx + dy * dy;
    }

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

    function dpStep(pts, first, last, sqTol, simplified) {
      var maxSqDist = sqTol;
      var index = -1;
      for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (maxSqDist > sqTol && index !== -1) {
        dpStep(pts, first, index, sqTol, simplified);
        simplified.push(pts[index]);
        dpStep(pts, index, last, sqTol, simplified);
      }
    }

    var sqTolerance = tolerance * tolerance;
    var simplified = [points[0]];
    dpStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
  };

  /**
   * Convert Points to Smooth Bezier or Polygon SVG Path String
   */
  ImageTracer.pointsToSVGPath = function(points, smoothness) {
    if (!points || points.length < 2) return '';

    if (smoothness === 0) {
      // Sharp polygonal path
      var d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
      for (var i = 1; i < points.length; i++) {
        d += ' L ' + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
      }
      d += ' Z';
      return d;
    }

    // Smooth Bezier Curve Fitting
    var dPath = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
    var len = points.length;
    for (var j = 0; j < len; j++) {
      var p0 = points[(j - 1 + len) % len];
      var p1 = points[j];
      var p2 = points[(j + 1) % len];
      var p3 = points[(j + 2) % len];

      // Catmull-Rom to Cubic Bezier conversion
      var tension = smoothness === 2 ? 0.35 : 0.2;
      var cp1x = p1.x + (p2.x - p0.x) * tension;
      var cp1y = p1.y + (p2.y - p0.y) * tension;
      var cp2x = p2.x - (p3.x - p1.x) * tension;
      var cp2y = p2.y - (p3.y - p1.y) * tension;

      dPath += ' C ' + cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ', ' +
                       cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ', ' +
                       p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
    }
    dPath += ' Z';
    return dPath;
  };

  /**
   * Assemble complete valid SVG XML document
   */
  ImageTracer.buildSVG = function(layers, palette, width, height, opts) {
    var svg = [];
    svg.push('<?xml version="1.0" encoding="UTF-8"?>');
    svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">');
    svg.push('  <!-- Generated by AnySVG Pro Vectorizer (https://anysvg.com) -->');
    svg.push('  <defs/>');

    // Optional background fill if not transparent
    if (!opts.removeBackground && opts.mode !== 'monochrome') {
      // Background is drawn layer by layer
    }

    var totalPaths = 0;
    layers.forEach(function(layer) {
      var color = palette[layer.colorIdx];
      var hex = color.hex;
      var pathDataList = [];

      layer.paths.forEach(function(poly) {
        var pStr = ImageTracer.pointsToSVGPath(poly, opts.smoothness);
        if (pStr) {
          pathDataList.push(pStr);
          totalPaths++;
        }
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
