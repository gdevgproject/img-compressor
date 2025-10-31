// compress.worker.js (PHIÊN BẢN V12.1 FINAL - Bổ sung Ghi nhật ký Phân tích)

// --- BỘ NÃO PHÂN TÍCH V12.0 (Không thay đổi) ---
function sobelOperator(x, y, width, data) {
  const at = (x, y) => (y * width + x) * 4;
  const p = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((_, i) => {
    const dx = (i % 3) - 1;
    const dy = Math.floor(i / 3) - 1;
    const idx = at(x + dx, y + dy);
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  });
  const gx = -p[0] - 2 * p[3] - p[6] + p[2] + 2 * p[5] + p[8];
  const gy = -p[0] - 2 * p[1] - p[2] + p[6] + 2 * p[7] + p[8];
  return Math.sqrt(gx * gx + gy * gy);
}

async function analyzeImageVitals(imageBitmap) {
  const mainCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const mainCtx = mainCanvas.getContext("2d");
  mainCtx.drawImage(imageBitmap, 0, 0);
  let maxEdgeDensity = 0;
  let avgUniqueColors = 0;
  let isMostlyGrayscale = true;
  const regions = 9;
  const sampleSize = 33;
  for (let i = 0; i < regions; i++) {
    const regionX = Math.floor(i % 3) * Math.floor(imageBitmap.width / 3);
    const regionY = Math.floor(i / 3) * Math.floor(imageBitmap.height / 3);
    const imageData = mainCtx.getImageData(
      regionX,
      regionY,
      sampleSize,
      sampleSize
    );
    const data = imageData.data;
    const colors = new Set();
    let grayscalePixels = 0;
    let totalEdgeMagnitude = 0;
    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = (y * sampleSize + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2];
        colors.add(`${r},${g},${b}`);
        if (Math.abs(r - g) < 20 && Math.abs(r - b) < 20) grayscalePixels++;
        totalEdgeMagnitude += sobelOperator(x, y, sampleSize, data);
      }
    }
    const currentEdgeDensity = totalEdgeMagnitude / (sampleSize * sampleSize);
    if (currentEdgeDensity > maxEdgeDensity) {
      maxEdgeDensity = currentEdgeDensity;
    }
    avgUniqueColors += colors.size;
    if (grayscalePixels / (sampleSize * sampleSize) < 0.95) {
      isMostlyGrayscale = false;
    }
  }
  return {
    uniqueColors: Math.round(avgUniqueColors / regions),
    isGrayscale: isMostlyGrayscale,
    edgeDensity: maxEdgeDensity,
  };
}

async function compressAndEncode(canvas, targetSizeInBytes) {
  let lowerBound = 0,
    upperBound = 1,
    bestBlob = null,
    bestQuality = 0;
  const iterations = 8;
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
    bestBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality: upperBound,
    });
    bestQuality = upperBound;
  }
  return { blob: bestBlob, quality: bestQuality };
}

// --- BỘ ĐIỀU KHIỂN CHÍNH ---
self.onmessage = async function (event) {
  const { file } = event.data;
  try {
    const profiles = {
      l: {
        name: "l",
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
      m: {
        name: "m",
        maxDimension: 720,
        targets: {
          minimal: 3,
          vector: 5,
          graphic: 10,
          art: 18,
          standard: 25,
          complex: 35,
        },
      },
      s: {
        name: "s",
        maxDimension: 480,
        targets: {
          minimal: 2,
          vector: 4,
          graphic: 8,
          art: 12,
          standard: 18,
          complex: 25,
        },
      },
      t: {
        name: "t",
        maxDimension: 120,
        targets: {
          minimal: 0.5,
          vector: 1,
          graphic: 1.5,
          art: 2,
          standard: 3,
          complex: 4,
        },
      },
    };

    // BƯỚC 1: ĐỌC VÀ PHÂN TÍCH ẢNH GỐC
    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc dữ liệu ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);
    self.postMessage({
      status: "progress",
      percent: 25,
      message: "Phân tích cấu trúc nâng cao...",
    });
    const vitals = await analyzeImageVitals(imageBitmap);

    // === BƯỚC MỚI: GHI NHẬT KÝ PHÂN TÍCH RA CONSOLE ===
    function logAnalysis() {
      let edgeDescription;
      if (vitals.edgeDensity < 15)
        edgeDescription =
          "-> Rất thấp: Ảnh có nhiều vùng phẳng, khả năng là icon, logo.";
      else if (vitals.edgeDensity < 30)
        edgeDescription =
          "-> Thấp: Có các đường nét rõ ràng, khả năng là đồ họa UI, tranh vẽ đơn giản.";
      else if (vitals.edgeDensity < 45)
        edgeDescription =
          "-> Trung bình: Có chi tiết vừa phải, khả năng là tranh vẽ nghệ thuật, ảnh chân dung.";
      else if (vitals.edgeDensity < 60)
        edgeDescription =
          "-> Cao: Nhiều chi tiết nhỏ, khả năng là ảnh chụp thông thường.";
      else
        edgeDescription =
          "-> Rất cao: Cực kỳ nhiều chi tiết nhiễu, khả năng là ảnh phong cảnh (lá cây, thác nước).";

      let finalCategory = "complex";
      if (vitals.isGrayscale) finalCategory = "minimal";
      else if (vitals.edgeDensity < 15 && vitals.uniqueColors < 256)
        finalCategory = "vector";
      else if (vitals.edgeDensity < 30 && vitals.uniqueColors < 4096)
        finalCategory = "graphic";
      else if (vitals.edgeDensity < 45) finalCategory = "art";
      else if (vitals.edgeDensity < 60) finalCategory = "standard";

      console.group("---[ PHÂN TÍCH ẢNH V12.1 ]---");
      console.log("Dữ liệu thô:", vitals);
      console.log(
        "%cGiải thích các chỉ số:",
        "color: #007bff; font-weight: bold;"
      );
      console.log(
        `- Ảnh đen trắng (isGrayscale): ${
          vitals.isGrayscale ? "✅ Có" : "❌ Không"
        }`
      );
      console.log(
        `- Số màu độc nhất (uniqueColors): ${vitals.uniqueColors} (Càng thấp, càng giống ảnh đồ họa/icon)`
      );
      console.log(
        `- Mật độ biên cạnh (edgeDensity): ${vitals.edgeDensity.toFixed(
          2
        )} ${edgeDescription}`
      );
      console.log(
        "%c=> KẾT LUẬN PHÂN LOẠI:",
        "color: #28a745; font-weight: bold;"
      );
      console.log(
        `Thuật toán xếp ảnh này vào loại: %c${finalCategory.toUpperCase()}`,
        "background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;"
      );
      console.groupEnd();
    }
    logAnalysis();
    // ===============================================

    // BƯỚC 2: XÁC ĐỊNH CÁC PHIÊN BẢN CẦN TẠO
    const originalWidth = imageBitmap.width;
    let profilesToGenerate = [];
    if (originalWidth > profiles.m.maxDimension) {
      profilesToGenerate = [profiles.l, profiles.m, profiles.s, profiles.t];
    } else if (originalWidth > profiles.s.maxDimension) {
      profilesToGenerate = [profiles.m, profiles.s, profiles.t];
    } else if (originalWidth > profiles.t.maxDimension) {
      profilesToGenerate = [profiles.s, profiles.t];
    } else {
      profilesToGenerate = [profiles.t];
    }
    profilesToGenerate.sort((a, b) => b.maxDimension - a.maxDimension);

    self.postMessage({
      status: "progress",
      percent: 40,
      message: `Chuẩn bị tạo ${profilesToGenerate.length} phiên bản...`,
    });

    // BƯỚC 3: TẠO CÁC CANVAS ĐÃ RESIZE
    const resizedCanvases = {};
    let lastSource = imageBitmap;
    for (const profile of profilesToGenerate) {
      const sourceWidth = lastSource.width,
        sourceHeight = lastSource.height;
      let newWidth = sourceWidth,
        newHeight = sourceHeight;
      if (Math.max(sourceWidth, sourceHeight) > profile.maxDimension) {
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
      lastSource = canvas;
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
      let category = "complex";
      if (vitals.isGrayscale) category = "minimal";
      else if (vitals.edgeDensity < 15 && vitals.uniqueColors < 256)
        category = "vector";
      else if (vitals.edgeDensity < 30 && vitals.uniqueColors < 4096)
        category = "graphic";
      else if (vitals.edgeDensity < 45) category = "art";
      else if (vitals.edgeDensity < 60) category = "standard";
      const finalTargetBytes = profile.targets[category] * 1024;
      const inputType = file.type.toLowerCase();
      const isPhotoType =
        inputType.includes("jpeg") ||
        inputType.includes("heic") ||
        inputType.includes("jpg");
      if ((category === "standard" || category === "complex") && isPhotoType) {
        ctx.filter = "blur(0.3px)";
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
      }
      if (category !== "minimal" && category !== "vector") {
        let contrast = 1.03,
          saturate = 1.03;
        if (profile.name === "s" || profile.name === "t") {
          contrast = 1.08;
          saturate = 1.05;
        }
        ctx.filter = `contrast(${contrast}) saturate(${saturate})`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
      }
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
    const results = await Promise.all(compressionPromises);

    // BƯỚC 5: GỬI KẾT QUẢ CUỐI CÙNG
    const previewResult =
      results.find((r) => r.name === "m") ||
      results.find((r) => r.name === "s") ||
      results[0];
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
      allProfiles: results.sort((a, b) => b.width - a.width),
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      message: `Lỗi nén đa cấu hình: ${error.message}`,
    });
  }
};
