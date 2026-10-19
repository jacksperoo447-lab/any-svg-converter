/**
 * Vectorizer UI Controller for AnySVG (v2.0)
 * Precision Controls: Defaults to Crisp Logo & Text (Sharp).
 */

(function() {
  'use strict';

  var state = {
    originalImage: null,
    originalFile: null,
    originalFileName: 'converted-graphic',
    originalWidth: 0,
    originalHeight: 0,
    originalSize: 0,
    svgString: '',
    svgBlobUrl: null,
    zoomLevel: 1,
    activeTab: 'vector',
    isProcessing: false,
    options: {
      mode: 'color',
      numberofcolors: 4,       // Default 4 for clean, crisp logos
      smoothness: 0,           // Default 0: Crisp Logo & Text (Sharp)
      minarea: 12,
      blurradius: 0,
      removeBackground: true,  // Default to clean transparent SVG
      threshold: 128,
      invert: false
    }
  };

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var processingCard = document.getElementById('processingCard');
  var progressBar = document.getElementById('progressBar');
  var progressStatus = document.getElementById('progressStatus');
  var resultsWorkspace = document.getElementById('resultsWorkspace');
  var previewBox = document.getElementById('previewBox');

  var modeColorBtn = document.getElementById('modeColorBtn');
  var modeMonoBtn = document.getElementById('modeMonoBtn');
  var colorControlGroup = document.getElementById('colorControlGroup');
  var monoControlGroup = document.getElementById('monoControlGroup');
  var colorsSlider = document.getElementById('colorsSlider');
  var colorsVal = document.getElementById('colorsVal');
  var smoothnessSlider = document.getElementById('smoothnessSlider');
  var smoothnessVal = document.getElementById('smoothnessVal');
  var thresholdSlider = document.getElementById('thresholdSlider');
  var thresholdVal = document.getElementById('thresholdVal');
  var removeBgToggle = document.getElementById('removeBgToggle');
  var invertToggle = document.getElementById('invertToggle');

  var tabVector = document.getElementById('tabVector');
  var tabOriginal = document.getElementById('tabOriginal');
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomResetBtn = document.getElementById('zoomResetBtn');

  var statDimensions = document.getElementById('statDimensions');
  var statPaths = document.getElementById('statPaths');
  var statOriginalSize = document.getElementById('statOriginalSize');
  var statSvgSize = document.getElementById('statSvgSize');

  var downloadSvgBtn = document.getElementById('downloadSvgBtn');
  var copyCodeBtn = document.getElementById('copyCodeBtn');
  var viewCodeBtn = document.getElementById('viewCodeBtn');
  var convertAnotherBtn = document.getElementById('convertAnotherBtn');

  var codeModal = document.getElementById('codeModal');
  var codeTextarea = document.getElementById('codeTextarea');
  var modalCopyBtn = document.getElementById('modalCopyBtn');

  function init() {
    if (!dropzone || !fileInput) return;

    // Apply default UI control values
    if (colorsSlider && colorsVal) {
      colorsSlider.value = 4;
      colorsVal.textContent = '4 (Logo)';
    }
    if (smoothnessSlider && smoothnessVal) {
      smoothnessSlider.value = 0;
      smoothnessVal.textContent = 'Crisp Logo (Sharp)';
    }
    if (removeBgToggle) {
      removeBgToggle.checked = true;
    }

    dropzone.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        handleSelectedFile(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(function(eventName) {
      dropzone.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(function(eventName) {
      dropzone.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      }, false);
    });

    dropzone.addEventListener('drop', function(e) {
      var dt = e.dataTransfer;
      var files = dt.files;
      if (files && files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });

    if (modeColorBtn && modeMonoBtn) {
      modeColorBtn.addEventListener('click', function() { setMode('color'); });
      modeMonoBtn.addEventListener('click', function() { setMode('monochrome'); });
    }

    if (colorsSlider && colorsVal) {
      colorsSlider.addEventListener('input', function() {
        var v = parseInt(this.value, 10);
        colorsVal.textContent = v <= 4 ? v + ' (Logo)' : v + ' (Rich)';
        state.options.numberofcolors = v;
        debounceRetrace();
      });
    }

    if (smoothnessSlider && smoothnessVal) {
      smoothnessSlider.addEventListener('input', function() {
        var val = parseInt(this.value, 10);
        var labels = ['Crisp Logo (Sharp)', 'Balanced', 'Ultra Smooth'];
        smoothnessVal.textContent = labels[val] || 'Crisp Logo (Sharp)';
        state.options.smoothness = val;
        debounceRetrace();
      });
    }

    if (thresholdSlider && thresholdVal) {
      thresholdSlider.addEventListener('input', function() {
        thresholdVal.textContent = this.value;
        state.options.threshold = parseInt(this.value, 10);
        debounceRetrace();
      });
    }

    if (removeBgToggle) {
      removeBgToggle.addEventListener('change', function() {
        state.options.removeBackground = this.checked;
        debounceRetrace();
      });
    }

    if (invertToggle) {
      invertToggle.addEventListener('change', function() {
        state.options.invert = this.checked;
        debounceRetrace();
      });
    }

    if (tabVector && tabOriginal) {
      tabVector.addEventListener('click', function() {
        state.activeTab = 'vector';
        tabVector.classList.add('active');
        tabOriginal.classList.remove('active');
        renderActivePreview();
      });
      tabOriginal.addEventListener('click', function() {
        state.activeTab = 'original';
        tabOriginal.classList.add('active');
        tabVector.classList.remove('active');
        renderActivePreview();
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() {
        state.zoomLevel = Math.min(3, state.zoomLevel + 0.25);
        applyZoom();
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() {
        state.zoomLevel = Math.max(0.5, state.zoomLevel - 0.25);
        applyZoom();
      });
    }
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', function() {
        state.zoomLevel = 1;
        applyZoom();
      });
    }

    if (downloadSvgBtn) {
      downloadSvgBtn.addEventListener('click', downloadSVG);
    }
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', function() {
        copyTextToClipboard(state.svgString, 'SVG code copied to clipboard!');
      });
    }
    if (viewCodeBtn && codeModal && codeTextarea) {
      viewCodeBtn.addEventListener('click', function() {
        codeTextarea.value = state.svgString;
        codeModal.style.display = 'flex';
      });
    }
    if (modalCopyBtn && codeTextarea) {
      modalCopyBtn.addEventListener('click', function() {
        copyTextToClipboard(codeTextarea.value, 'SVG code copied to clipboard!');
      });
    }
    if (convertAnotherBtn) {
      convertAnotherBtn.addEventListener('click', resetWorkspace);
    }
  }

  function setMode(mode) {
    state.options.mode = mode;
    if (mode === 'color') {
      modeColorBtn.classList.add('active');
      modeMonoBtn.classList.remove('active');
      if (colorControlGroup) colorControlGroup.style.display = 'flex';
      if (monoControlGroup) monoControlGroup.style.display = 'none';
    } else {
      modeMonoBtn.classList.add('active');
      modeColorBtn.classList.remove('active');
      if (colorControlGroup) colorControlGroup.style.display = 'none';
      if (monoControlGroup) monoControlGroup.style.display = 'flex';
    }
    runVectorization();
  }

  function handleSelectedFile(file) {
    if (!file.type.match('image.*')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, GIF, BMP).');
      return;
    }

    state.originalFile = file;
    state.originalFileName = file.name.replace(/\.[^/.]+$/, "");
    state.originalSize = file.size;

    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        state.originalImage = img;
        state.originalWidth = img.naturalWidth || img.width;
        state.originalHeight = img.naturalHeight || img.height;

        dropzone.style.display = 'none';
        processingCard.style.display = 'block';
        updateProgress(30, 'Detecting dominant colors & crisp edges...');

        setTimeout(function() {
          updateProgress(70, 'Tracing sharp vector geometry...');
          setTimeout(function() {
            runVectorization(function() {
              updateProgress(100, 'Vectorization complete!');
              setTimeout(function() {
                processingCard.style.display = 'none';
                resultsWorkspace.style.display = 'grid';
                renderActivePreview();
                showToast('Vectorized successfully!');
              }, 250);
            });
          }, 80);
        }, 100);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function runVectorization(callback) {
    if (!state.originalImage) return;

    try {
      var svg = ImageTracer.imageToSVG(state.originalImage, state.options);
      state.svgString = svg;

      if (state.svgBlobUrl) {
        URL.revokeObjectURL(state.svgBlobUrl);
      }
      var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      state.svgBlobUrl = URL.createObjectURL(blob);

      updateStats(svg);
      renderActivePreview();

      if (typeof callback === 'function') callback();
    } catch (err) {
      console.error(err);
      alert('Error during vectorization: ' + err.message);
    }
  }

  var retraceTimer = null;
  function debounceRetrace() {
    clearTimeout(retraceTimer);
    retraceTimer = setTimeout(function() {
      runVectorization();
    }, 180);
  }

  function updateStats(svg) {
    if (statDimensions) {
      statDimensions.textContent = state.originalWidth + ' × ' + state.originalHeight + ' px';
    }
    if (statPaths) {
      var pathCount = (svg.match(/<path/g) || []).length;
      statPaths.textContent = pathCount + ' paths';
    }
    if (statOriginalSize) {
      statOriginalSize.textContent = formatBytes(state.originalSize);
    }
    if (statSvgSize) {
      var svgBytes = new Blob([svg]).size;
      statSvgSize.textContent = formatBytes(svgBytes);
    }
  }

  function renderActivePreview() {
    if (!previewBox) return;

    if (state.activeTab === 'vector') {
      previewBox.innerHTML = state.svgString;
    } else {
      previewBox.innerHTML = '<img src="' + state.originalImage.src + '" alt="Original Source" style="max-width:90%;max-height:90%;object-fit:contain;" />';
    }
    applyZoom();
  }

  function applyZoom() {
    var target = previewBox.firstElementChild;
    if (target) {
      target.style.transform = 'scale(' + state.zoomLevel + ')';
    }
  }

  function downloadSVG() {
    if (!state.svgString) return;
    var blob = new Blob([state.svgString], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = state.originalFileName + '-vectorized.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    showToast('Download started!');
  }

  function resetWorkspace() {
    state.originalImage = null;
    state.originalFile = null;
    state.svgString = '';
    state.zoomLevel = 1;
    if (state.svgBlobUrl) {
      URL.revokeObjectURL(state.svgBlobUrl);
      state.svgBlobUrl = null;
    }
    if (fileInput) fileInput.value = '';
    resultsWorkspace.style.display = 'none';
    processingCard.style.display = 'none';
    dropzone.style.display = 'block';
  }

  function updateProgress(percent, statusText) {
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressStatus) progressStatus.textContent = statusText;
  }

  function formatBytes(bytes, decimals) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var dm = decimals <= 0 ? 0 : decimals || 1;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
