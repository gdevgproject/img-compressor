// compress.worker.js (PHIÊN BẢN V6.1 - Cập nhật Kích thước Resize Chuẩn)

// --- CÁC HÀM PHÂN TÍCH CỦA V4 (Không thay đổi) ---
async function analyzeImageVitals(imageBitmap) {
  const SAMPLE_SIZE = 100;
  const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  const colors = new Set();
  let totalDifference = 0;
  let grayscalePixels = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i],
      g = imageData[i + 1],
      b = imageData[i + 2];
    colors.add(`${r},${g},${b}`);
    if (Math.abs(r - g) < 15 && Math.abs(r - b) < 15) grayscalePixels++;
    if ((i / 4) % SAMPLE_SIZE < SAMPLE_SIZE - 1) {
      const r_next = imageData[i + 4],
        g_next = imageData[i + 5],
        b_next = imageData[i + 6];
      totalDifference +=
        Math.abs(r - r_next) + Math.abs(g - g_next) + Math.abs(b - b_next);
    }
  }
  const isGrayscale = grayscalePixels / (SAMPLE_SIZE * SAMPLE_SIZE) > 0.98;
  const detailScore = (totalDifference / (imageData.length * 3)) * 100;
  return { uniqueColors: colors.size, isGrayscale, detailScore };
}

// --- HÀM NÉN CỐT LÕI (Không thay đổi) ---
async function compressProfile(
  imageBitmap,
  profile,
  vitals,
  inputType,
  onProgress
) {
  let newWidth = imageBitmap.width,
    newHeight = imageBitmap.height;
  if (Math.max(newWidth, newHeight) > profile.maxDimension) {
    if (newWidth > newHeight) {
      newHeight = Math.round((newHeight * profile.maxDimension) / newWidth);
      newWidth = profile.maxDimension;
    } else {
      newWidth = Math.round((newWidth * profile.maxDimension) / newHeight);
      newHeight = profile.maxDimension;
    }
  }
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
  const testBlob = await canvas.convertToBlob({
    type: "image/webp",
    quality: 0.85,
  });
  const testSizeKB = testBlob.size / 1024;
  let category = "complex";
  if (vitals.isGrayscale || vitals.detailScore < 1.0) {
    category = "minimal";
  } else if (vitals.uniqueColors < 256 && vitals.detailScore < 2.0) {
    category = "vector";
  } else if (vitals.uniqueColors < 4096 || vitals.detailScore < 3.5) {
    category = "graphic";
  } else if (testSizeKB < 50 || vitals.detailScore < 5.0) {
    category = "art";
  } else if (testSizeKB < 90 && vitals.detailScore < 8.0) {
    category = "standard";
  }
  const finalTargetKB = profile.targets[category];
  const isPhotoType =
    inputType.includes("jpeg") ||
    inputType.includes("heic") ||
    inputType.includes("jpg");
  if ((category === "standard" || category === "complex") && isPhotoType) {
    onProgress(`Làm mịn nhiễu cho ảnh chụp...`);
    ctx.filter = "blur(0.4px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }
  let bestBlob = null,
    bestQuality = 0;
  const qualitySteps = [
    0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2,
    0.1, 0.05,
  ];
  for (const quality of qualitySteps) {
    const blob = await canvas.convertToBlob({ type: "image/webp", quality });
    if (blob.size <= finalTargetKB * 1024) {
      bestBlob = blob;
      bestQuality = quality;
      break;
    }
    bestBlob = blob;
    bestQuality = quality;
  }
  onProgress(
    `Hoàn tất cấu hình ${profile.name} (${(bestBlob.size / 1024).toFixed(0)}KB)`
  );
  return {
    name: profile.name,
    blob: bestBlob,
    quality: bestQuality,
    width: newWidth,
    height: newHeight,
  };
}

// --- BỘ ĐIỀU KHIỂN CHÍNH ---
self.onmessage = async function (event) {
  const { file } = event.data;
  try {
    // === CẬP NHẬT KÍCH THƯỚC VÀ TARGETS MỚI TẠI ĐÂY ===
    const profiles = {
      TV: {
        name: "TV",
        maxDimension: 1080,
        targets: {
          minimal: 12,
          vector: 18,
          graphic: 25,
          art: 40,
          standard: 55,
          complex: 65,
        },
      },
      Laptop: {
        name: "Laptop",
        maxDimension: 720,
        targets: {
          minimal: 2.5,
          vector: 5,
          graphic: 10,
          art: 18,
          standard: 25,
          complex: 35,
        },
      },
      Mobile: {
        name: "Mobile",
        maxDimension: 480,
        targets: {
          minimal: 1,
          vector: 2,
          graphic: 4,
          art: 7,
          standard: 10,
          complex: 12,
        },
      },
    };

    const inputType = file.type.toLowerCase();
    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc dữ liệu ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);
    const originalWidth = imageBitmap.width;
    self.postMessage({
      status: "progress",
      percent: 25,
      message: "Phân tích cấu trúc ảnh...",
    });
    const vitals = await analyzeImageVitals(imageBitmap);
    let profilesToGenerate = [];
    if (originalWidth > profiles.Laptop.maxDimension) {
      profilesToGenerate = [profiles.TV, profiles.Laptop, profiles.Mobile];
    } else if (originalWidth > profiles.Mobile.maxDimension) {
      profilesToGenerate = [profiles.Laptop, profiles.Mobile];
    } else {
      profilesToGenerate = [profiles.Mobile];
    }
    self.postMessage({
      status: "progress",
      percent: 40,
      message: `Sẽ tạo ${profilesToGenerate.length} phiên bản...`,
    });
    const results = [];
    let progressChunk = 60 / profilesToGenerate.length;
    for (let i = 0; i < profilesToGenerate.length; i++) {
      const profile = profilesToGenerate[i];
      const result = await compressProfile(
        imageBitmap,
        profile,
        vitals,
        inputType,
        (msg) => {
          self.postMessage({
            status: "progress",
            percent: 40 + i * progressChunk,
            message: msg,
          });
        }
      );
      results.push(result);
    }
    const previewResult =
      results.find((r) => r.name === "Laptop") || results[0];
    self.postMessage({
      status: "progress",
      percent: 100,
      message: `Hoàn tất! Đã tạo ${results.length} phiên bản.`,
    });
    self.postMessage({
      status: "complete",
      compressedBlob: previewResult.blob,
      bestQuality: previewResult.quality,
      originalSize: file.size,
      compressedSize: previewResult.blob.size,
      compressedMime: "image/webp",
      allProfiles: results,
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      message: `Lỗi nén đa cấu hình: ${error.message}`,
    });
  }
};
