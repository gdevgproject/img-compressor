// compress.worker.js (PHIÊN BẢN V8.0 FINAL - Tối ưu Toàn diện)

// --- CÁC HÀM TIỆN ÍCH (Không thay đổi) ---
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

// --- HÀM NÉN CỐT LÕI (Không thay đổi logic, chỉ là một phần của quy trình) ---
async function compressAndEncode(canvas, targetSizeInBytes) {
  let lowerBound = 0;
  let upperBound = 1;
  let bestBlob = null;
  let bestQuality = 0;
  const iterations = 7;

  for (let i = 0; i < iterations; i++) {
    const quality = (lowerBound + upperBound) / 2;
    const blob = await canvas.convertToBlob({ type: "image/webp", quality });

    if (blob.size > targetSizeInBytes) {
      upperBound = quality;
    } else {
      bestBlob = blob;
      bestQuality = quality;
      lowerBound = quality;
    }
  }

  if (!bestBlob) {
    bestBlob = await canvas.convertToBlob({ type: "image/webp", quality: 0 });
    bestQuality = 0;
  }

  return { blob: bestBlob, quality: bestQuality };
}

// --- BỘ ĐIỀU KHIỂN CHÍNH (ĐÃ TÁI CẤU TRÚC HOÀN TOÀN ĐỂ TỐI ƯU) ---
self.onmessage = async function (event) {
  const { file } = event.data;
  try {
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
          minimal: 2,
          vector: 3,
          graphic: 7,
          art: 10,
          standard: 15,
          complex: 20,
        },
      },
    };

    // BƯỚC 1: ĐỌC VÀ PHÂN TÍCH ẢNH GỐC (Chỉ một lần)
    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc dữ liệu ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);

    self.postMessage({
      status: "progress",
      percent: 25,
      message: "Phân tích cấu trúc ảnh...",
    });
    const vitals = await analyzeImageVitals(imageBitmap);

    // BƯỚC 2: XÁC ĐỊNH CÁC PHIÊN BẢN CẦN TẠO VÀ SẮP XẾP
    const originalWidth = imageBitmap.width;
    let profilesToGenerate = [];
    if (originalWidth > profiles.Laptop.maxDimension) {
      profilesToGenerate = [profiles.TV, profiles.Laptop, profiles.Mobile];
    } else if (originalWidth > profiles.Mobile.maxDimension) {
      profilesToGenerate = [profiles.Laptop, profiles.Mobile];
    } else {
      profilesToGenerate = [profiles.Mobile];
    }
    // Sắp xếp từ lớn đến nhỏ để tái sử dụng pixel data hiệu quả
    profilesToGenerate.sort((a, b) => b.maxDimension - a.maxDimension);

    self.postMessage({
      status: "progress",
      percent: 40,
      message: `Chuẩn bị tạo ${profilesToGenerate.length} phiên bản...`,
    });

    // BƯỚC 3: TẠO CÁC CANVAS ĐÃ RESIZE (Tái sử dụng và song song hóa)
    const resizedCanvases = {};
    let lastSource = imageBitmap;
    let lastDim = Math.max(imageBitmap.width, imageBitmap.height);

    for (const profile of profilesToGenerate) {
      const sourceWidth = lastSource.width;
      const sourceHeight = lastSource.height;

      let newWidth = sourceWidth,
        newHeight = sourceHeight;
      if (lastDim > profile.maxDimension) {
        if (sourceWidth > sourceHeight) {
          newHeight = Math.round(
            (sourceHeight * profile.maxDimension) / sourceWidth
          );
          newWidth = profile.maxDimension;
        } else {
          newWidth = Math.round(
            (sourceWidth * profile.maxDimension) / sourceHeight
          );
          newHeight = profile.maxDimension;
        }
      }

      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(lastSource, 0, 0, newWidth, newHeight);

      resizedCanvases[profile.name] = canvas;
      lastSource = canvas; // Nguồn cho lần lặp tiếp theo là canvas vừa tạo
      lastDim = profile.maxDimension;
    }

    // BƯỚC 4: NÉN SONG SONG TẤT CẢ CÁC PHIÊN BẢN
    self.postMessage({
      status: "progress",
      percent: 60,
      message: `Đang nén song song ${profilesToGenerate.length} phiên bản...`,
    });

    const compressionPromises = profilesToGenerate.map(async (profile) => {
      const canvas = resizedCanvases[profile.name];
      const ctx = canvas.getContext("2d");

      // Phân loại ảnh (Logic của bạn)
      const testBlob = await canvas.convertToBlob({
        type: "image/webp",
        quality: 0.85,
      });
      const testSizeKB = testBlob.size / 1024;
      let category = "complex";
      if (vitals.isGrayscale || vitals.detailScore < 1.0) category = "minimal";
      else if (vitals.uniqueColors < 256 && vitals.detailScore < 2.0)
        category = "vector";
      else if (vitals.uniqueColors < 4096 || vitals.detailScore < 3.5)
        category = "graphic";
      else if (testSizeKB < 50 || vitals.detailScore < 5.0) category = "art";
      else if (testSizeKB < 90 && vitals.detailScore < 8.0)
        category = "standard";
      const finalTargetBytes = profile.targets[category] * 1024;

      // Áp dụng bộ lọc (Logic của bạn)
      const inputType = file.type.toLowerCase();
      const isPhotoType =
        inputType.includes("jpeg") ||
        inputType.includes("heic") ||
        inputType.includes("jpg");
      if ((category === "standard" || category === "complex") && isPhotoType) {
        ctx.filter = "blur(0.4px)";
        ctx.drawImage(canvas, 0, 0);
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
      }

      // Nén
      const { blob, quality } = await compressAndEncode(
        canvas,
        finalTargetBytes
      );

      return {
        name: profile.name,
        blob: blob,
        quality: quality,
        width: canvas.width,
        height: canvas.height,
      };
    });

    // Chờ tất cả hoàn thành
    const results = await Promise.all(compressionPromises);

    // BƯỚC 5: GỬI KẾT QUẢ CUỐI CÙNG
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
