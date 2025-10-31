// compress.worker.js (PHIÊN BẢN V4 - PHÂN TÍCH CẤU TRÚC)

/**
 * Phân tích các chỉ số sống còn của ảnh: phổ màu và độ phức tạp cấu trúc.
 * @returns {Promise<{uniqueColors: number, isGrayscale: boolean, detailScore: number}>}
 */
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
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];

    colors.add(`${r},${g},${b}`);

    // Kiểm tra độ xám
    if (Math.abs(r - g) < 15 && Math.abs(r - b) < 15) {
      grayscalePixels++;
    }

    // Tính toán Detail Score: so sánh với pixel bên phải
    if ((i / 4) % SAMPLE_SIZE < SAMPLE_SIZE - 1) {
      // Bỏ qua cột cuối cùng
      const r_next = imageData[i + 4];
      const g_next = imageData[i + 5];
      const b_next = imageData[i + 6];
      totalDifference +=
        Math.abs(r - r_next) + Math.abs(g - g_next) + Math.abs(b - b_next);
    }
  }

  const isGrayscale = grayscalePixels / (SAMPLE_SIZE * SAMPLE_SIZE) > 0.98;
  // Chuẩn hóa điểm chi tiết về một thang đo dễ hiểu (ví dụ: 0-100)
  const detailScore = (totalDifference / (imageData.length * 3)) * 100;

  return { uniqueColors: colors.size, isGrayscale, detailScore };
}

self.onmessage = async function (event) {
  const { file, maxDimension, targets } = event.data;

  try {
    // --- Bước 1-3: Đọc, resize (Không đổi) ---
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

    // --- BỘ NÃO PHÂN LOẠI V4 ---
    self.postMessage({
      status: "progress",
      percent: 30,
      message: "Phân tích cấu trúc ảnh...",
    });

    const [vitals, complexityTestBlob] = await Promise.all([
      analyzeImageVitals(imageBitmap),
      canvas.convertToBlob({ type: "image/webp", quality: 0.85 }), // Nén thử ở 85%
    ]);

    let finalTargetKB;
    let strategyName;
    const testSizeKB = complexityTestBlob.size / 1024;

    // Logic phân loại chuyên gia
    if (vitals.isGrayscale || vitals.detailScore < 1.0) {
      finalTargetKB = targets.minimal;
      strategyName = "Tối giản / Đen trắng";
    } else if (vitals.uniqueColors < 256 && vitals.detailScore < 2.0) {
      finalTargetKB = targets.vector;
      strategyName = "Icon / Vector-like";
    } else if (vitals.uniqueColors < 4096 || vitals.detailScore < 3.5) {
      finalTargetKB = targets.graphic;
      strategyName = "UI / Đồ họa phẳng";
    } else if (testSizeKB < 50 || vitals.detailScore < 5.0) {
      finalTargetKB = targets.art;
      strategyName = "Tranh vẽ / Art";
    } else if (testSizeKB < 90 && vitals.detailScore < 8.0) {
      finalTargetKB = targets.standard;
      strategyName = "Ảnh Web Chuẩn";
    } else {
      finalTargetKB = targets.complex;
      strategyName = "Ảnh Siêu chi tiết";
    }

    const finalTargetSizeBytes = finalTargetKB * 1024;
    const strategyMessage = `Phân loại: ${strategyName}. Mục tiêu < ${finalTargetKB}KB...`;
    self.postMessage({
      status: "progress",
      percent: 50,
      message: strategyMessage,
    });

    // --- Vòng lặp nén (Không đổi, nhưng giờ mạnh mẽ hơn) ---
    let bestBlob = null;
    let bestQuality = 0;
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

    // --- Hoàn tất (Không đổi) ---
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
