# 🚀 UltraCompressPro v3.0.0

**Professional image compression library for modern web applications**

Zero dependencies • Framework agnostic • TypeScript ready • AI-powered optimization

[![npm version](https://img.shields.io/npm/v/ultracompresspro.svg)](https://www.npmjs.com/package/ultracompresspro)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/ultracompresspro)](https://bundlephobia.com/package/ultracompresspro)

---

## ✨ Features

- 🎯 **Multi-version Output** - Generate multiple optimized versions in one pass
- 🤖 **AI-Powered Analysis** - Intelligent image analysis for optimal compression
- 📊 **Real-time Progress** - Stream progress updates with event emitters
- 🎨 **Smart Format Selection** - Automatically choose the best output format
- ⚡ **High Performance** - Browser-native APIs with memory efficiency
- 🔧 **Highly Configurable** - Custom presets, quality modes, and options
- 📦 **Framework Agnostic** - Works with Vanilla JS, React, Next.js, Angular, Vue
- 🎭 **Animated GIF Support** - Compress animated images with frame optimization
- 📱 **Responsive** - Perfect for mobile and desktop applications
- 🔒 **Type Safe** - Full TypeScript definitions included

---

## 📦 Installation

### NPM / Yarn / PNPM

```bash
npm install ultracompresspro
# or
yarn add ultracompresspro
# or
pnpm add ultracompresspro
```

### CDN

```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/ultracompresspro@3/dist/compresslib.min.js"></script>

<!-- Or unpkg -->
<script src="https://unpkg.com/ultracompresspro@3/dist/compresslib.min.js"></script>
```

### Direct Download

Download `compresslib.js` and include it in your project:

```html
<script src="./path/to/compresslib.js"></script>
```

---

## 🚀 Quick Start

### Vanilla JavaScript

```javascript
// Initialize compressor
const compressor = new UltraCompressPro();

// Compress single image
const result = await compressor.compress(file);

console.log(result.summary);
// Output: { versionsCount: 2, averageCompressionRatio: 75.5, ... }

// Access compressed versions
result.versions.forEach((version, i) => {
  console.log(`Version ${i + 1}:`, version.metadata);

  // Display image
  const img = document.createElement("img");
  img.src = version.preview;
  document.body.appendChild(img);

  // Download
  const a = document.createElement("a");
  a.href = version.preview;
  a.download = `compressed-${i}.jpg`;
  a.click();
});
```

### React

```jsx
import { useState, useRef } from "react";
import UltraCompressPro from "ultracompresspro";

function ImageCompressor() {
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const compressor = useRef(new UltraCompressPro()).current;

  const handleCompress = async (files) => {
    const result = await compressor.compressMultiple(files, {
      quality: "high",
      onProgress: (p) => setProgress(p.percentage),
    });
    setResults(result.results);
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => handleCompress(e.target.files)}
      />

      {progress > 0 && <div>Progress: {progress}%</div>}

      {results.map((result, i) => (
        <div key={i}>
          {result.success &&
            result.data.versions.map((v, j) => (
              <img key={j} src={v.preview} alt={`Version ${j}`} />
            ))}
        </div>
      ))}
    </div>
  );
}
```

### Next.js (App Router)

```typescript
// app/api/compress/route.ts
import { NextRequest, NextResponse } from "next/server";
import UltraCompressPro from "ultracompresspro";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image") as File;

  const compressor = new UltraCompressPro();
  const result = await compressor.compress(file, {
    quality: "high",
    presets: ["large", "medium", "small"],
  });

  return NextResponse.json({
    success: true,
    summary: result.summary,
    versions: result.versions.map((v) => ({
      size: v.metadata.compressedSizeKB,
      dimensions: v.metadata.dimensions,
      format: v.metadata.outputFormat,
    })),
  });
}
```

```tsx
// app/components/Compressor.tsx
"use client";

import { useState } from "react";
import UltraCompressPro from "ultracompresspro";

export default function Compressor() {
  const [compressor] = useState(() => new UltraCompressPro());

  // Rest of component...
}
```

### Angular

```typescript
// compression.service.ts
import { Injectable } from "@angular/core";
import UltraCompressPro, {
  CompressionResult,
  BatchResult,
} from "ultracompresspro";

@Injectable({ providedIn: "root" })
export class CompressionService {
  private compressor = new UltraCompressPro({
    defaultQuality: "high",
    concurrency: 5,
  });

  async compressImage(file: File): Promise<CompressionResult> {
    return await this.compressor.compress(file);
  }

  async compressMultiple(files: File[]): Promise<BatchResult> {
    return await this.compressor.compressMultiple(files);
  }

  getStats() {
    return this.compressor.getStats();
  }
}
```

### Vue 3

```vue
<script setup lang="ts">
import { ref } from "vue";
import UltraCompressPro from "ultracompresspro";

const compressor = new UltraCompressPro();
const progress = ref(0);
const results = ref([]);

const compress = async (files: File[]) => {
  const result = await compressor.compressMultiple(files, {
    onProgress: (p) => (progress.value = p.percentage),
  });
  results.value = result.results;
};
</script>

<template>
  <div>
    <input type="file" multiple @change="compress($event.target.files)" />
    <div v-if="progress > 0">Progress: {{ progress }}%</div>
    <!-- Display results -->
  </div>
</template>
```

---

## 📖 API Reference

### Constructor

```typescript
new UltraCompressPro(config?: CompressorConfig)
```

**Config Options:**

| Option           | Type      | Default      | Description                 |
| ---------------- | --------- | ------------ | --------------------------- |
| `defaultQuality` | `string`  | `'balanced'` | Default quality mode        |
| `maxFileSize`    | `number`  | `52428800`   | Maximum file size (50MB)    |
| `concurrency`    | `number`  | `5`          | Concurrent processing limit |
| `cacheResults`   | `boolean` | `false`      | Enable result caching       |

### Methods

#### `compress(file, options)`

Compress a single image with multiple versions.

```typescript
compress(file: File | Blob, options?: CompressOptions): Promise<CompressionResult>
```

**Options:**

| Option          | Type             | Default              | Description                                                              |
| --------------- | ---------------- | -------------------- | ------------------------------------------------------------------------ |
| `quality`       | `string`         | `'balanced'`         | `'maximum'` \| `'high'` \| `'balanced'` \| `'aggressive'` \| `'extreme'` |
| `presets`       | `string[]`       | `['large', 'small']` | Preset names or custom configs                                           |
| `customPresets` | `PresetConfig[]` | `null`               | Custom preset configurations                                             |
| `outputFormat`  | `string`         | `null`               | Force output format (auto if null)                                       |
| `metadata`      | `boolean`        | `true`               | Include detailed metadata                                                |

**Returns:**

```typescript
{
  success: true,
  jobId: string,
  file: FileInfo,
  versions: CompressedVersion[],
  analysis: ImageAnalysis,
  performance: PerformanceMetrics,
  summary: Summary,
  timestamp: string
}
```

#### `compressMultiple(files, options)`

Compress multiple images with batch processing.

```typescript
compressMultiple(
  files: File[] | FileList,
  options?: BatchOptions
): Promise<BatchResult>
```

**Options:** All options from `compress()` plus:

| Option           | Type       | Description                    |
| ---------------- | ---------- | ------------------------------ |
| `concurrency`    | `number`   | Process N files simultaneously |
| `onProgress`     | `function` | Progress callback              |
| `onFileComplete` | `function` | Per-file completion callback   |
| `stopOnError`    | `boolean`  | Stop batch on first error      |

**Example:**

```javascript
const result = await compressor.compressMultiple(files, {
  quality: "high",
  concurrency: 3,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.currentFile}`);
  },
  onFileComplete: (result, progress) => {
    if (result.success) {
      console.log("File done:", result.fileName);
    }
  },
});
```

#### Event Methods

```javascript
// Subscribe to events
const unsubscribe = compressor.on("progress", (data) => {
  console.log("Progress:", data);
});

// Unsubscribe
unsubscribe();

// Other events
compressor.on("complete", (result) => {
  /* ... */
});
compressor.on("error", (error) => {
  /* ... */
});
compressor.on("version_complete", (data) => {
  /* ... */
});
compressor.on("batch_start", (data) => {
  /* ... */
});
compressor.on("batch_complete", (data) => {
  /* ... */
});

// One-time listener
compressor.once("complete", (result) => {
  /* ... */
});

// Remove all listeners
compressor.removeAllListeners("progress");
```

#### Utility Methods

```javascript
// Load image
const img = await compressor.loadImage(file);

// Create canvas
const canvas = compressor.createCanvas(img, { width: 800, height: 600 });

// Convert to blob
const blob = await compressor.canvasToBlob(canvas, "image/jpeg", 0.9);

// Calculate dimensions
const dims = compressor.calculateDimensions(1920, 1080, 1024, 16 / 9);

// Analyze image
const analysis = await compressor.analyzeImage(file);

// Check format support
const supported = compressor.isFormatSupported("image/webp");
```

#### Preset Management

```javascript
// Add custom preset
compressor.addPreset("instagram", {
  maxDimension: 1080,
  targetSize: 150 * 1024,
  aspectRatio: 1,
});

// Remove preset
compressor.removePreset("instagram");

// Get all presets
const presets = compressor.getPresets();
```

#### Statistics

```javascript
// Get processing stats
const stats = compressor.getStats();
console.log(stats);
// {
//   totalProcessed: 150,
//   totalOriginalSize: 52428800,
//   totalCompressedSize: 13107200,
//   averageCompressionRatio: 75.5,
//   averageProcessingTime: 45.2
// }

// Reset stats
compressor.resetStats();

// Get library info
const info = compressor.getInfo();
console.log(info);
```

---

## 🎨 Built-in Presets

| Preset      | Dimensions | Target Size | Aspect Ratio | Use Case          |
| ----------- | ---------- | ----------- | ------------ | ----------------- |
| `thumbnail` | 150px      | 10 KB       | 1:1          | Profile pictures  |
| `small`     | 420px      | 16 KB       | 4:3          | Mobile previews   |
| `medium`    | 600px      | 30 KB       | 4:3          | Tablet displays   |
| `large`     | 864px      | 45 KB       | 4:3          | Desktop previews  |
| `xlarge`    | 1024px     | 80 KB       | 4:3          | High-res displays |
| `hd`        | 1280px     | 120 KB      | 16:9         | HD screens        |
| `fullhd`    | 1920px     | 200 KB      | 16:9         | Full HD displays  |

---

## 🎯 Quality Modes

| Mode         | Description                           | Use Case                 |
| ------------ | ------------------------------------- | ------------------------ |
| `maximum`    | Highest quality, larger files         | Professional photography |
| `high`       | High quality, good compression        | Product images           |
| `balanced`   | **Default** - Best quality/size ratio | General use              |
| `aggressive` | Lower quality, smaller files          | Thumbnails               |
| `extreme`    | Minimum quality, minimum size         | Low bandwidth            |

---

## 📊 Response Structure

### CompressionResult

```typescript
{
  success: true,
  jobId: "job_1234567890_abc",
  file: {
    name: "photo.jpg",
    size: 2048000,
    sizeKB: 2000,
    sizeMB: 1.95,
    type: "image/jpeg",
    dimensions: "1920x1080",
    width: 1920,
    height: 1080,
    aspectRatio: 1.778,
    isAnimated: false
  },
  versions: [
    {
      blob: Blob,
      preview: "blob:https://...",
      metadata: {
        versionIndex: 0,
        presetName: "large",
        originalSizeKB: 2000,
        compressedSizeKB: 45,
        compressionRatio: 97.75,
        dimensions: "864x648",
        compressionTime: 23.45,
        quality: "80%",
        // ... more metadata
      }
    }
  ],
  analysis: {
    complexity: 15.34,
    imageType: "photo",
    compressibility: 65,
    recommendedQuality: 0.8,
    hasTransparency: false,
    // ... more analysis
  },
  performance: {
    totalTime: 45.23,
    timePerVersion: 22.61,
    throughput: 44235.12
  },
  summary: {
    versionsCount: 2,
    averageCompressionRatio: 95.5,
    recommendation: { ... }
  }
}
```

### BatchResult

```typescript
{
  success: true,
  batchId: "batch_1234567890_xyz",
  results: [
    {
      fileName: "photo1.jpg",
      success: true,
      data: CompressionResult,
      error: null
    },
    // ...more results
  ],
  summary: {
    total: 100,
    successful: 98,
    failed: 2,
    successRate: 98,
    totalOriginalSizeMB: 195.5,
    totalCompressedSizeMB: 8.9,
    compressionRatio: 95.44,
    totalTime: 4523.45,
    throughput: 42356.78
  }
}
```

---

## 🔧 Advanced Examples

### Custom Crop & Compress

```javascript
// Load image
const img = await compressor.loadImage(file);

// Create canvas with specific crop
const canvas = document.createElement("canvas");
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext("2d");

// Crop center 800x600 from original
const cropX = (img.width - 800) / 2;
const cropY = (img.height - 600) / 2;
ctx.drawImage(img, cropX, cropY, 800, 600, 0, 0, 800, 600);

// Convert to file
const blob = await compressor.canvasToBlob(canvas);
const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });

// Compress
const result = await compressor.compress(croppedFile);
```

### Dynamic Quality Based on Analysis

```javascript
// Analyze first
const analysis = await compressor.analyzeImage(file);

// Choose quality based on complexity
let quality;
if (analysis.complexity < 10) {
  quality = "maximum"; // Simple images can handle high quality
} else if (analysis.complexity > 20) {
  quality = "aggressive"; // Complex images need more compression
} else {
  quality = "balanced";
}

// Compress with dynamic quality
const result = await compressor.compress(file, { quality });
```

### Cancel Long Operations

```javascript
// Start batch
const promise = compressor.compressMultiple(hugeFileList, {
  onProgress: (p) => {
    // Show cancel button when processing
    if (p.percentage > 0) {
      showCancelButton();
    }
  },
});

// Cancel button handler
cancelButton.onclick = () => {
  compressor.cancel();
};

try {
  await promise;
} catch (error) {
  if (error.message.includes("cancelled")) {
    console.log("User cancelled operation");
  }
}
```

### Upload Compressed Images

```javascript
const result = await compressor.compress(file);

// Upload all versions
for (const [index, version] of result.versions.entries()) {
  const formData = new FormData();
  formData.append("image", version.blob, `compressed-${index}.jpg`);
  formData.append("metadata", JSON.stringify(version.metadata));

  await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
}
```

---

## 🎓 Best Practices

### 1. Choose Appropriate Presets

```javascript
// For profile pictures
compress(file, { presets: ["thumbnail"] });

// For galleries
compress(file, { presets: ["large", "medium", "thumbnail"] });

// For responsive images
compress(file, { presets: ["fullhd", "hd", "large", "small"] });
```

### 2. Handle Errors Gracefully

```javascript
try {
  const result = await compressor.compress(file);
} catch (error) {
  if (error.message.includes("too large")) {
    alert("File is too large. Maximum 50MB");
  } else if (error.message.includes("empty")) {
    alert("File is corrupted or empty");
  } else {
    alert("Compression failed: " + error.message);
  }
}
```

### 3. Show Progress for Better UX

```javascript
const progressBar = document.getElementById("progress");
const progressText = document.getElementById("text");

await compressor.compressMultiple(files, {
  onProgress: (p) => {
    progressBar.style.width = p.percentage + "%";
    progressText.textContent = `${p.processed}/${p.total} - ${p.currentFile}`;
  },
});
```

### 4. Memory Management

```javascript
// Clean up blob URLs when done
result.versions.forEach((v) => {
  URL.revokeObjectURL(v.preview);
});

// Or use finally
try {
  const result = await compressor.compress(file);
  // Use result...
} finally {
  result.versions.forEach((v) => URL.revokeObjectURL(v.preview));
}
```

---

## 🔍 Browser Support

| Browser       | Version | Notes           |
| ------------- | ------- | --------------- |
| Chrome        | 90+     | ✅ Full support |
| Firefox       | 88+     | ✅ Full support |
| Safari        | 14+     | ✅ Full support |
| Edge          | 90+     | ✅ Full support |
| Opera         | 76+     | ✅ Full support |
| Mobile Safari | 14+     | ✅ Full support |
| Mobile Chrome | 90+     | ✅ Full support |

**Required APIs:** Canvas API, Blob API, Promise, Async/Await

---

## 📄 License

MIT © gdev.gproject

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

**Made with ❤️ for the web development community**
