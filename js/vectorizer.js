/**
 * AnySVG Core Converter Controller (v6.0)
 * Dual Engine: Vectorizer (Raster to SVG) + Rasterizer (SVG to PNG/JPG/WEBP + Raster to Raster)
 * Features 2-Box Format Selector with Auto-Detect, Swap, and Quick Pills.
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
    rasterBlob: null,
    rasterDataUrl: '',
    zoomLevel: 1,
    activeTab: 'vector',
    isProcessing: false,
    formatFrom: 'auto',
    formatTo: 'svg',
    vectorOptions: {
      mode: 'color',
      numberofcolors: 16,      // Default 16 (Full Vibrant Colors: Red, Green, Yellow, Blue)
      smoothness: 0,           // Crisp Logo & Text (Sharp)
      minarea: 12,
      blurradius: 0,
      removeBackground: true,  // Default to clean transparent SVG
      threshold: 128,
      invert: false
    },
    rasterOptions: {
      scale: 2,
      bgColor: '#ffffff',
      transparent: true,
      quality: 0.92
    }
  };

  // DOM Elements
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var formatFrom = document.getElementById('formatFrom');
  var formatTo = document.getElementById('formatTo');
  var swapFormatsBtn = document.getElementById('swapFormatsBtn');
  var dropzoneTitle = document.getElementById('dropzoneTitle');
  var dropzoneDesc = document.getElementById('dropzoneDesc');
  var pillFrom = document.getElementById('pillFrom');
  var pillTo = document.getElementById('pillTo');

  var processingCard = document.getElementById('processingCard');
  var progressBar = document.getElementById('progressBar');
  var progressStatus = document.getElementById('progressStatus');
  var resultsWorkspace = document.getElementById('resultsWorkspace');
  var previewBox = document.getElementById('previewBox');

  // Vector Controls
  var vectorControls = document.getElementById('vectorControls');
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
  var downloadSvgBtn = document.getElementById('downloadSvgBtn');
  var copyCodeBtn = document.getElementById('copyCodeBtn');
  var viewCodeBtn = document.getElementById('viewCodeBtn');

  // Raster Controls
  var rasterControls = document.getElementById('rasterControls');
  var rasterScale = document.getElementById('rasterScale');
  var rasterBgColor = document.getElementById('rasterBgColor');
  var rasterTransparentToggle = document.getElementById('rasterTransparentToggle');
  var rasterQualityGroup = document.getElementById('rasterQualityGroup');
  var rasterQualitySlider = document.getElementById('rasterQualitySlider');
  var rasterQualityVal = document.getElementById('rasterQualityVal');
  var downloadRasterBtn = document.getElementById('downloadRasterBtn');

  // Common UI
  var tabVector = document.getElementById('tabVector');
  var tabOriginal = document.getElementById('tabOriginal');
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomResetBtn = document.getElementById('zoomResetBtn');
  var statDimensions = document.getElementById('statDimensions');
  var statPaths = document.getElementById('statPaths');
  var statSvgSize = document.getElementById('statSvgSize');
  var convertAnotherBtn = document.getElementById('convertAnotherBtn');

  var codeModal = document.getElementById('codeModal');
  var codeTextarea = document.getElementById('codeTextarea');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var modalCopyBtn = document.getElementById('modalCopyBtn');

  function init() {
    if (!dropzone || !fileInput) return;

    // Apply defaults
    if (colorsSlider && colorsVal) {
      colorsSlider.value = 16;
      colorsVal.textContent = '16 (Vibrant Color)';
    }
    if (smoothnessSlider && smoothnessVal) {
      smoothnessSlider.value = 0;
      smoothnessVal.textContent = 'Crisp Logo (Sharp)';
    }
    if (removeBgToggle) {
      removeBgToggle.checked = true;
    }

    // Dropdown handlers
    if (formatFrom) {
      formatFrom.addEventListener('change', function() {
        state.formatFrom = this.value;
        updateUIFormatLabels();
      });
    }

    if (formatTo) {
      formatTo.addEventListener('change', function() {
        state.formatTo = this.value;
        updateUIFormatLabels();
        // If file already loaded, re-convert with new target format!
        if (state.originalImage || state.svgString) {
          triggerConversion();
        }
      });
    }

    if (swapFormatsBtn) {
      swapFormatsBtn.addEventListener('click', function() {
        var fromVal = formatFrom ? formatFrom.value : 'auto';
        var toVal = formatTo ? formatTo.value : 'svg';

        if (fromVal === 'auto') fromVal = 'png';

        if (formatFrom) formatFrom.value = toVal;
        if (formatTo) formatTo.value = fromVal;

        state.formatFrom = toVal;
        state.formatTo = fromVal;
        updateUIFormatLabels();

        if (state.originalImage || state.svgString) {
          triggerConversion();
        }
      });
    }

    // Popular Converters click bindings
    var popularCards = document.querySelectorAll('.popular-card');
    popularCards.forEach(function(card) {
      card.addEventListener('click', function() {
        var cFrom = card.getAttribute('data-from');
        var cTo = card.getAttribute('data-to');
        if (cFrom && formatFrom) formatFrom.value = cFrom;
        if (cTo && formatTo) formatTo.value = cTo;
        state.formatFrom = cFrom;
        state.formatTo = cTo;
        updateUIFormatLabels();

        // Smooth scroll to dropzone and trigger file dialog
        var convEl = document.getElementById('converter');
        if (convEl) {
          convEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(function() {
          fileInput.click();
        }, 300);
      });
    });

    // Dropzone Events
    var browseFilesBtn = document.getElementById('browseFilesBtn'); if (browseFilesBtn) { browseFilesBtn.addEventListener('click', function(e) { e.stopPropagation(); fileInput.click(); }); }

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

    // Vector Setting listeners
    if (modeColorBtn && modeMonoBtn) {
      modeColorBtn.addEventListener('click', function() { setMode('color'); });
      modeMonoBtn.addEventListener('click', function() { setMode('monochrome'); });
    }

    if (colorsSlider && colorsVal) {
      colorsSlider.addEventListener('input', function() {
        var v = parseInt(this.value, 10);
        if (v <= 4) {
          colorsVal.textContent = v + ' (Clean Logo)';
        } else if (v <= 8) {
          colorsVal.textContent = v + ' (Flat Graphic)';
        } else if (v <= 16) {
          colorsVal.textContent = v + ' (Vibrant Color)';
        } else {
          colorsVal.textContent = v + ' (Ultra Detailed)';
        }
        state.vectorOptions.numberofcolors = v;
        debounceRetrace();
      });
    }

    if (smoothnessSlider && smoothnessVal) {
      smoothnessSlider.addEventListener('input', function() {
        var val = parseInt(this.value, 10);
        var labels = ['Crisp Logo (Sharp)', 'Balanced', 'Ultra Smooth'];
        smoothnessVal.textContent = labels[val] || 'Crisp Logo (Sharp)';
        state.vectorOptions.smoothness = val;
        debounceRetrace();
      });
    }

    if (thresholdSlider && thresholdVal) {
      thresholdSlider.addEventListener('input', function() {
        thresholdVal.textContent = this.value;
        state.vectorOptions.threshold = parseInt(this.value, 10);
        debounceRetrace();
      });
    }

    if (removeBgToggle) {
      removeBgToggle.addEventListener('change', function() {
        state.vectorOptions.removeBackground = this.checked;
        debounceRetrace();
      });
    }

    if (invertToggle) {
      invertToggle.addEventListener('change', function() {
        state.vectorOptions.invert = this.checked;
        debounceRetrace();
      });
    }

    // Raster Controls listeners
    if (rasterScale) {
      rasterScale.addEventListener('change', function() {
        state.rasterOptions.scale = parseInt(this.value, 10);
        runRasterConversion();
      });
    }

    if (rasterBgColor) {
      rasterBgColor.addEventListener('input', function() {
        state.rasterOptions.bgColor = this.value;
        runRasterConversion();
      });
    }

    if (rasterTransparentToggle) {
      rasterTransparentToggle.addEventListener('change', function() {
        state.rasterOptions.transparent = this.checked;
        runRasterConversion();
      });
    }

    if (rasterQualitySlider && rasterQualityVal) {
      rasterQualitySlider.addEventListener('input', function() {
        rasterQualityVal.textContent = Math.round(this.value * 100) + '%';
        state.rasterOptions.quality = parseFloat(this.value);
        runRasterConversion();
      });
    }

    // Tabs & Zoom
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

    // Actions
    if (downloadSvgBtn) {
      downloadSvgBtn.addEventListener('click', downloadSVG);
    }
    if (downloadRasterBtn) {
      downloadRasterBtn.addEventListener('click', downloadRaster);
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
    if (modalCloseBtn && codeModal) {
      modalCloseBtn.addEventListener('click', function() {
        codeModal.style.display = 'none';
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

    updateUIFormatLabels();
  }

  function updateUIFormatLabels() {
    var fFrom = (formatFrom ? formatFrom.value : 'auto').toUpperCase();
    var fTo = (formatTo ? formatTo.value : 'svg').toUpperCase();

    if (pillFrom) pillFrom.textContent = fFrom === 'AUTO' ? 'ANY IMAGE' : fFrom;
    if (pillTo) pillTo.textContent = fTo;

    if (dropzoneTitle) {
      if (fFrom === 'AUTO') {
        dropzoneTitle.textContent = 'Drop any image here to convert to ' + fTo;
      } else {
        dropzoneTitle.textContent = 'Drop your ' + fFrom + ' file here to convert to ' + fTo;
      }
    }
  }

  function handleSelectedFile(file) {
    state.originalFile = file;
    state.originalFileName = file.name.replace(/\.[^/.]+$/, "");
    state.originalSize = file.size;

    // Detect format from extension
    var ext = file.name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'gif'].indexOf(ext) !== -1) {
      var normExt = (ext === 'jpeg') ? 'jpg' : ext;
      if (formatFrom) {
        formatFrom.value = normExt;
        state.formatFrom = normExt;
      }
      updateUIFormatLabels();
    }

    dropzone.style.display = 'none';
    processingCard.style.display = 'block';
    updateProgress(20, 'Reading file contents...');

    if (ext === 'svg' || file.type.indexOf('svg') !== -1) {
      // SVG file uploaded
      var reader = new FileReader();
      reader.onload = function(e) {
        state.svgString = e.target.result;
        // Also create an Image for dimensions / preview
        var svgImg = new Image();
        var blob = new Blob([state.svgString], { type: 'image/svg+xml;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        svgImg.onload = function() {
          state.originalImage = svgImg;
          state.originalWidth = svgImg.naturalWidth || 800;
          state.originalHeight = svgImg.naturalHeight || 600;
          URL.revokeObjectURL(blobUrl);
          triggerConversion();
        };
        svgImg.onerror = function() {
          state.originalWidth = 800;
          state.originalHeight = 600;
          URL.revokeObjectURL(blobUrl);
          triggerConversion();
        };
        svgImg.src = blobUrl;
      };
      reader.readAsText(file);
    } else {
      // Raster image (PNG, JPG, WEBP, BMP, GIF)
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          state.originalImage = img;
          state.originalWidth = img.naturalWidth || img.width;
          state.originalHeight = img.naturalHeight || img.height;
          triggerConversion();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  function triggerConversion() {
    var target = formatTo ? formatTo.value : 'svg';
    var source = state.formatFrom;

    if (target === 'svg') {
      // Raster to SVG
      showVectorUI();
      updateProgress(50, 'Analyzing contours & tracing paths...');
      setTimeout(function() {
        runVectorization(function() {
          updateProgress(100, 'Vectorization complete!');
          setTimeout(function() {
            processingCard.style.display = 'none';
            resultsWorkspace.style.display = 'grid'; scrollToWorkspace();
            renderActivePreview();
            showToast('Vectorized successfully!');
          }, 200);
        });
      }, 50);
    } else {
      // Converting to PNG / JPG / WEBP
      showRasterUI();
      updateProgress(60, 'Rendering high-resolution raster...');
      setTimeout(function() {
        runRasterConversion(function() {
          updateProgress(100, 'Conversion complete!');
          setTimeout(function() {
            processingCard.style.display = 'none';
            resultsWorkspace.style.display = 'grid'; scrollToWorkspace();
            renderActivePreview();
            showToast('Converted successfully!');
          }, 200);
        });
      }, 50);
    }
  }

  function showVectorUI() {
    if (vectorControls) vectorControls.style.display = 'block';
    if (rasterControls) rasterControls.style.display = 'none';
    if (tabVector) tabVector.textContent = 'Vector SVG';
  }

  function showRasterUI() {
    if (vectorControls) vectorControls.style.display = 'none';
    if (rasterControls) rasterControls.style.display = 'block';
    var target = (formatTo ? formatTo.value : 'png').toUpperCase();
    if (tabVector) tabVector.textContent = 'Converted ' + target;

    // Toggle quality control for JPG/WEBP
    if (rasterQualityGroup) {
      rasterQualityGroup.style.display = (target === 'JPG' || target === 'WEBP') ? 'block' : 'none';
    }
  }

  function runVectorization(callback) {
    if (!state.originalImage) return;

    try {
      var svg = ImageTracer.imageToSVG(state.originalImage, state.vectorOptions);
      state.svgString = svg;

      if (state.svgBlobUrl) {
        URL.revokeObjectURL(state.svgBlobUrl);
      }
      var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      state.svgBlobUrl = URL.createObjectURL(blob);

      updateStats(blob.size, countPaths(svg));
      if (typeof callback === 'function') callback();
    } catch (err) {
      console.error('Vectorization failed:', err);
      alert('Vectorization failed: ' + err.message);
      processingCard.style.display = 'none';
      dropzone.style.display = 'block';
    }
  }

  function runRasterConversion(callback) {
    var target = formatTo ? formatTo.value : 'png';
    var scale = state.rasterOptions.scale || 2;
    var bgColor = (target === 'jpg' || !state.rasterOptions.transparent) ? state.rasterOptions.bgColor : null;
    var quality = state.rasterOptions.quality || 0.92;

    if (state.svgString) {
      // SVG to Raster using SVGRasterizer
      var opts = {
        scale: scale,
        bgColor: bgColor,
        transparent: state.rasterOptions.transparent && target !== 'jpg',
        quality: quality
      };

      var handler = function(err, result) {
        if (err) {
          console.error('Rasterization error:', err);
          return;
        }
        state.rasterBlob = result.blob;
        state.rasterDataUrl = result.dataUrl;
        if (statDimensions) {
          statDimensions.textContent = result.width + ' × ' + result.height + ' px';
        }
        if (statSvgSize) {
          statSvgSize.textContent = formatBytes(result.blob.size);
        }
        renderActivePreview();
        if (typeof callback === 'function') callback();
      };

      if (typeof SVGRasterizer !== 'undefined') {
        if (target === 'jpg') {
          SVGRasterizer.svgToJPG(state.svgString, opts, handler);
        } else if (target === 'webp') {
          SVGRasterizer.svgToWEBP(state.svgString, opts, handler);
        } else {
          SVGRasterizer.svgToPNG(state.svgString, opts, handler);
        }
      }
    } else if (state.originalImage) {
      // Raster to Raster (e.g. PNG to JPG/WEBP)
      var canvas = document.createElement('canvas');
      var w = state.originalWidth * scale;
      var h = state.originalHeight * scale;
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      var ctx = canvas.getContext('2d');

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(state.originalImage, 0, 0, canvas.width, canvas.height);

      var mimeType = target === 'jpg' ? 'image/jpeg' : (target === 'webp' ? 'image/webp' : 'image/png');
      canvas.toBlob(function(blob) {
        state.rasterBlob = blob;
        state.rasterDataUrl = canvas.toDataURL(mimeType, quality);
        if (statDimensions) {
          statDimensions.textContent = canvas.width + ' × ' + canvas.height + ' px';
        }
        if (statSvgSize) {
          statSvgSize.textContent = formatBytes(blob.size);
        }
        renderActivePreview();
        if (typeof callback === 'function') callback();
      }, mimeType, quality);
    }
  }

  var retraceTimer = null;
  function debounceRetrace() {
    clearTimeout(retraceTimer);
    retraceTimer = setTimeout(function() {
      runVectorization(function() {
        renderActivePreview();
      });
    }, 200);
  }

  function setMode(mode) {
    state.vectorOptions.mode = mode;
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
    runVectorization(function() {
      renderActivePreview();
    });
  }

  function renderActivePreview() {
    if (!previewBox) return;
    previewBox.innerHTML = '';

    var target = formatTo ? formatTo.value : 'svg';

    if (state.activeTab === 'original' && state.originalImage) {
      var img = document.createElement('img');
      img.src = state.originalImage.src;
      img.alt = 'Original graphic';
      img.style.transform = 'scale(' + state.zoomLevel + ')';
      img.style.transition = 'transform 0.15s ease';
      previewBox.appendChild(img);
    } else if (target === 'svg' && state.svgString) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = state.svgString;
      var svgEl = wrapper.querySelector('svg');
      if (svgEl) {
        svgEl.style.transform = 'scale(' + state.zoomLevel + ')';
        svgEl.style.transition = 'transform 0.15s ease';
        previewBox.appendChild(svgEl);
      }
    } else if (state.rasterDataUrl) {
      var rImg = document.createElement('img');
      rImg.src = state.rasterDataUrl;
      rImg.alt = 'Converted graphic';
      rImg.style.transform = 'scale(' + state.zoomLevel + ')';
      rImg.style.transition = 'transform 0.15s ease';
      previewBox.appendChild(rImg);
    }
  }

  function applyZoom() {
    var el = previewBox.querySelector('svg') || previewBox.querySelector('img');
    if (el) {
      el.style.transform = 'scale(' + state.zoomLevel + ')';
    }
    if (zoomResetBtn) {
      zoomResetBtn.textContent = Math.round(state.zoomLevel * 100) + '%';
    }
  }

  function updateProgress(percent, statusText) {
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressStatus) progressStatus.textContent = statusText;
  }

  function updateStats(svgByteSize, pathsCount) {
    if (statDimensions) {
      statDimensions.textContent = state.originalWidth + ' × ' + state.originalHeight + ' px';
    }
    if (statPaths) {
      statPaths.textContent = pathsCount + ' paths';
    }
    if (statSvgSize) {
      statSvgSize.textContent = formatBytes(svgByteSize);
    }
  }

  function countPaths(svgStr) {
    var match = svgStr.match(/<path/g);
    return match ? match.length : 0;
  }

  function downloadSVG() {
    if (!state.svgString) return;
    var blob = new Blob([state.svgString], { type: 'image/svg+xml;charset=utf-8' });
    var a = document.createElement('a');
    a.download = state.originalFileName + '.svg';
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('SVG downloaded successfully!');
  }

  function downloadRaster() {
    if (!state.rasterBlob) return;
    var target = formatTo ? formatTo.value : 'png';
    var a = document.createElement('a');
    a.download = state.originalFileName + '.' + target;
    a.href = URL.createObjectURL(state.rasterBlob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(target.toUpperCase() + ' downloaded successfully!');
  }

  
  function scrollToWorkspace() {
    setTimeout(function() {
      var toolCard = document.getElementById('converter');
      if (toolCard) {
        var headerOffset = 55;
        var elPos = toolCard.getBoundingClientRect().top;
        var offsetPos = elPos + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPos),
          behavior: 'smooth'
        });
      }
    }, 80);
  }

  function resetWorkspace() {
    state.originalImage = null;
    state.originalFile = null;
    state.svgString = '';
    state.rasterBlob = null;
    state.rasterDataUrl = '';
    if (state.svgBlobUrl) URL.revokeObjectURL(state.svgBlobUrl);
    state.svgBlobUrl = null;

    fileInput.value = '';
    resultsWorkspace.style.display = 'none';
    processingCard.style.display = 'none';
    dropzone.style.display = 'block';
    updateUIFormatLabels();
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function copyTextToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast(successMsg);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    }
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast-alert';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('visible');
    }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();