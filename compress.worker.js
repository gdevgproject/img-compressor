// compress.worker.js (PHIÊN BẢN V19.0 FINAL - Bộ não Nhận thức Đa chiều & Target Động)

// --- BỘ NÃO PHÂN TÍCH V19.0 ---
async function analyzeImageVitals(imageBitmap) {
  const mainCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const mainCtx = mainCanvas.getContext("2d");
  mainCtx.drawImage(imageBitmap, 0, 0);

  let maxStructuralComplexity = 0,
    maxTextureScore = 0,
    totalFlatRegions = 0,
    totalColorEntropy = 0;

  // === THAY ĐỔI BẮT ĐẦU TẠI ĐÂY ===
  const regions = 25; // Tăng từ 9 lên 25 vùng để phân tích chi tiết hơn
  const regionsPerRow = Math.sqrt(regions); // Sẽ là 5
  const regionWidth = Math.floor(imageBitmap.width / regionsPerRow);
  const regionHeight = Math.floor(imageBitmap.height / regionsPerRow);
  // === KẾT THÚC THAY ĐỔI ===

  const sampleSize = 40; // Giữ nguyên kích thước mẫu để phân tích chính xác hơn

  for (let i = 0; i < regions; i++) {
    // === THAY ĐỔI BẮT ĐẦU TẠI ĐÂY ===
    // Tính toán vị trí X, Y của vùng một cách linh hoạt
    const regionX = Math.floor(i % regionsPerRow) * regionWidth;
    const regionY = Math.floor(i / regionsPerRow) * regionHeight;
    // === KẾT THÚC THAY ĐỔI ===

    // Đảm bảo không lấy mẫu ngoài biên ảnh
    const sampleX = Math.min(regionX, imageBitmap.width - sampleSize);
    const sampleY = Math.min(regionY, imageBitmap.height - sampleSize);

    const imageData = mainCtx.getImageData(
      sampleX,
      sampleY,
      sampleSize,
      sampleSize
    );
    const data = imageData.data;
    let strongEdgeCount = 0,
      textureVariance = 0,
      mean = 0,
      stdDev = 0;
    const hist = new Array(256).fill(0);

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = (y * sampleSize + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        mean += gray;
        hist[Math.floor(gray)]++;

        // Tính Structural Complexity (đếm biên cạnh mạnh)
        const gx = -data[idx - 4] + data[idx + 4];
        const gy = -data[idx - sampleSize * 4] + data[idx + sampleSize * 4];
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 50) strongEdgeCount++;

        // Tính Texture Score (phương sai của Laplacian)
        const laplacian =
          data[idx - 4] +
          data[idx + 4] +
          data[idx - sampleSize * 4] +
          data[idx + sampleSize * 4] -
          4 * gray;
        textureVariance += laplacian * laplacian;
      }
    }

    mean /= sampleSize * sampleSize;
    for (let i = 0; i < data.length; i += 4) {
      stdDev += Math.pow((data[i] + data[i + 1] + data[i + 2]) / 3 - mean, 2);
    }
    stdDev = Math.sqrt(stdDev / (sampleSize * sampleSize));
    if (stdDev < 18) totalFlatRegions++; // Nới lỏng ngưỡng "phẳng"

    const structuralComplexity = strongEdgeCount / (sampleSize * sampleSize);
    if (structuralComplexity > maxStructuralComplexity)
      maxStructuralComplexity = structuralComplexity;

    const textureScore = textureVariance / (sampleSize * sampleSize) / 1000;
    if (textureScore > maxTextureScore) maxTextureScore = textureScore;

    let entropy = 0;
    for (const p of hist) {
      if (p > 0)
        entropy -=
          (p / (sampleSize * sampleSize)) *
          Math.log2(p / (sampleSize * sampleSize));
    }
    totalColorEntropy += entropy;
  }

  return {
    flatnessRatio: totalFlatRegions / regions,
    structuralComplexity: maxStructuralComplexity,
    textureScore: maxTextureScore,
    colorEntropy: totalColorEntropy / regions,
  };
}

// Hàm phát hiện ảnh đã bị nén
function detectCompressionArtifacts(vitals) {
  // Heuristic: Nếu ảnh có cấu trúc rõ ràng (như UI) nhưng điểm texture lại cao bất thường
  // -> có thể là do các khối vuông JPEG artifact.
  return vitals.structuralComplexity > 0.1 && vitals.textureScore > 1.5;
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
      m: { name: "m", maxDimension: 864, baseKB: 4, maxKB: 35 },
      s: { name: "s", maxDimension: 420, baseKB: 2, maxKB: 18 },
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
      message: "Phân tích nhận thức (25 vùng)...", // Cập nhật thông báo
    });
    const vitals = await analyzeImageVitals(imageBitmap);

    // BƯỚC 1.5: KIỂM TRA ẢNH ĐÃ BỊ NÉN
    const isAlreadyCompressed = detectCompressionArtifacts(vitals);

    // BƯỚC 2: TÍNH TOÁN TARGET ĐỘNG
    function calculateDynamicTarget(profile, vitals, isArtifacted) {
      let target = profile.baseKB;
      // Trọng số cho từng chỉ số
      target += vitals.textureScore * 40; // Texture rất tốn kém
      target += vitals.structuralComplexity * 80; // Cấu trúc cũng tốn kém
      target -= vitals.flatnessRatio * profile.baseKB * 0.8; // Vùng phẳng giúp giảm size

      // Nếu phát hiện artifact, hãy "nhân từ" hơn, cho thêm ngân sách
      if (isArtifacted) {
        target *= 1.25;
      }

      // Đảm bảo target nằm trong giới hạn min/max
      return Math.max(profile.baseKB, Math.min(target, profile.maxKB));
    }

    // Dự đoán loại ảnh chỉ để LOG, không ảnh hưởng logic
    let predictedCategory = "PHOTO";
    if (
      vitals.flatnessRatio > 0.8 ||
      (vitals.flatnessRatio > 0.6 && vitals.structuralComplexity < 0.05)
    )
      predictedCategory = "ICON";
    else if (vitals.structuralComplexity > 0.08 && vitals.textureScore < 0.5)
      predictedCategory = "UI";
    else if (vitals.colorEntropy < 6.5 && vitals.textureScore < 1.0)
      predictedCategory = "GRAPHIC";

    function logAnalysis() {
      console.group("---[ PHÂN TÍCH ẢNH V19.0 (25 Vùng) ]---");
      console.log("Dữ liệu thô:", {
        flatnessRatio: vitals.flatnessRatio.toFixed(2),
        structuralComplexity: vitals.structuralComplexity.toFixed(3),
        textureScore: vitals.textureScore.toFixed(2),
        colorEntropy: vitals.colorEntropy.toFixed(2),
      });
      console.log(
        "%cGiải thích các chỉ số:",
        "color: #007bff; font-weight: bold;"
      );
      console.log(
        `- Tỷ lệ Phẳng: ${vitals.flatnessRatio.toFixed(
          2
        )} (Càng cao -> càng giống ICON/UI)`
      );
      console.log(
        `- Phức tạp Cấu trúc: ${vitals.structuralComplexity.toFixed(
          3
        )} (Càng cao -> càng nhiều nét, chữ, hình khối)`
      );
      console.log(
        `- Điểm Texture: ${vitals.textureScore.toFixed(
          2
        )} (Càng cao -> càng giống ảnh chụp, nhiều nhiễu)`
      );
      console.log(
        `- Hỗn loạn Màu: ${vitals.colorEntropy.toFixed(
          2
        )} (Thấp < 6.5 -> giống anime/art)`
      );
      if (isAlreadyCompressed)
        console.log(
          "%cPhát hiện Artifacts: Có thể ảnh đã bị nén. Sẽ nén nhẹ tay hơn.",
          "color: orange; font-weight: bold;"
        );
      console.log(
        `=> Dự đoán loại ảnh (chỉ để tham khảo): %c${predictedCategory}`,
        "background: #6f42c1; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;"
      );
      console.groupEnd();
    }
    logAnalysis();

    // BƯỚC 3: XÁC ĐỊNH PHIÊN BẢN (Sửa lỗi ảnh dọc)
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;
    let profilesToGenerate = [];
    if (Math.max(originalWidth, originalHeight) > profiles.s.maxDimension) {
      profilesToGenerate = [profiles.m, profiles.s];
    } else {
      profilesToGenerate = [profiles.s];
    }
    profilesToGenerate.sort((a, b) => b.maxDimension - a.maxDimension);

    self.postMessage({
      status: "progress",
      percent: 40,
      message: `Chuẩn bị tạo ${profilesToGenerate.length} phiên bản...`,
    });

    // BƯỚC 4: RESIZE
    const resizedCanvases = {};
    let lastSource = imageBitmap;
    for (const profile of profilesToGenerate) {
      // ... (logic resize không đổi)
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

    // BƯỚC 5: NÉN SONG SONG
    self.postMessage({
      status: "progress",
      percent: 60,
      message: `Đang nén song song ${profilesToGenerate.length} phiên bản...`,
    });
    const compressionPromises = profilesToGenerate.map(async (profile) => {
      const canvas = resizedCanvases[profile.name];
      const ctx = canvas.getContext("2d");

      const finalTargetBytes =
        calculateDynamicTarget(profile, vitals, isAlreadyCompressed) * 1024;

      const inputType = file.type.toLowerCase();
      const isPhotoType =
        inputType.includes("jpeg") ||
        inputType.includes("heic") ||
        inputType.includes("jpg");

      if (vitals.textureScore > 0.8 && isPhotoType) {
        ctx.filter = "blur(0.3px)";
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";
      }
      if (vitals.flatnessRatio < 0.8) {
        let contrast = 1.03,
          saturate = 1.03;
        if (profile.name === "s") {
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

    // BƯỚC 6: GỬI KẾT QUẢ
    const previewResult = results.find((r) => r.name === "m") || results[0];
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
