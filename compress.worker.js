// compress.worker.js (PHIÊN BẢN V3 - PHÂN TÍCH NỘI DUNG)

/**
 * Phân tích các đặc tính nội tại của ảnh từ một bản sao thu nhỏ.
 * @returns {Promise<{uniqueColors: number, isGrayscale: boolean}>}
 */
async function analyzeImageProperties(imageBitmap) {
  const SAMPLE_SIZE = 100; // Phân tích trên ảnh mẫu 100x100px cho tốc độ
  const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;

  const colors = new Set();
  let grayscalePixels = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];

    // Thêm màu vào Set để đếm màu độc nhất
    colors.add(`${r},${g},${b}`);

    // Kiểm tra độ xám
    const isGray = Math.abs(r - g) < 10 && Math.abs(r - b) < 10;
    if (isGray) {
      grayscalePixels++;
    }
  }

  // Nếu hơn 95% pixel là màu xám, coi là ảnh đen trắng
  const isGrayscale = grayscalePixels / (SAMPLE_SIZE * SAMPLE_SIZE) > 0.95;

  return { uniqueColors: colors.size, isGrayscale };
}

self.onmessage = async function (event) {
  const { file, maxDimension, targets } = event.data;

  try {
    // --- Bước 1-3: Đọc, tính toán, resize (Không thay đổi) ---
    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc dữ liệu ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);
    let newWidth = imageBitmap.width;
    let newHeight = imageBitmap.height;
    if (Math.max(newWidth, newHeight) > maxDimension) {
      if (newWidth > newHeight) {
        newHeight = (newHeight * maxDimension) / newWidth;
        newWidth = maxDimension;
      } else {
        newWidth = (newWidth * maxDimension) / newHeight;
        newHeight = maxDimension;
      }
    }
    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);
    self.postMessage({
      status: "progress",
      percent: 20,
      message: `Resize về ${newWidth}x${newHeight}px...`,
    });
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    // --- THUẬT TOÁN PHÂN LOẠI NÂNG CAO ---
    self.postMessage({
      status: "progress",
      percent: 30,
      message: "Phân tích nội dung ảnh...",
    });

    // Chạy đồng thời 2 phép phân tích để tiết kiệm thời gian
    const [properties, complexityTestBlob] = await Promise.all([
      analyzeImageProperties(imageBitmap),
      canvas.convertToBlob({ type: "image/webp", quality: 0.9 }),
    ]);

    let finalTargetKB;
    let strategyName;
    const testSizeKB = complexityTestBlob.size / 1024;

    // Logic phân loại đa tầng V3
    if (properties.isGrayscale) {
      finalTargetKB = targets.grayscale;
      strategyName = "Ảnh Đen Trắng";
    } else if (properties.uniqueColors < 512 || testSizeKB < 10) {
      finalTargetKB = targets.minimal;
      strategyName = "Đồ họa Tối giản";
    } else if (properties.uniqueColors < 8192 || testSizeKB < 40) {
      finalTargetKB = targets.graphic;
      strategyName = "Đồ họa Phẳng";
    } else if (testSizeKB < 85) {
      finalTargetKB = targets.standard;
      strategyName = "Ảnh Web Chuẩn";
    } else {
      finalTargetKB = targets.complex;
      strategyName = "Ảnh Siêu Phức tạp";
    }

    const finalTargetSizeBytes = finalTargetKB * 1024;
    const strategyMessage = `Phân loại: ${strategyName}. Mục tiêu < ${finalTargetKB}KB...`;
    self.postMessage({
      status: "progress",
      percent: 50,
      message: strategyMessage,
    });

    // --- Nén thích ứng (gần như không đổi) ---
    let bestBlob = null;
    let bestQuality = 0;
    const qualitySteps = [
      0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35,
      0.3, 0.25, 0.2, 0.15, 0.1, 0.05,
    ];

    for (let i = 0; i < qualitySteps.length; i++) {
      // ... (vòng lặp for giữ nguyên như cũ)
      const currentQuality = qualitySteps[i];
      const progressPercent = 50 + i * (50 / qualitySteps.length);
      self.postMessage({
        status: "progress",
        percent: Math.min(99, Math.round(progressPercent)),
        message: `Thử nén ở Chất lượng ${(currentQuality * 100).toFixed(
          0
        )}%...`,
      });
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: currentQuality,
      });
      if (blob.size <= finalTargetSizeBytes) {
        bestBlob = blob;
        bestQuality = currentQuality;
        break;
      }
      bestBlob = blob;
      bestQuality = currentQuality;
    }

    // --- Hoàn tất (Không thay đổi) ---
    self.postMessage({
      status: "progress",
      percent: 100,
      message: `Hoàn tất ở Chất lượng ${(bestQuality * 100).toFixed(0)}%!`,
    });
    self.postMessage({
      status: "complete",
      compressedBlob: bestBlob,
      originalSize: file.size,
      compressedSize: bestBlob.size,
      compressedMime: "image/webp",
      bestQuality: bestQuality,
    });
  } catch (error) {
    self.postMessage({ status: "error", message: `Lỗi nén: ${error.message}` });
  }
};
