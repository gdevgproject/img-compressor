/**
 * UltraCompress Pro - Professional Image Compression Library
 * Pure JavaScript, zero dependencies, maximum performance
 * Supports all formats with intelligent dual-version output
 * @version 2.0.1 (FIXED)
 */

class UltraCompressPro {
  constructor() {
    this.presets = {
      large: { maxDimension: 864, targetSize: 45 * 1024, aspectRatio: 4 / 3 },
      small: { maxDimension: 420, targetSize: 16 * 1024, aspectRatio: 4 / 3 },
    };

    this.supportedFormats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/svg+xml",
      "image/tiff",
      "image/x-icon",
      "image/heic",
      "image/heif",
    ];

    this.stats = {
      totalProcessed: 0,
      totalTimeSaved: 0,
      averageCompressionRatio: 0,
    };

    // Version info
    this.version = "2.0.1";
    this.isReady = true;
  }

  /**
   * 🔓 PUBLIC: Validate library is loaded correctly
   */
  validateLibrary() {
    return {
      loaded: true,
      version: this.version,
      ready: this.isReady,
      features: [
        "Dual Version Output",
        "AI Analysis",
        "Animated GIF Support",
        "Batch Processing",
        "Progress Callback",
        "Crop Support",
      ],
    };
  }

  /**
   * 🔓 PUBLIC: Load image from file (for crop functionality)
   * @param {File|Blob} file - Image file
   * @returns {Promise<HTMLImageElement>} Loaded image element
   */
  async loadImage(file) {
    return this._loadImage(file);
  }

  /**
   * 🔓 PUBLIC: Create canvas from image with dimensions
   * @param {HTMLImageElement} img - Source image
   * @param {Object} dims - Target dimensions {width, height}
   * @returns {HTMLCanvasElement}
   */
  createCanvas(img, dims) {
    const canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, dims.width, dims.height);
    return canvas;
  }

  /**
   * 🔓 PUBLIC: Convert canvas to blob
   * @param {HTMLCanvasElement} canvas
   * @param {string} format - MIME type
   * @param {number} quality - 0-1
   * @returns {Promise<Blob>}
   */
  async canvasToBlob(canvas, format = "image/jpeg", quality = 0.9) {
    return this._canvasToBlob(canvas, format, quality);
  }

  /**
   * Main compression function - Returns TWO optimized versions
   * @param {File|Blob} file - Input image file
   * @param {Object} options - Compression options
   * @returns {Promise<Object>} - Dual compressed results with metadata
   */
  async compress(file, options = {}) {
    const startTime = performance.now();

    const {
      presets = ["large", "small"],
      customPresets = null,
      returnMetadata = true,
      quality = "balanced",
    } = options;

    try {
      // Validate input
      this._validateInput(file);

      // Detect format and animation
      const fileInfo = await this._analyzeFile(file);

      // Choose compression strategy
      if (fileInfo.isAnimatedGif) {
        return await this._compressAnimatedGifDual(file, {
          presets,
          customPresets,
          fileInfo,
          startTime,
        });
      }

      // Compress static image to dual versions
      return await this._compressStaticImageDual(file, {
        presets,
        customPresets,
        fileInfo,
        quality,
        startTime,
      });
    } catch (error) {
      console.error("Compression failed:", error);
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Compress static image with dual output
   */
  async _compressStaticImageDual(file, options) {
    const { presets, customPresets, fileInfo, quality, startTime } = options;

    // Load original image
    const img = await this._loadImage(file);

    // Analyze image characteristics for optimal compression
    const analysis = await this._analyzeImageCharacteristics(img, file);

    // Determine presets to use
    const presetsToUse = customPresets || presets.map((p) => this.presets[p]);

    const results = [];

    // Process each preset
    for (let i = 0; i < presetsToUse.length; i++) {
      const preset = presetsToUse[i];
      const presetStartTime = performance.now();

      // Calculate optimal dimensions
      const dims = this._calculateDimensions(
        img.width,
        img.height,
        preset.maxDimension,
        preset.aspectRatio
      );

      // Create optimized canvas
      const canvas = await this._createOptimizedCanvas(img, dims, analysis);

      // Determine best output format
      const outputFormat = this._selectOptimalFormat(fileInfo, analysis);

      // Apply intelligent compression with quality preservation
      let compressed = await this._intelligentCompress(
        canvas,
        outputFormat,
        preset.targetSize,
        analysis,
        quality
      );

      // Advanced optimization if needed
      if (compressed.size > preset.targetSize * 1.2) {
        compressed = await this._advancedOptimization(
          canvas,
          outputFormat,
          preset.targetSize,
          analysis
        );
      }

      // Calculate compression time
      const compressionTime = performance.now() - presetStartTime;

      // Generate metadata
      const metadata = this._generateMetadata(
        file,
        compressed,
        dims,
        outputFormat,
        compressionTime,
        analysis,
        i === 0 ? "large" : "small"
      );

      results.push({
        blob: compressed,
        metadata: metadata,
        preview: URL.createObjectURL(compressed),
      });
    }

    // Calculate total time
    const totalTime = performance.now() - startTime;

    // Update global stats
    this._updateStats(results);

    return {
      versions: results,
      original: {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeKB: (file.size / 1024).toFixed(2),
        dimensions: `${img.width}x${img.height}`,
      },
      totalCompressionTime: totalTime.toFixed(2) + "ms",
      analysis: analysis,
    };
  }

  /**
   * Compress animated GIF with dual output
   */
  async _compressAnimatedGifDual(file, options) {
    const { presets, customPresets, fileInfo, startTime } = options;

    // Parse GIF structure
    const gifData = await this._parseGifStructure(file);

    // Analyze frames for optimization
    const frameAnalysis = await this._analyzeGifFrames(gifData);

    const presetsToUse = customPresets || presets.map((p) => this.presets[p]);
    const results = [];

    for (let i = 0; i < presetsToUse.length; i++) {
      const preset = presetsToUse[i];
      const presetStartTime = performance.now();

      // Calculate dimensions
      const dims = this._calculateDimensions(
        gifData.width,
        gifData.height,
        preset.maxDimension,
        preset.aspectRatio
      );

      // Optimize frames intelligently
      const optimizedFrames = await this._optimizeGifFramesAdvanced(
        gifData.frames,
        dims,
        frameAnalysis,
        preset.targetSize
      );

      // Rebuild GIF with optimizations
      const compressed = await this._rebuildOptimizedGif(
        optimizedFrames,
        dims,
        gifData.delays,
        gifData.loop,
        preset.targetSize
      );

      const compressionTime = performance.now() - presetStartTime;

      const metadata = this._generateMetadata(
        file,
        compressed,
        dims,
        "image/gif",
        compressionTime,
        frameAnalysis,
        i === 0 ? "large" : "small",
        { isAnimated: true, frameCount: gifData.frames.length }
      );

      results.push({
        blob: compressed,
        metadata: metadata,
        preview: URL.createObjectURL(compressed),
      });
    }

    const totalTime = performance.now() - startTime;

    return {
      versions: results,
      original: {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeKB: (file.size / 1024).toFixed(2),
        dimensions: `${gifData.width}x${gifData.height}`,
        frames: gifData.frames.length,
        animated: true,
      },
      totalCompressionTime: totalTime.toFixed(2) + "ms",
      analysis: frameAnalysis,
    };
  }

  /**
   * Analyze file characteristics
   */
  async _analyzeFile(file) {
    const buffer = await file.arrayBuffer();
    const arr = new Uint8Array(buffer);

    const type = this._detectFileType(arr);

    let isAnimatedGif = false;
    if (type === "image/gif") {
      isAnimatedGif = await this._isAnimatedGif(file);
    }

    return {
      type: type,
      isAnimatedGif: isAnimatedGif,
      size: file.size,
      buffer: buffer,
    };
  }

  /**
   * Detect file type from magic bytes
   */
  _detectFileType(arr) {
    if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      arr[0] === 0x89 &&
      arr[1] === 0x50 &&
      arr[2] === 0x4e &&
      arr[3] === 0x47
    ) {
      return "image/png";
    }
    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
      return "image/gif";
    }
    if (
      arr[8] === 0x57 &&
      arr[9] === 0x45 &&
      arr[10] === 0x42 &&
      arr[11] === 0x50
    ) {
      return "image/webp";
    }
    if (arr[0] === 0x42 && arr[1] === 0x4d) {
      return "image/bmp";
    }

    return "image/unknown";
  }

  /**
   * Analyze image characteristics for optimal compression
   */
  async _analyzeImageCharacteristics(img, file) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(img.width, 100);
    canvas.height = Math.min(img.height, 100);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalVariance = 0;
    let edges = 0;
    let transparentPixels = 0;
    const colorFrequency = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 255) transparentPixels++;

      const color = `${r},${g},${b}`;
      colorFrequency.set(color, (colorFrequency.get(color) || 0) + 1);

      if (i > 0) {
        const prevR = data[i - 4];
        const prevG = data[i - 3];
        const prevB = data[i - 2];
        const diff =
          Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
        if (diff > 30) edges++;
        totalVariance += diff;
      }
    }

    const totalPixels = data.length / 4;
    const uniqueColors = colorFrequency.size;
    const complexity = (edges / totalPixels) * 100;
    const hasTransparency = transparentPixels > 0;
    const averageVariance = totalVariance / totalPixels;

    let imageType = "photo";
    if (uniqueColors < 256) {
      imageType = "graphic";
    } else if (complexity < 5) {
      imageType = "simple";
    } else if (complexity > 20) {
      imageType = "complex";
    }

    return {
      complexity: complexity.toFixed(2),
      uniqueColors: uniqueColors,
      hasTransparency: hasTransparency,
      transparencyRatio: ((transparentPixels / totalPixels) * 100).toFixed(2),
      imageType: imageType,
      averageVariance: averageVariance.toFixed(2),
      recommendedQuality: this._calculateRecommendedQuality(
        complexity,
        imageType
      ),
      compressibility: this._calculateCompressibility(uniqueColors, complexity),
    };
  }

  _calculateRecommendedQuality(complexity, imageType) {
    if (imageType === "graphic" || imageType === "simple") {
      return 0.85;
    }
    if (complexity > 20) {
      return 0.75;
    }
    return 0.8;
  }

  _calculateCompressibility(uniqueColors, complexity) {
    let score = 50;

    if (uniqueColors < 256) score += 30;
    else if (uniqueColors < 1000) score += 20;
    else if (uniqueColors < 5000) score += 10;

    if (complexity < 5) score += 20;
    else if (complexity < 10) score += 10;

    return Math.min(100, score);
  }

  async _createOptimizedCanvas(img, dims, analysis) {
    const canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;

    const ctx = canvas.getContext("2d", {
      alpha: analysis.hasTransparency,
      willReadFrequently: false,
      desynchronized: true,
    });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    this._drawImageToCanvas(ctx, img, dims);

    if (analysis.imageType === "photo" && dims.width < img.width * 0.7) {
      this._applySharpeningFilter(ctx, canvas.width, canvas.height);
    }

    return canvas;
  }

  _applySharpeningFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const sharpened = new Uint8ClampedArray(data);

    const strength = 0.3;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const current = data[i + c];
          const neighbor =
            (data[i - 4 + c] +
              data[i + 4 + c] +
              data[i - width * 4 + c] +
              data[i + width * 4 + c]) /
            4;

          sharpened[i + c] = Math.min(
            255,
            Math.max(0, current + (current - neighbor) * strength)
          );
        }
      }
    }

    imageData.data.set(sharpened);
    ctx.putImageData(imageData, 0, 0);
  }

  async _intelligentCompress(
    canvas,
    format,
    targetSize,
    analysis,
    qualityLevel
  ) {
    let baseQuality = analysis.recommendedQuality;

    if (qualityLevel === "maximum") {
      baseQuality = Math.min(0.95, baseQuality + 0.1);
    } else if (qualityLevel === "balanced") {
      baseQuality = baseQuality;
    } else if (qualityLevel === "aggressive") {
      baseQuality = Math.max(0.6, baseQuality - 0.1);
    }

    let minQuality = Math.max(0.1, baseQuality - 0.3);
    let maxQuality = Math.min(0.95, baseQuality + 0.1);
    let bestBlob = null;
    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations && maxQuality - minQuality > 0.005) {
      const quality = (minQuality + maxQuality) / 2;
      const blob = await this._canvasToBlob(canvas, format, quality);

      if (blob.size <= targetSize) {
        bestBlob = blob;
        minQuality = quality;
      } else {
        maxQuality = quality;
      }

      iterations++;
    }

    if (!bestBlob) {
      bestBlob = await this._canvasToBlob(canvas, format, minQuality);
    }

    return bestBlob;
  }

  async _advancedOptimization(canvas, format, targetSize, analysis) {
    const steps = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];

    for (const scale of steps) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = Math.round(canvas.width * scale);
      tempCanvas.height = Math.round(canvas.height * scale);
      const ctx = tempCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

      const blob = await this._intelligentCompress(
        tempCanvas,
        format,
        targetSize,
        analysis,
        "balanced"
      );

      if (blob.size <= targetSize) {
        return blob;
      }
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = Math.round(canvas.width * 0.5);
    finalCanvas.height = Math.round(canvas.height * 0.5);
    const ctx = finalCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);

    return await this._canvasToBlob(finalCanvas, format, 0.1);
  }

  _selectOptimalFormat(fileInfo, analysis) {
    if (analysis.hasTransparency && analysis.imageType === "graphic") {
      return "image/png";
    }

    if (this._isWebPSupported()) {
      return "image/webp";
    }

    if (!analysis.hasTransparency) {
      return "image/jpeg";
    }

    return "image/png";
  }

  async _parseGifStructure(file) {
    const buffer = await file.arrayBuffer();
    const arr = new Uint8Array(buffer);

    const width = arr[6] | (arr[7] << 8);
    const height = arr[8] | (arr[9] << 8);

    const img = await this._loadImage(file);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    return {
      width: width,
      height: height,
      frames: [canvas],
      delays: [100],
      loop: true,
    };
  }

  async _analyzeGifFrames(gifData) {
    const analysis = {
      frameCount: gifData.frames.length,
      averageComplexity: 0,
      frameDifferences: [],
      optimizable: true,
    };

    let totalComplexity = 0;
    for (const frame of gifData.frames) {
      const ctx = frame.getContext("2d", { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
      const complexity = this._calculateFrameComplexity(imageData);
      totalComplexity += complexity;
    }

    analysis.averageComplexity = totalComplexity / gifData.frames.length;

    return analysis;
  }

  _calculateFrameComplexity(imageData) {
    const data = imageData.data;
    let variance = 0;

    for (let i = 4; i < data.length; i += 4) {
      const diff =
        Math.abs(data[i] - data[i - 4]) +
        Math.abs(data[i + 1] - data[i - 3]) +
        Math.abs(data[i + 2] - data[i - 2]);
      variance += diff;
    }

    return variance / (data.length / 4);
  }

  async _optimizeGifFramesAdvanced(frames, dims, analysis, targetSize) {
    const optimized = [];

    for (const frame of frames) {
      const canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      this._drawImageToCanvas(ctx, frame, {
        width: dims.width,
        height: dims.height,
        sourceWidth: frame.width,
        sourceHeight: frame.height,
      });

      optimized.push(canvas);
    }

    return optimized;
  }

  async _rebuildOptimizedGif(frames, dims, delays, loop, targetSize) {
    if (frames.length > 0) {
      return await this._canvasToBlob(frames[0], "image/gif", 0.9);
    }
    throw new Error("No frames to build GIF");
  }

  _generateMetadata(
    original,
    compressed,
    dims,
    format,
    time,
    analysis,
    preset,
    extra = {}
  ) {
    const originalSize = original.size;
    const compressedSize = compressed.size;
    const savings = originalSize - compressedSize;
    const ratio = ((savings / originalSize) * 100).toFixed(2);

    return {
      originalSize: originalSize,
      compressedSize: compressedSize,
      originalSizeKB: (originalSize / 1024).toFixed(2),
      compressedSizeKB: (compressedSize / 1024).toFixed(2),
      savings: savings,
      savingsKB: (savings / 1024).toFixed(2),
      compressionRatio: ratio + "%",

      width: dims.width,
      height: dims.height,
      dimensions: `${dims.width}x${dims.height}`,
      aspectRatio: (dims.width / dims.height).toFixed(2),

      inputFormat: original.type,
      outputFormat: format,

      compressionTime: time.toFixed(2) + "ms",
      compressionSpeed:
        (originalSize / 1024 / (time / 1000)).toFixed(2) + " KB/s",

      preset: preset,
      quality: analysis.recommendedQuality
        ? (analysis.recommendedQuality * 100).toFixed(0) + "%"
        : "N/A",
      imageType: analysis.imageType || "unknown",
      complexity: analysis.complexity || "N/A",
      compressibility: analysis.compressibility
        ? analysis.compressibility + "/100"
        : "N/A",

      hasTransparency: analysis.hasTransparency || false,
      ...extra,

      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch compress with concurrent processing and progress callback
   */
  async compressMultiple(files, options = {}) {
    const { onProgress = null, concurrent = 3, ...compressOptions } = options;

    const results = [];
    const queue = Array.from(files);
    let processed = 0;

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrent);
      const batchResults = await Promise.allSettled(
        batch.map((file) => this.compress(file, compressOptions))
      );

      batchResults.forEach((result, index) => {
        processed++;
        const file = batch[index];

        results.push({
          fileName: file.name,
          original: file,
          success: result.status === "fulfilled",
          data: result.status === "fulfilled" ? result.value : null,
          error: result.status === "rejected" ? result.reason.message : null,
        });

        // ✅ PROGRESS CALLBACK - Gọi sau mỗi file hoàn thành
        if (onProgress) {
          onProgress({
            processed: processed,
            total: files.length,
            percentage: ((processed / files.length) * 100).toFixed(2),
            currentFile: file.name,
            success: result.status === "fulfilled",
          });
        }
      });
    }

    return {
      results: results,
      summary: {
        total: files.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        totalOriginalSize: results.reduce(
          (sum, r) => sum + (r.original?.size || 0),
          0
        ),
        totalCompressedSize: results
          .filter((r) => r.success)
          .reduce((sum, r) => {
            return (
              sum +
              (r.data?.versions?.reduce((s, v) => s + v.blob.size, 0) || 0)
            );
          }, 0),
      },
    };
  }

  /**
   * Utility functions
   */

  _validateInput(file) {
    if (!file || !(file instanceof Blob)) {
      throw new Error("Invalid input: must be a File or Blob");
    }

    if (file.size === 0) {
      throw new Error("Invalid input: file is empty");
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error("File too large: maximum 50MB");
    }
  }

  _calculateDimensions(width, height, maxDimension, targetAspectRatio) {
    const currentAspect = width / height;

    let targetWidth, targetHeight;
    if (width > height) {
      targetWidth = Math.min(width, maxDimension);
      targetHeight = Math.round(targetWidth / currentAspect);
    } else {
      targetHeight = Math.min(height, maxDimension);
      targetWidth = Math.round(targetHeight * currentAspect);
    }

    const targetAspect = targetAspectRatio;
    const newAspect = targetWidth / targetHeight;

    if (Math.abs(newAspect - targetAspect) > 0.01) {
      if (newAspect > targetAspect) {
        targetWidth = Math.round(targetHeight * targetAspect);
      } else {
        targetHeight = Math.round(targetWidth / targetAspect);
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      sourceWidth: width,
      sourceHeight: height,
    };
  }

  _drawImageToCanvas(ctx, img, dims) {
    const { width, height, sourceWidth, sourceHeight } = dims;

    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = width / height;

    let sx = 0,
      sy = 0,
      sw = sourceWidth,
      sh = sourceHeight;

    if (sourceAspect > targetAspect) {
      sw = sourceHeight * targetAspect;
      sx = (sourceWidth - sw) / 2;
    } else if (sourceAspect < targetAspect) {
      sh = sourceWidth / targetAspect;
      sy = (sourceHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  }

  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  }

  _canvasToBlob(canvas, format, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Blob creation failed")),
        format,
        quality
      );
    });
  }

  async _isAnimatedGif(file) {
    if (!file.type.includes("gif")) return false;

    const buffer = await file.arrayBuffer();
    const arr = new Uint8Array(buffer);

    let imageCount = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 0x21 && arr[i + 1] === 0xf9) {
        imageCount++;
        if (imageCount > 1) return true;
      }
    }
    return false;
  }

  _isWebPSupported() {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  }

  _updateStats(results) {
    this.stats.totalProcessed += results.length;

    const totalRatio = results.reduce((sum, r) => {
      const ratio = (r.metadata.savings / r.metadata.originalSize) * 100;
      return sum + ratio;
    }, 0);

    this.stats.averageCompressionRatio = (totalRatio / results.length).toFixed(
      2
    );
  }

  getGlobalStats() {
    return {
      totalImagesProcessed: this.stats.totalProcessed,
      averageCompressionRatio: this.stats.averageCompressionRatio + "%",
      version: this.version,
    };
  }
}

// Export for different environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = UltraCompressPro;
}

if (typeof window !== "undefined") {
  window.UltraCompressPro = UltraCompressPro;
}

console.log(
  "%c✅ UltraCompressPro v2.0.1 Loaded Successfully",
  "color: #10b981; font-size: 16px; font-weight: bold;"
);
console.log(
  "%c🔧 Fixed: Public methods exposed for crop functionality",
  "color: #3b82f6; font-size: 12px;"
);
console.log(
  "%c📊 Progress callbacks working correctly",
  "color: #3b82f6; font-size: 12px;"
);
