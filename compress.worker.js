// compress.worker.js

/**
 * Hàm nén ảnh "Ultimate"
 * 1. Resize về kích thước chuẩn (maxDimension).
 * 2. Chuyển đổi sang WebP (định dạng tốt nhất).
 * 3. Nén thích ứng: Tự động lặp (iterate) để tìm chất lượng (quality) cao nhất
 * mà vẫn giữ kích thước file dưới targetSizeKB.
 */
self.onmessage = async function (event) {
  const { file, maxDimension, targetSizeKB, minQuality } = event.data;

  try {
    // --- Bước 1: Đọc file (Progress 10%) ---
    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc dữ liệu ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    // --- Bước 2: Tính toán Resize (Progress 20%) ---
    // Chuẩn 1/4 Full HD (1920/2 = 960)
    self.postMessage({
      status: "progress",
      percent: 20,
      message: "Tính toán Kích thước Chuẩn...",
    });

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (Math.max(originalWidth, originalHeight) > maxDimension) {
      if (originalWidth > originalHeight) {
        newWidth = maxDimension;
        newHeight = (originalHeight * maxDimension) / originalWidth;
      } else {
        newHeight = maxDimension;
        newWidth = (originalWidth * maxDimension) / originalHeight;
      }
    }

    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);

    // --- Bước 3: Resize (Downsampling) (Progress 40%) ---
    self.postMessage({
      status: "progress",
      percent: 40,
      message: `Resize về ${newWidth}x${newHeight}px...`,
    });

    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    // --- Bước 4: Nén Thích ứng (Adaptive Compression) (Progress 50% - 90%) ---
    // Đây là quy trình "nén nhiều bước"

    const targetSizeBytes = targetSizeKB * 1024;
    let currentQuality = 0.95; // Bắt đầu ở chất lượng cao nhất
    let bestBlob = null;
    let bestQuality = 0;

    // Chúng ta sẽ thử nén lặp đi lặp lại, giảm dần chất lượng
    // để tìm mức cao nhất mà VẪN dưới 100KB.
    const qualitySteps = [
      0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4,
    ];

    for (let i = 0; i < qualitySteps.length; i++) {
      currentQuality = qualitySteps[i];

      // Cập nhật progress bar
      let progressPercent = 40 + i * 5; // 40 -> 90%
      self.postMessage({
        status: "progress",
        percent: progressPercent,
        message: `Thử nén ở Chất lượng ${(currentQuality * 100).toFixed(
          0
        )}%...`,
      });

      // Nén ra định dạng WebP (tốt nhất)
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: currentQuality,
      });

      if (blob.size <= targetSizeBytes) {
        // TUYỆT VỜI! Đã đạt < 100KB
        // Đây là chất lượng cao nhất có thể đạt được. Dừng lại.
        bestBlob = blob;
        bestQuality = currentQuality;
        break; // Thoát vòng lặp
      }

      // Nếu vẫn > 100KB, gán bestBlob là blob cuối cùng
      // và tiếp tục vòng lặp để thử chất lượng thấp hơn
      bestBlob = blob;
      bestQuality = currentQuality;
    }

    // --- Bước 5: Hoàn tất (Progress 100%) ---
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
    });
  } catch (error) {
    self.postMessage({ status: "error", message: `Lỗi nén: ${error.message}` });
  }
};
