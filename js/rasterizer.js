/**
 * Rasterizer Engine for AnySVG
 * Converts SVG to high-resolution PNG, JPG, and WEBP using HTML5 Canvas.
 * Supports DPI Scaling (1x, 2x, 4x, 8x), Background Color Filling, and Quality control.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SVGRasterizer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var SVGRasterizer = {};

  /**
   * Parse SVG string or URL and draw onto an HTML5 Canvas at target scale
   */
  SVGRasterizer.svgToCanvas = function(svgSource, scale, bgColor, callback) {
    scale = scale || 1;
    var img = new Image();
    var svgBlob;

    if (svgSource.trim().startsWith('<svg') || svgSource.trim().startsWith('<?xml')) {
      svgBlob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
    } else {
      img.crossOrigin = 'anonymous';
      img.src = svgSource;
    }

    var url = svgBlob ? URL.createObjectURL(svgBlob) : svgSource;

    img.onload = function() {
      var width = (img.naturalWidth || 800) * scale;
      var height = (img.naturalHeight || 600) * scale;

      var canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      var ctx = canvas.getContext('2d');

      // Fill background if specified (crucial for JPG exports)
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (svgBlob) {
        URL.revokeObjectURL(url);
      }

      callback(null, canvas);
    };

    img.onerror = function(err) {
      if (svgBlob) URL.revokeObjectURL(url);
      callback(new Error('Failed to render SVG onto canvas. Make sure SVG code is valid.'));
    };

    if (svgBlob) {
      img.src = url;
    }
  };

  /**
   * Convert SVG to PNG Blob/DataURL
   */
  SVGRasterizer.svgToPNG = function(svgSource, options, callback) {
    var opts = options || {};
    var scale = opts.scale || 2;
    var bgColor = opts.transparent ? null : opts.bgColor;

    SVGRasterizer.svgToCanvas(svgSource, scale, bgColor, function(err, canvas) {
      if (err) return callback(err);
      canvas.toBlob(function(blob) {
        callback(null, {
          blob: blob,
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height
        });
      }, 'image/png');
    });
  };

  /**
   * Convert SVG to JPG Blob/DataURL
   */
  SVGRasterizer.svgToJPG = function(svgSource, options, callback) {
    var opts = options || {};
    var scale = opts.scale || 2;
    var bgColor = opts.bgColor || '#ffffff';
    var quality = typeof opts.quality === 'number' ? opts.quality : 0.92;

    SVGRasterizer.svgToCanvas(svgSource, scale, bgColor, function(err, canvas) {
      if (err) return callback(err);
      canvas.toBlob(function(blob) {
        callback(null, {
          blob: blob,
          dataUrl: canvas.toDataURL('image/jpeg', quality),
          width: canvas.width,
          height: canvas.height
        });
      }, 'image/jpeg', quality);
    });
  };

  /**
   * Convert SVG to WEBP Blob/DataURL
   */
  SVGRasterizer.svgToWEBP = function(svgSource, options, callback) {
    var opts = options || {};
    var scale = opts.scale || 2;
    var bgColor = opts.transparent ? null : opts.bgColor;
    var quality = typeof opts.quality === 'number' ? opts.quality : 0.92;

    SVGRasterizer.svgToCanvas(svgSource, scale, bgColor, function(err, canvas) {
      if (err) return callback(err);
      canvas.toBlob(function(blob) {
        callback(null, {
          blob: blob,
          dataUrl: canvas.toDataURL('image/webp', quality),
          width: canvas.width,
          height: canvas.height
        });
      }, 'image/webp', quality);
    });
  };

  return SVGRasterizer;
}));
