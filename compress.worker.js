// compress.worker.js (PHIÊN BẢN CUỐI CÙNG)

self.onmessage = async function (event) {
  const { file, maxDimension, defaultTargetKB, tiers } = event.data;

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

    // --- THUẬT TOÁN PHÂN LOẠI ĐA TẦNG ---

    // 1. Nén thăm dò để phân loại
    self.postMessage({
      status: "progress",
      percent: 45,
      message: "Phân tích độ phức tạp ảnh...",
    });
    const complexityTestBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.9,
    });

    let finalTargetKB = defaultTargetKB;
    let strategyName = "Ảnh Chi tiết Cao";

    // 2. Lặp qua các tầng để tìm ra tầng phù hợp
    for (const tier of tiers) {
      if (complexityTestBlob.size <= tier.thresholdKB * 1024) {
        finalTargetKB = tier.targetKB;
        strategyName = tier.name;
        break;
      }
    }

    const finalTargetSizeBytes = finalTargetKB * 1024;
    const strategyMessage = `Phân loại: ${strategyName}. Mục tiêu < ${finalTargetKB}KB...`;
    self.postMessage({
      status: "progress",
      percent: 50,
      message: strategyMessage,
    });

    // 3. Nén thích ứng dựa trên mục tiêu cuối cùng
    let bestBlob = null;
    let bestQuality = 0;
    // === THÊM CÁC BƯỚC CHẤT LƯỢNG THẤP ĐỂ ĐẠT MỤC TIÊU SIÊU NHỎ ===
    const qualitySteps = [
      0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35,
      0.3, 0.25, 0.2, 0.15, 0.1, 0.05,
    ];

    for (let i = 0; i < qualitySteps.length; i++) {
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

    // --- Hoàn tất ---
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
