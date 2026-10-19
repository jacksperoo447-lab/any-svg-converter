/**
 * Reverse Converter UI Controller for AnySVG
 * Manages SVG to PNG, JPG, and WEBP raster conversions.
 */

(function() {
  'use strict';

  var state = {
    svgContent: '',
    fileName: 'vector-export',
    scale: 2,
    format: 'png', // 'png', 'jpg', 'webp'
    bgColor: '#ffffff',
    transparent: true,
    quality: 0.92,
    resultBlob: null,
    resultDataUrl: ''
  };

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var resultsWorkspace = document.getElementById('resultsWorkspace');
  var previewBox = document.getElementById('previewBox');
  var scaleSelector = document.getElementById('scaleSelector');
  var bgColorInput = document.getElementById('bgColorInput');
  var transparentToggle = document.getElementById('transparentToggle');
  var qualitySlider = document.getElementById('qualitySlider');
  var qualityVal = document.getElementById('qualityVal');
  var downloadBtn = document.getElementById('downloadRasterBtn');
  var convertAnotherBtn = document.getElementById('convertAnotherBtn');
  var statDimensions = document.getElementById('statDimensions');
  var statOutputSize = document.getElementById('statOutputSize');

  function init() {
    if (!dropzone || !fileInput) return;

    // Detect target format from page dataset or attribute
    var targetFormatAttr = document.body.getAttribute('data-target-format');
    if (targetFormatAttr) {
      state.format = targetFormatAttr;
    }

    dropzone.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(function(evt) {
      dropzone.addEventListener(evt, function(e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(function(evt) {
      dropzone.addEventListener(evt, function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', function(e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    if (scaleSelector) {
      scaleSelector.addEventListener('change', function() {
        state.scale = parseInt(this.value, 10);
        processConversion();
      });
    }

    if (bgColorInput) {
      bgColorInput.addEventListener('input', function() {
        state.bgColor = this.value;
        if (state.format === 'jpg' || !state.transparent) {
          processConversion();
        }
      });
    }

    if (transparentToggle) {
      transparentToggle.addEventListener('change', function() {
        state.transparent = this.checked;
        processConversion();
      });
    }

    if (qualitySlider && qualityVal) {
      qualitySlider.addEventListener('input', function() {
        qualityVal.textContent = Math.round(this.value * 100) + '%';
        state.quality = parseFloat(this.value);
        processConversion();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        if (!state.resultBlob) return;
        var a = document.createElement('a');
        var ext = state.format === 'jpg' ? 'jpg' : (state.format === 'webp' ? 'webp' : 'png');
        a.download = state.fileName + '@' + state.scale + 'x.' + ext;
        a.href = URL.createObjectURL(state.resultBlob);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Download started!');
      });
    }

    if (convertAnotherBtn) {
      convertAnotherBtn.addEventListener('click', function() {
        state.svgContent = '';
        fileInput.value = '';
        resultsWorkspace.style.display = 'none';
        dropzone.style.display = 'block';
      });
    }
  }

  function handleFile(file) {
    state.fileName = file.name.replace(/\.[^/.]+$/, "");
    var reader = new FileReader();
    reader.onload = function(e) {
      state.svgContent = e.target.result;
      dropzone.style.display = 'none';
      resultsWorkspace.style.display = 'grid';
      processConversion();
    };
    reader.readAsText(file);
  }

  function processConversion() {
    if (!state.svgContent) return;

    var options = {
      scale: state.scale,
      bgColor: state.bgColor,
      transparent: state.transparent && state.format !== 'jpg',
      quality: state.quality
    };

    var callback = function(err, result) {
      if (err) {
        alert(err.message);
        return;
      }
      state.resultBlob = result.blob;
      state.resultDataUrl = result.dataUrl;

      if (previewBox) {
        previewBox.innerHTML = '<img src="' + result.dataUrl + '" alt="Converted Result" style="max-width:90%;max-height:90%;object-fit:contain;" />';
      }
      if (statDimensions) {
        statDimensions.textContent = result.width + ' × ' + result.height + ' px';
      }
      if (statOutputSize) {
        statOutputSize.textContent = formatBytes(result.blob.size);
      }
    };

    if (state.format === 'jpg') {
      SVGRasterizer.svgToJPG(state.svgContent, options, callback);
    } else if (state.format === 'webp') {
      SVGRasterizer.svgToWEBP(state.svgContent, options, callback);
    } else {
      SVGRasterizer.svgToPNG(state.svgContent, options, callback);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
