// compress.worker.js (PHIÊN BẢN V14.0 FINAL - Phân loại Tinh chỉnh & Ngân sách Tối ưu)

// --- BỘ NÃO PHÂN TÍCH (Không thay đổi thuật toán, chỉ dùng kết quả) ---
function sobelOperator(x, y, width, data) {
  const at = (x, y) => (y * width + x) * 4;
  const p = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((_, i) => {
    const dx = (i % 3) - 1,
      dy = Math.floor(i / 3) - 1,
      idx = at(x + dx, y + dy);
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
  let maxEdgeDensity = 0,
    avgUniqueColors = 0,
    totalFlatRegions = 0;
  let isMostlyGrayscale = true;
  const regions = 9,
    sampleSize = 33;
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
    let grayscalePixels = 0,
      totalEdgeMagnitude = 0,
      mean = 0,
      stdDev = 0;
    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = (y * sampleSize + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2];
        const gray = (r + g + b) / 3;
        mean += gray;
        colors.add(`${r},${g},${b}`);
        if (Math.abs(r - g) < 20 && Math.abs(r - b) < 20) grayscalePixels++;
        totalEdgeMagnitude += sobelOperator(x, y, sampleSize, data);
      }
    }
    mean /= sampleSize * sampleSize;
    for (let i = 0; i < data.length; i += 4) {
      stdDev += Math.pow((data[i] + data[i + 1] + data[i + 2]) / 3 - mean, 2);
    }
    stdDev = Math.sqrt(stdDev / (sampleSize * sampleSize));
    if (stdDev < 10) totalFlatRegions++;
    const currentEdgeDensity = totalEdgeMagnitude / (sampleSize * sampleSize);
    if (currentEdgeDensity > maxEdgeDensity)
      maxEdgeDensity = currentEdgeDensity;
    avgUniqueColors += colors.size;
    if (grayscalePixels / (sampleSize * sampleSize) < 0.95)
      isMostlyGrayscale = false;
  }
  const flatnessRatio = totalFlatRegions / regions;
  const finalUniqueColors = Math.round(avgUniqueColors / regions);
  return {
    uniqueColors: finalUniqueColors,
    isGrayscale: isMostlyGrayscale,
    edgeDensity: maxEdgeDensity,
    flatnessRatio: flatnessRatio,
    colorSparsity: maxEdgeDensity / (finalUniqueColors + 1),
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
    // === BẢNG TARGET V14.0 (COMPRESSION MATRIX < 100KB) ===
    const profiles = {
      l: {
        name: "l",
        maxDimension: 1080,
        targets: {
          ICON: 8,
          UI: 22,
          ILLUSTRATION: 18,
          ART: 27,
          PHOTO: 38,
          PHOTO_COMPLEX: 45,
          TEXTURE: 48,
        },
      },
      m: {
        name: "m",
        maxDimension: 720,
        targets: {
          ICON: 4,
          UI: 14,
          ILLUSTRATION: 10,
          ART: 27,
          PHOTO: 25,
          PHOTO_COMPLEX: 25,
          TEXTURE: 27,
        },
      },
      s: {
        name: "s",
        maxDimension: 480,
        targets: {
          ICON: 2.5,
          UI: 8,
          ILLUSTRATION: 6,
          ART: 15,
          PHOTO: 15,
          PHOTO_COMPLEX: 16,
          TEXTURE: 17,
        },
      },
      t: {
        name: "t",
        maxDimension: 110,
        targets: {
          ICON: 0.8,
          UI: 2,
          ILLUSTRATION: 1.5,
          ART: 4,
          PHOTO: 2.8,
          PHOTO_COMPLEX: 3,
          TEXTURE: 3,
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
      message: "Phân tích chuyên sâu...",
    });
    const vitals = await analyzeImageVitals(imageBitmap);

    // === LOGIC PHÂN LOẠI V14.0 (7 CẤP ĐỘ) ===
    let category = "TEXTURE"; // Mặc định
    if (vitals.isGrayscale && vitals.flatnessRatio > 0.8) category = "ICON";
    else if (vitals.flatnessRatio > 0.7 && vitals.uniqueColors < 128)
      category = "ICON";
    else if (vitals.flatnessRatio > 0.4 && vitals.edgeDensity < 30)
      category = "UI";
    else if (vitals.colorSparsity < 0.025 && vitals.edgeDensity < 45)
      category = "ILLUSTRATION";
    else if (vitals.edgeDensity < 55) category = "ART";
    else if (vitals.edgeDensity < 70) category = "PHOTO";
    else if (vitals.edgeDensity < 85) category = "PHOTO_COMPLEX";

    // === GHI NHẬT KÝ PHÂN TÍCH V14.0 ===
    function logAnalysis() {
      console.group("---[ PHÂN TÍCH ẢNH V14.0 ]---");
      console.log("Dữ liệu thô:", {
        ...vitals,
        edgeDensity: vitals.edgeDensity.toFixed(2),
        flatnessRatio: vitals.flatnessRatio.toFixed(2),
        colorSparsity: vitals.colorSparsity.toFixed(4),
      });
      console.log(
        "%cGiải thích các chỉ số:",
        "color: #007bff; font-weight: bold;"
      );
      console.log(
        `- Tỷ lệ vùng phẳng (flatnessRatio): ${vitals.flatnessRatio.toFixed(
          2
        )} ( > 0.7 là ICON, > 0.4 là UI )`
      );
      console.log(
        `- Mật độ biên cạnh (edgeDensity): ${vitals.edgeDensity.toFixed(
          2
        )} ( < 55 là ART, < 70 là PHOTO, < 85 là PHOTO_COMPLEX )`
      );
      console.log(
        `- Độ thưa thớt màu (colorSparsity): ${vitals.colorSparsity.toFixed(
          4
        )} ( < 0.025 là ILLUSTRATION/Anime )`
      );
      console.log(
        "%c=> KẾT LUẬN PHÂN LOẠI:",
        "color: #28a745; font-weight: bold;"
      );
      console.log(
        `Thuật toán xếp ảnh này vào loại: %c${category}`,
        "background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;"
      );
      console.groupEnd();
    }
    logAnalysis();

    // BƯỚC 2 -> 3: XÁC ĐỊNH PHIÊN BẢN VÀ RESIZE (Không đổi)
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

    // BƯỚC 4: NÉN SONG SONG
    self.postMessage({
      status: "progress",
      percent: 60,
      message: `Đang nén song song ${profilesToGenerate.length} phiên bản...`,
    });
    const compressionPromises = profilesToGenerate.map(async (profile) => {
      const canvas = resizedCanvases[profile.name];
      const ctx = canvas.getContext("2d");
      const finalTargetBytes = profile.targets[category] * 1024;
      const inputType = file.type.toLowerCase();
      const isPhotoType =
        inputType.includes("jpeg") ||
        inputType.includes("heic") ||
        inputType.includes("jpg");

      // Bộ lọc tăng cường thị giác
      if (
        (category === "PHOTO" ||
          category === "PHOTO_COMPLEX" ||
          category === "TEXTURE") &&
        isPhotoType
      ) {
        ctx.filter = "blur(0.3px)";
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
      }
      if (category !== "ICON") {
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

    // BƯỚC 5: GỬI KẾT QUẢ
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
