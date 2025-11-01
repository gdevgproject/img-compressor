// compress.worker.js V23.0 - INTELLIGENCE SYSTEM
// Mục tiêu: Phân tích như mắt người, nén tối đa, enhancement thông minh

function getPixelData(ctx, x, y, w, h) {
  try {
    return ctx.getImageData(x, y, w, h);
  } catch (e) {
    return null;
  }
}

// === PHÂN TÍCH ẢNH V23.0 - TRÍ TUỆ NHÂN TẠO ===
async function analyzeImage(file, imageBitmap) {
  console.group("🧠 [V23.0] Analysis Intelligence");
  self.postMessage({
    status: "progress",
    percent: 15,
    message: "Phân tích thông minh...",
  });

  const m = {
    // Basic
    fileName: file.name.toLowerCase(),
    mimeType: file.type,
    fileSize: file.size,
    width: imageBitmap.width,
    height: imageBitmap.height,
    aspectRatio: imageBitmap.width / imageBitmap.height,
    megapixels: (imageBitmap.width * imageBitmap.height) / 1000000,

    // Color Analysis (8 metrics)
    uniqueColorCount: 0,
    colorEntropy: 0,
    saturationMean: 0,
    saturationStdDev: 0,
    brightnessRange: 0,
    dominantColorRatio: 0,
    hueDiversity: 0,
    histogramPeakiness: 0,

    // Texture & Pattern (5 metrics)
    textureScore: 0,
    textureCoherence: 0,
    noiseLevel: 0,
    localVariation: 0,
    microDetailDensity: 0,

    // Edge Analysis (6 metrics)
    edgeDensity: 0,
    edgeSharpness: 0,
    edgeUniformity: 0,
    edgeDirectionality: 0,
    cornerCount: 0,

    // Geometry & Structure (5 metrics)
    patternRepetition: 0,
    geometricRegularity: 0,
    blockiness: 0,
    gridScore: 0,
    symmetryScore: 0,

    // Natural vs Artificial (3 metrics)
    naturalness: 0,
    organicScore: 0,
    artificialEdgeRatio: 0,

    // Spatial (4 metrics)
    flatnessRatio: 0,
    regionConsistency: 0,
    centerWeightScore: 0,
    colorBlockRatio: 0,
    gradientSmoothness: 0,

    // Final
    category: "UNKNOWN",
    confidence: 0,
    reason: "",
    subType: "",
  };

  // === VÒNG 1: SIÊU NHANH ===
  if (m.mimeType === "image/svg+xml") {
    return finalize(m, "VECTOR", 100, "SVG file", "VECTOR");
  }
  if (m.fileName.includes("screenshot") || m.fileName.includes("screen")) {
    return finalize(m, "SCREENSHOT", 95, "Filename", "SCREENSHOT");
  }
  if (m.width <= 128 && m.height <= 128 && m.fileSize < 50000) {
    return finalize(m, "ICON", 95, "Small size", "ICON_SMALL");
  }

  // === VÒNG 2: THU THẬP DỮ LIỆU TOÀN DIỆN ===
  self.postMessage({
    status: "progress",
    percent: 25,
    message: "Thu thập metrics...",
  });

  const canvas = new OffscreenCanvas(m.width, m.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imageBitmap, 0, 0);

  // Sampling: 9x9 grid = 81 regions
  const gridSize = 9;
  const regionW = Math.floor(m.width / gridSize);
  const regionH = Math.floor(m.height / gridSize);
  const sampleSize = Math.max(
    20,
    Math.min(80, Math.floor(Math.min(regionW, regionH) * 0.75))
  );

  let regions = [];
  let globalColors = new Map();
  let globalHues = [];
  let allEdges = [];
  let allGradients = [];
  let allSaturations = [];
  let allBrightnesses = [];
  let flatRegions = 0;
  let minBright = 255,
    maxBright = 0;
  let horizontalEdges = 0,
    verticalEdges = 0,
    diagonalEdges = 0;
  let sharpEdgeCount = 0,
    smoothEdgeCount = 0;
  let blockColorRegions = 0;
  let cornerPoints = [];

  for (let i = 0; i < gridSize * gridSize; i++) {
    const rx = (i % gridSize) * regionW;
    const ry = Math.floor(i / gridSize) * regionH;
    const imgData = getPixelData(ctx, rx, ry, sampleSize, sampleSize);
    if (!imgData) continue;

    const data = imgData.data;
    const region = {
      colors: new Map(),
      saturations: [],
      brightnesses: [],
      hues: [],
      edges: [],
      edgeDirs: [],
      gradients: [],
      histogram: new Array(256).fill(0),
      localColors: new Set(),
      corners: 0,
      meanColor: [0, 0, 0],
    };

    let rSum = 0,
      gSum = 0,
      bSum = 0;

    // === Phân tích từng pixel ===
    for (let j = 0; j < data.length; j += 4) {
      const r = data[j],
        g = data[j + 1],
        b = data[j + 2];
      rSum += r;
      gSum += g;
      bSum += b;

      const gray = Math.floor(r * 0.299 + g * 0.587 + b * 0.114);
      region.brightnesses.push(gray);
      region.histogram[gray]++;
      allBrightnesses.push(gray);
      minBright = Math.min(minBright, gray);
      maxBright = Math.max(maxBright, gray);

      const colorKey = `${Math.floor(r / 8)},${Math.floor(g / 8)},${Math.floor(
        b / 8
      )}`;
      region.colors.set(colorKey, (region.colors.get(colorKey) || 0) + 1);
      globalColors.set(colorKey, (globalColors.get(colorKey) || 0) + 1);

      const localKey = `${Math.floor(r / 16)},${Math.floor(
        g / 16
      )},${Math.floor(b / 16)}`;
      region.localColors.add(localKey);

      // HSV
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const s = max === 0 ? 0 : (max - min) / max;
      let h = 0;
      if (max !== min) {
        if (max === r) h = ((g - b) / (max - min) + 6) % 6;
        else if (max === g) h = (b - r) / (max - min) + 2;
        else h = (r - g) / (max - min) + 4;
        h *= 60;
      }

      region.saturations.push(s * 100);
      region.hues.push(h);
      allSaturations.push(s * 100);
      globalHues.push(h);
    }

    region.meanColor = [
      rSum / (sampleSize * sampleSize),
      gSum / (sampleSize * sampleSize),
      bSum / (sampleSize * sampleSize),
    ];

    // === Edge Detection (Sobel + Direction) ===
    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = (y * sampleSize + x) * 4;
        const getG = (off) => {
          const i = idx + off;
          if (i < 0 || i >= data.length) return 0;
          return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        };

        const gx =
          -getG(-sampleSize * 4 - 4) +
          getG(-sampleSize * 4 + 4) -
          2 * getG(-4) +
          2 * getG(4) -
          getG(sampleSize * 4 - 4) +
          getG(sampleSize * 4 + 4);
        const gy =
          -getG(-sampleSize * 4 - 4) -
          2 * getG(-sampleSize * 4) -
          getG(-sampleSize * 4 + 4) +
          getG(sampleSize * 4 - 4) +
          2 * getG(sampleSize * 4) +
          getG(sampleSize * 4 + 4);

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        region.edges.push(magnitude);
        allEdges.push(magnitude);

        if (magnitude > 30) {
          const angle = (Math.atan2(gy, gx) * 180) / Math.PI;
          const absAngle = Math.abs(angle);

          if (absAngle < 22.5 || absAngle > 157.5) horizontalEdges++;
          else if (absAngle > 67.5 && absAngle < 112.5) verticalEdges++;
          else diagonalEdges++;

          region.edgeDirs.push(angle);

          if (magnitude > 80) sharpEdgeCount++;
          else if (magnitude < 50) smoothEdgeCount++;
        }

        if (Math.abs(gx) > 50 && Math.abs(gy) > 50) {
          region.corners++;
          cornerPoints.push([rx + x, ry + y]);
        }
      }
    }

    // === Gradient Analysis ===
    for (let j = 4; j < data.length; j += 4) {
      const curr = (data[j] + data[j + 1] + data[j + 2]) / 3;
      const prev = (data[j - 4] + data[j - 3] + data[j - 2]) / 3;
      const diff = Math.abs(curr - prev);
      region.gradients.push(diff);
      allGradients.push(diff);
    }

    // === Region Statistics ===
    const meanBr =
      region.brightnesses.reduce((a, b) => a + b, 0) /
      region.brightnesses.length;
    const variance =
      region.brightnesses.reduce((s, b) => s + Math.pow(b - meanBr, 2), 0) /
      region.brightnesses.length;
    const stdDev = Math.sqrt(variance);

    let entropy = 0;
    for (const count of region.histogram) {
      if (count > 0) {
        const p = count / (sampleSize * sampleSize);
        entropy -= p * Math.log2(p);
      }
    }

    if (stdDev < 8 && entropy < 3.0 && region.localColors.size < 8) {
      flatRegions++;
    }

    if (region.localColors.size <= 5 && stdDev < 15) {
      blockColorRegions++;
    }

    regions.push({
      stdDev,
      entropy,
      colorCount: region.colors.size,
      localColorCount: region.localColors.size,
      edgeMean:
        region.edges.length > 0
          ? region.edges.reduce((a, b) => a + b, 0) / region.edges.length
          : 0,
      edgeMax: region.edges.length > 0 ? Math.max(...region.edges) : 0,
      gradMean:
        region.gradients.reduce((a, b) => a + b, 0) / region.gradients.length,
      satMean:
        region.saturations.reduce((a, b) => a + b, 0) /
        region.saturations.length,
      corners: region.corners,
      meanColor: region.meanColor,
    });
  }

  // === TÍNH TOÁN METRICS TOÀN CỤC ===

  // Color
  m.uniqueColorCount = globalColors.size;
  const sortedColors = Array.from(globalColors.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  m.dominantColorRatio = sortedColors[0]
    ? sortedColors[0][1] / (m.width * m.height)
    : 0;

  m.colorEntropy = regions.reduce((s, r) => s + r.entropy, 0) / regions.length;
  m.saturationMean =
    allSaturations.reduce((a, b) => a + b, 0) / allSaturations.length;
  const satVar =
    allSaturations.reduce((s, v) => s + Math.pow(v - m.saturationMean, 2), 0) /
    allSaturations.length;
  m.saturationStdDev = Math.sqrt(satVar);
  m.brightnessRange = maxBright - minBright;

  const hueBins = new Array(12).fill(0);
  globalHues.forEach((h) => hueBins[Math.floor(h / 30)]++);
  const nonZeroBins = hueBins.filter((b) => b > 0).length;
  m.hueDiversity = nonZeroBins / 12;

  const colorCounts = Array.from(globalColors.values());
  colorCounts.sort((a, b) => b - a);
  const top5 = colorCounts.slice(0, 5).reduce((a, b) => a + b, 0);
  m.histogramPeakiness = top5 / (m.width * m.height);

  // Texture & Edge
  const avgEdge = allEdges.reduce((a, b) => a + b, 0) / allEdges.length;
  const strongEdges = allEdges.filter((e) => e > 40).length;
  m.edgeDensity = strongEdges / allEdges.length;
  m.textureScore = avgEdge / 255;

  const edgeVar =
    allEdges.reduce((s, e) => s + Math.pow(e - avgEdge, 2), 0) /
    allEdges.length;
  m.edgeUniformity = 1 - Math.sqrt(edgeVar) / 255;

  m.edgeSharpness = sharpEdgeCount / (sharpEdgeCount + smoothEdgeCount + 1);
  const totalDirectionalEdges = horizontalEdges + verticalEdges + diagonalEdges;
  m.edgeDirectionality =
    totalDirectionalEdges > 0
      ? (horizontalEdges + verticalEdges) / totalDirectionalEdges
      : 0;

  m.cornerCount = cornerPoints.length / ((m.width * m.height) / 10000);

  const regionTextures = regions.map((r) => r.edgeMean);
  const textureMean =
    regionTextures.reduce((a, b) => a + b, 0) / regionTextures.length;
  const textureStd = Math.sqrt(
    regionTextures.reduce((s, t) => s + Math.pow(t - textureMean, 2), 0) /
      regionTextures.length
  );
  m.textureCoherence = textureMean / (textureStd + 1);

  const microDetails = allGradients.filter((g) => g > 0 && g < 10).length;
  m.microDetailDensity = microDetails / allGradients.length;

  m.noiseLevel =
    allGradients.filter((g) => g < 5 && g > 0).length / allGradients.length;

  // Pattern & Geometry
  const regionEntropies = regions.map((r) => r.entropy);
  const avgEnt =
    regionEntropies.reduce((a, b) => a + b, 0) / regionEntropies.length;
  const entVar =
    regionEntropies.reduce((s, e) => s + Math.pow(e - avgEnt, 2), 0) /
    regionEntropies.length;
  m.patternRepetition = 1 / (1 + Math.sqrt(entVar));

  m.geometricRegularity =
    m.edgeDensity * m.edgeUniformity * m.edgeDirectionality;

  m.blockiness = blockColorRegions / regions.length;

  let gridness = 0;
  for (let y = 0; y < gridSize - 1; y++) {
    for (let x = 0; x < gridSize - 1; x++) {
      const idx = y * gridSize + x;
      if (regions[idx] && regions[idx + 1]) {
        const colorDiff = Math.abs(
          regions[idx].localColorCount - regions[idx + 1].localColorCount
        );
        if (colorDiff > 10) gridness++;
      }
    }
  }
  m.gridScore = gridness / (gridSize * gridSize);

  let symmetryScore = 0;
  const midX = Math.floor(gridSize / 2);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < midX; x++) {
      const leftIdx = y * gridSize + x;
      const rightIdx = y * gridSize + (gridSize - 1 - x);
      if (regions[leftIdx] && regions[rightIdx]) {
        const colorDiff = Math.abs(
          regions[leftIdx].colorCount - regions[rightIdx].colorCount
        );
        if (colorDiff < 5) symmetryScore++;
      }
    }
  }
  m.symmetryScore = symmetryScore / (gridSize * midX);

  // Natural vs Artificial
  const localVars = regions.map((r) => r.stdDev);
  const avgLocalVar = localVars.reduce((a, b) => a + b, 0) / localVars.length;
  m.localVariation = avgLocalVar / 255;

  m.naturalness =
    m.localVariation * 0.3 +
    m.noiseLevel * 0.25 +
    (1 - m.patternRepetition) * 0.25 +
    (1 - m.edgeDirectionality) * 0.2;

  m.organicScore = 1 - m.edgeDirectionality;

  m.artificialEdgeRatio = m.edgeSharpness * m.edgeDirectionality;

  // Spatial
  const avgGrad = allGradients.reduce((a, b) => a + b, 0) / allGradients.length;
  const gradStd = Math.sqrt(
    allGradients.reduce((s, g) => s + Math.pow(g - avgGrad, 2), 0) /
      allGradients.length
  );
  m.gradientSmoothness = avgGrad / (gradStd + 1);

  m.flatnessRatio = flatRegions / regions.length;

  const colorChanges = regions.reduce((sum, r, i) => {
    if (i === 0) return 0;
    return sum + Math.abs(r.colorCount - regions[i - 1].colorCount);
  }, 0);
  m.regionConsistency = 1 - colorChanges / (regions.length * 50);

  m.colorBlockRatio = m.blockiness;

  const centerRegions = [];
  const centerStart = Math.floor(gridSize / 3),
    centerEnd = Math.ceil((gridSize * 2) / 3);
  for (let y = centerStart; y < centerEnd; y++) {
    for (let x = centerStart; x < centerEnd; x++) {
      centerRegions.push(regions[y * gridSize + x]);
    }
  }
  const centerComplexity =
    centerRegions.reduce((s, r) => s + r.edgeMean, 0) / centerRegions.length;
  const overallComplexity =
    regions.reduce((s, r) => s + r.edgeMean, 0) / regions.length;
  m.centerWeightScore = centerComplexity / (overallComplexity + 1);

  console.table({
    Màu: m.uniqueColorCount,
    "Chủ đạo": (m.dominantColorRatio * 100).toFixed(1) + "%",
    Entropy: m.colorEntropy.toFixed(2),
    Sat: `${m.saturationMean.toFixed(0)}±${m.saturationStdDev.toFixed(0)}`,
    "Edge dens": m.edgeDensity.toFixed(3),
    "Edge sharp": m.edgeSharpness.toFixed(3),
    "Edge H/V": m.edgeDirectionality.toFixed(3),
    Texture: m.textureScore.toFixed(3),
    "Tex coh": m.textureCoherence.toFixed(2),
    Blockiness: m.blockiness.toFixed(3),
    Grid: m.gridScore.toFixed(3),
    Natural: m.naturalness.toFixed(3),
    Organic: m.organicScore.toFixed(3),
    "Artif edge": m.artificialEdgeRatio.toFixed(3),
    "Hist peaks": m.histogramPeakiness.toFixed(3),
  });

  // === VÒNG 3: HỆ THỐNG PHÂN LOẠI 4 TẦNG ===

  let eliminated = absoluteElimination(m);
  if (eliminated) return eliminated;

  eliminated = crossValidationElimination(m);
  if (eliminated) return eliminated;

  const scores = calculateScores(m);
  console.log("📊 Scores:", scores);

  return finalDecision(m, scores);
}

// === TẦNG 1: ABSOLUTE ELIMINATION ===
function absoluteElimination(m) {
  if (
    m.uniqueColorCount <= 10 &&
    m.flatnessRatio > 0.65 &&
    m.megapixels < 0.1
  ) {
    return finalize(
      m,
      "ICON",
      99,
      `${m.uniqueColorCount} màu + phẳng + nhỏ`,
      "ICON_FLAT"
    );
  }

  if (
    m.uniqueColorCount <= 32 &&
    m.edgeDensity > 0.012 &&
    m.textureScore < 0.1 &&
    m.saturationMean < 8 &&
    m.edgeSharpness > 0.6
  ) {
    return finalize(
      m,
      "LINE_ART",
      98,
      "Đơn sắc + edge sắc + không texture",
      "LINE_ART_PURE"
    );
  }

  if (
    m.blockiness > 0.65 &&
    m.histogramPeakiness > 0.4 &&
    m.artificialEdgeRatio > 0.35 &&
    m.uniqueColorCount < 200
  ) {
    return finalize(
      m,
      "UI",
      97,
      "Block màu + edges nhân tạo + ít màu",
      "UI_BLOCKS"
    );
  }

  if (
    m.gridScore > 0.25 &&
    m.edgeDirectionality > 0.7 &&
    m.geometricRegularity > 0.2
  ) {
    return finalize(m, "UI", 96, "Grid pattern + edges H/V", "UI_GRID");
  }

  return null;
}

// === TẦNG 2: CROSS-VALIDATION ELIMINATION ===
function crossValidationElimination(m) {
  if (
    m.naturalness > 0.4 &&
    m.textureScore > 0.2 &&
    m.organicScore > 0.5 &&
    m.edgeDirectionality < 0.45 &&
    m.artificialEdgeRatio < 0.25 &&
    m.uniqueColorCount > 300
  ) {
    return finalize(
      m,
      "PHOTO",
      96,
      "Natural + organic + texture random",
      "PHOTO_NATURAL"
    );
  }

  if (
    m.naturalness > 0.35 &&
    m.textureScore > 0.25 &&
    m.textureCoherence < 5 &&
    m.organicScore > 0.55 &&
    m.blockiness < 0.3 &&
    m.gridScore < 0.15
  ) {
    return finalize(
      m,
      "PHOTO",
      95,
      "Natural texture + organic + no blocks",
      "PHOTO_LOWCOLOR"
    );
  }

  if (
    m.artificialEdgeRatio > 0.4 &&
    m.blockiness > 0.5 &&
    m.edgeSharpness > 0.55 &&
    m.naturalness < 0.25
  ) {
    return finalize(
      m,
      "UI",
      95,
      "Artificial edges + blocks + sharp",
      "UI_STRUCTURED"
    );
  }

  if (
    m.uniqueColorCount < 50 &&
    m.flatnessRatio > 0.55 &&
    m.dominantColorRatio > 0.25 &&
    m.edgeSharpness > 0.5
  ) {
    return finalize(m, "LOGO", 94, "Ít màu + phẳng + edge sắc", "LOGO_SIMPLE");
  }

  return null;
}

// === TẦNG 3: SCORING ===
function calculateScores(m) {
  const s = {};

  // PHOTO
  s.PHOTO = { total: 0, f: [], r: "" };
  s.PHOTO.total += m.naturalness * 120;
  s.PHOTO.f.push(`Nat:${(m.naturalness * 120).toFixed(0)}`);

  if (m.uniqueColorCount > 1500) s.PHOTO.total += 35;
  else if (m.uniqueColorCount > 800) s.PHOTO.total += 25;
  else if (m.uniqueColorCount > 400) s.PHOTO.total += 15;
  s.PHOTO.f.push(`Col:${m.uniqueColorCount > 400 ? 15 : 0}`);

  if (m.textureScore > 0.25) s.PHOTO.total += 25;
  else if (m.textureScore > 0.15) s.PHOTO.total += 15;
  s.PHOTO.f.push(`Tex:${m.textureScore > 0.15 ? 15 : 0}`);

  if (m.organicScore > 0.5) s.PHOTO.total += 20;
  s.PHOTO.f.push(`Org:${m.organicScore > 0.5 ? 20 : 0}`);

  if (m.saturationStdDev > 15) s.PHOTO.total += 15;
  s.PHOTO.f.push(`SatVar:${m.saturationStdDev > 15 ? 15 : 0}`);

  if (m.hueDiversity > 0.4) s.PHOTO.total += 15;
  s.PHOTO.f.push(`HueDiv:${m.hueDiversity > 0.4 ? 15 : 0}`);

  if (m.noiseLevel > 0.25) s.PHOTO.total += 12;
  s.PHOTO.f.push(`Noise:${m.noiseLevel > 0.25 ? 12 : 0}`);

  if (m.centerWeightScore > 1.15) s.PHOTO.total += 10;
  s.PHOTO.f.push(`Center:${m.centerWeightScore > 1.15 ? 10 : 0}`);

  if (m.blockiness > 0.5) s.PHOTO.total -= 40;
  s.PHOTO.f.push(`Block:${m.blockiness > 0.5 ? -40 : 0}`);

  if (m.artificialEdgeRatio > 0.4) s.PHOTO.total -= 35;
  s.PHOTO.f.push(`ArtEdge:${m.artificialEdgeRatio > 0.4 ? -35 : 0}`);

  if (m.gridScore > 0.2) s.PHOTO.total -= 30;
  s.PHOTO.f.push(`Grid:${m.gridScore > 0.2 ? -30 : 0}`);

  s.PHOTO.r = s.PHOTO.f.join(", ");

  // LINE_ART
  s.LINE_ART = { total: 0, f: [], r: "" };
  if (m.uniqueColorCount < 50) s.LINE_ART.total += 45;
  else if (m.uniqueColorCount < 100) s.LINE_ART.total += 25;
  s.LINE_ART.f.push(`Col:${m.uniqueColorCount < 100 ? 25 : 0}`);

  if (m.edgeDensity > 0.01) s.LINE_ART.total += 35;
  s.LINE_ART.f.push(`Edge:${m.edgeDensity > 0.01 ? 35 : 0}`);

  if (m.textureScore < 0.12) s.LINE_ART.total += 30;
  s.LINE_ART.f.push(`NoTex:${m.textureScore < 0.12 ? 30 : 0}`);

  if (m.saturationMean < 12) s.LINE_ART.total += 25;
  s.LINE_ART.f.push(`LowSat:${m.saturationMean < 12 ? 25 : 0}`);

  if (m.edgeSharpness > 0.6) s.LINE_ART.total += 20;
  s.LINE_ART.f.push(`Sharp:${m.edgeSharpness > 0.6 ? 20 : 0}`);

  s.LINE_ART.r = s.LINE_ART.f.join(", ");

  // LOGO
  s.LOGO = { total: 0, f: [], r: "" };
  if (m.uniqueColorCount < 150)
    s.LOGO.total += Math.max(0, 60 - m.uniqueColorCount / 2.5);
  s.LOGO.f.push(`Col:${Math.max(0, 60 - m.uniqueColorCount / 2.5).toFixed(0)}`);

  if (m.flatnessRatio > 0.5) s.LOGO.total += m.flatnessRatio * 35;
  s.LOGO.f.push(`Flat:${(m.flatnessRatio * 35).toFixed(0)}`);

  if (m.edgeDensity > 0.005 && m.edgeDensity < 0.08) s.LOGO.total += 25;
  s.LOGO.f.push(
    `Edge:${m.edgeDensity > 0.005 && m.edgeDensity < 0.08 ? 25 : 0}`
  );

  if (m.dominantColorRatio > 0.3) s.LOGO.total += 20;
  s.LOGO.f.push(`Dom:${m.dominantColorRatio > 0.3 ? 20 : 0}`);

  if (m.symmetryScore > 0.6) s.LOGO.total += 15;
  s.LOGO.f.push(`Sym:${m.symmetryScore > 0.6 ? 15 : 0}`);

  if (m.textureScore > 0.2) s.LOGO.total -= 30; // Phạt nếu có texture
  s.LOGO.f.push(`TexPen:${m.textureScore > 0.2 ? -30 : 0}`);

  s.LOGO.r = s.LOGO.f.join(", ");

  // UI
  s.UI = { total: 0, f: [], r: "" };
  if (m.artificialEdgeRatio > 0.15) s.UI.total += m.artificialEdgeRatio * 100;
  s.UI.f.push(`ArtEdge:${(m.artificialEdgeRatio * 100).toFixed(0)}`);

  if (m.blockiness > 0.3) s.UI.total += m.blockiness * 50;
  s.UI.f.push(`Block:${(m.blockiness * 50).toFixed(0)}`);

  if (m.edgeSharpness > 0.5) s.UI.total += 25;
  s.UI.f.push(`Sharp:${m.edgeSharpness > 0.5 ? 25 : 0}`);

  if (m.gridScore > 0.1) s.UI.total += m.gridScore * 80;
  s.UI.f.push(`Grid:${(m.gridScore * 80).toFixed(0)}`);

  if (m.textureScore < 0.18) s.UI.total += 20;
  s.UI.f.push(`NoTex:${m.textureScore < 0.18 ? 20 : 0}`);

  if (m.histogramPeakiness > 0.3) s.UI.total += 15;
  s.UI.f.push(`Peaks:${m.histogramPeakiness > 0.3 ? 15 : 0}`);

  // Phạt nặng nếu có tính tự nhiên (quan trọng nhất)
  if (m.naturalness > 0.35) s.UI.total -= 50;
  s.UI.f.push(`NatPen:${m.naturalness > 0.35 ? -50 : 0}`);

  s.UI.r = s.UI.f.join(", ");

  // SCREENSHOT (kế thừa từ UI)
  s.SCREENSHOT = { total: s.UI.total * 0.85, f: [...s.UI.f], r: "Based on UI" };
  if (m.aspectRatio > 1.5 || m.aspectRatio < 0.6) s.SCREENSHOT.total += 15;
  s.SCREENSHOT.f.push(
    `Aspect:${m.aspectRatio > 1.5 || m.aspectRatio < 0.6 ? 15 : 0}`
  );
  s.SCREENSHOT.r = s.SCREENSHOT.f.join(", ");

  // GRAPHIC
  s.GRAPHIC = { total: 0, f: [], r: "" };
  if (m.uniqueColorCount > 50 && m.uniqueColorCount < 1000)
    s.GRAPHIC.total += 35;
  s.GRAPHIC.f.push(
    `MidCol:${m.uniqueColorCount > 50 && m.uniqueColorCount < 1000 ? 35 : 0}`
  );

  if (m.textureScore < 0.22) s.GRAPHIC.total += 30;
  s.GRAPHIC.f.push(`LowTex:${m.textureScore < 0.22 ? 30 : 0}`);

  if (m.saturationMean > 20 && m.saturationStdDev < 25) s.GRAPHIC.total += 25; // Màu sắc đơn giản, không quá đa dạng
  s.GRAPHIC.f.push(
    `SimpSat:${m.saturationMean > 20 && m.saturationStdDev < 25 ? 25 : 0}`
  );

  if (m.gradientSmoothness > 0.5) s.GRAPHIC.total += 15; // Có các vùng chuyển màu mượt
  s.GRAPHIC.f.push(`SmoothGrad:${m.gradientSmoothness > 0.5 ? 15 : 0}`);

  if (m.naturalness > 0.4) s.GRAPHIC.total -= 30; // Phạt nếu quá natural
  s.GRAPHIC.f.push(`NatPen:${m.naturalness > 0.4 ? -30 : 0}`);

  s.GRAPHIC.r = s.GRAPHIC.f.join(", ");

  return s;
}

// === TẦNG 4: FINAL DECISION & SUBTYPE DETECTION ===
function finalDecision(m, scores) {
  const winner = Object.entries(scores).sort(
    (a, b) => b[1].total - a[1].total
  )[0];
  const [category, scoreData] = winner;
  const confidence = Math.min(93, Math.max(40, scoreData.total / 2)); // Normalize score to confidence

  let subType = category;

  // Subtype logic
  if (category === "PHOTO") {
    if (m.naturalness > 0.4 && m.organicScore > 0.5) subType = "PHOTO_NATURAL";
    else if (m.centerWeightScore > 1.2 && m.uniqueColorCount > 1000)
      subType = "PHOTO_PORTRAIT";
    else if (m.uniqueColorCount < 800) subType = "PHOTO_LOWCOLOR";
    else subType = "PHOTO_GENERAL";
  } else if (category === "UI") {
    if (m.blockiness > 0.6) subType = "UI_BLOCKS";
    else if (m.gridScore > 0.2) subType = "UI_GRID";
    else subType = "UI_GENERAL";
  } else if (category === "LOGO") {
    if (m.uniqueColorCount < 50) subType = "LOGO_SIMPLE";
    else subType = "LOGO_COMPLEX";
  } else if (category === "LINE_ART") {
    subType = "LINE_ART_PURE";
  }

  return finalize(m, category, confidence, scoreData.r, subType);
}

// === FINALIZE & CONSOLE LOG ===
function finalize(m, category, confidence, reason, subType) {
  m.category = category;
  m.confidence = confidence;
  m.reason = reason;
  m.subType = subType;

  console.log(
    `%c✅ ${subType} (${confidence.toFixed(0)}%)`,
    "background: #28a745; color: white; padding: 3px 10px; font-weight: bold;",
    `Reason: ${reason}`
  );
  console.groupEnd();
  return m;
}

// === NÉN THÔNG MINH TỐI ĐA V23.0 ===
function determineCompressionStrategy(profile, m) {
  const limits = {
    m: { min: 4, max: 40 },
    s: { min: 2, max: 18 },
  };
  const limit = limits[profile.name];
  let targetKB = limit.min * 0.8; // Bắt đầu thấp

  switch (m.subType) {
    case "PHOTO_NATURAL":
      targetKB +=
        m.textureScore * 90 +
        (m.uniqueColorCount / 1000) * 18 +
        m.naturalness * 45 +
        m.microDetailDensity * 50;
      break;
    case "PHOTO_PORTRAIT":
      targetKB +=
        m.textureScore * 80 +
        (m.uniqueColorCount / 1000) * 20 +
        m.gradientSmoothness * 60; // Ưu tiên da mịn
      break;
    case "PHOTO_LOWCOLOR":
      targetKB +=
        m.textureScore * 60 +
        (m.uniqueColorCount / 1000) * 12 +
        m.naturalness * 40;
      break;
    case "PHOTO_GENERAL":
      targetKB +=
        m.textureScore * 75 +
        (m.uniqueColorCount / 1000) * 15 +
        m.naturalness * 40;
      break;
    case "LINE_ART_PURE":
      targetKB = limit.min * 0.7 + m.edgeDensity * 120 + m.cornerCount * 8;
      break;
    case "LOGO_SIMPLE":
      targetKB = limit.min * 0.6 + m.edgeSharpness * 15 + m.uniqueColorCount;
      break;
    case "LOGO_COMPLEX":
      targetKB =
        limit.min * 0.8 + m.edgeSharpness * 30 + m.uniqueColorCount / 10;
      break;
    case "UI_BLOCKS":
      targetKB = limit.min * 1.15 * 0.9 + m.edgeDensity * 100;
      break;
    case "UI_GRID":
    case "UI_GENERAL":
    case "SCREENSHOT":
      targetKB =
        limit.min * 1.2 + m.edgeDensity * 110 + (m.uniqueColorCount / 100) * 5;
      break;
    case "GRAPHIC":
      targetKB =
        limit.min * 1.0 + (m.uniqueColorCount / 150) * 8 + m.textureScore * 40;
      break;
    case "ICON_FLAT":
    case "ICON_SMALL":
      targetKB = limit.min * 0.7;
      break;
    default:
      targetKB = limit.min * 1.5;
  }

  // Điều chỉnh cuối cùng
  targetKB *= 1 + m.megapixels / 10; // Tăng nhẹ cho ảnh lớn

  // Clamp
  targetKB = Math.max(limit.min * 0.5, Math.min(targetKB, limit.max));

  console.log(
    `[${profile.name}] ${m.subType} → ${targetKB.toFixed(1)}KB (range: ${
      limit.min
    }-${limit.max}KB)`
  );
  return targetKB * 1024;
}

// === CÔNG CỤ NÉN V23.0 ===
async function compressAndEncode(canvas, targetBytes, subType) {
  let low = 0,
    high = 1,
    bestBlob = null,
    bestQ = 0;

  const isHighPrecision =
    subType.includes("LOGO") || subType.includes("LINE_ART");
  const iterations = isHighPrecision ? 15 : 12;
  const tolerance = isHighPrecision ? 0.03 : 0.05;

  for (let i = 0; i < iterations; i++) {
    const q = (low + high) / 2;
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: q });

    if (blob.size > targetBytes) {
      high = q;
    } else {
      bestBlob = blob;
      bestQ = q;
      low = q;
    }

    if (Math.abs(blob.size - targetBytes) < targetBytes * tolerance) break;
  }

  if (!bestBlob) {
    bestBlob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.05,
    });
    bestQ = 0.05;
  }

  return { blob: bestBlob, quality: bestQ };
}

// === BỘ ĐIỀU KHIỂN CHÍNH V23.0 ===
self.onmessage = async function (event) {
  const { file } = event.data;
  try {
    const profiles = {
      m: { name: "m", maxDimension: 864 },
      s: { name: "s", maxDimension: 420 },
    };

    self.postMessage({
      status: "progress",
      percent: 10,
      message: "Đọc ảnh...",
    });
    const imageBitmap = await createImageBitmap(file);

    const m = await analyzeImage(file, imageBitmap);

    if (m.category === "VECTOR") {
      self.postMessage({ status: "complete", allProfiles: [], analysis: m });
      return;
    }

    self.postMessage({
      status: "progress",
      percent: 45,
      message: "Quyết định chiến lược...",
    });

    const profilesToGen =
      m.width > profiles.s.maxDimension
        ? [profiles.m, profiles.s]
        : [profiles.s];

    // Resize
    const resizedCanvases = {};
    let lastSource = imageBitmap;
    for (const profile of profilesToGen) {
      const sw = lastSource.width,
        sh = lastSource.height;
      let nw = sw,
        nh = sh;
      if (sw > profile.maxDimension) {
        nw = profile.maxDimension;
        nh = Math.round((sh * nw) / sw);
      }
      const canvas = new OffscreenCanvas(nw, nh);
      const ctx = canvas.getContext("2d", { imageSmoothingQuality: "high" });
      ctx.drawImage(lastSource, 0, 0, nw, nh);
      resizedCanvases[profile.name] = canvas;
      lastSource = canvas;
    }

    self.postMessage({
      status: "progress",
      percent: 60,
      message: "Nén & Tăng cường thị giác...",
    });

    const compressionPromises = profilesToGen.map(async (profile) => {
      const canvas = resizedCanvases[profile.name];
      const ctx = canvas.getContext("2d");

      const targetBytes = determineCompressionStrategy(profile, m);

      // Visual Enhancement Pipeline V23.0
      switch (m.subType) {
        case "PHOTO_NATURAL":
        case "PHOTO_PORTRAIT":
          if (profile.name === "s" && m.textureScore > 0.3) {
            // Unsharp Mask
            const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
            const tempCtx = tempCanvas.getContext("2d");
            tempCtx.filter = "blur(0.3px)";
            tempCtx.drawImage(canvas, 0, 0);
            ctx.globalCompositeOperation = "difference";
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalCompositeOperation = "source-over";
          }
          if (profile.name === "s") {
            ctx.filter = "contrast(1.05) saturate(1.04) brightness(1.01)";
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
          }
          break;
        case "UI_BLOCKS":
        case "UI_GRID":
        case "UI_GENERAL":
        case "SCREENSHOT":
        case "LOGO_SIMPLE":
        case "LOGO_COMPLEX":
          if (profile.name === "s" && m.edgeSharpness > 0.5) {
            ctx.filter = "contrast(1.08)";
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
          }
          break;
        case "LINE_ART_PURE":
          ctx.filter = "contrast(1.12) brightness(1.02)";
          ctx.drawImage(canvas, 0, 0);
          ctx.filter = "none";
          break;
        case "GRAPHIC":
          if (profile.name === "s") {
            ctx.filter = "contrast(1.04) saturate(1.03)";
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
          }
          break;
      }

      const { blob, quality } = await compressAndEncode(
        canvas,
        targetBytes,
        m.subType
      );
      return {
        name: profile.name,
        blob,
        quality: quality.toFixed(3),
        width: canvas.width,
        height: canvas.height,
      };
    });

    const results = await Promise.all(compressionPromises);

    self.postMessage({
      status: "progress",
      percent: 100,
      message: "Hoàn tất!",
    });
    self.postMessage({
      status: "complete",
      allProfiles: results.sort((a, b) => b.width - a.width),
      analysis: {
        category: m.category,
        subType: m.subType,
        confidence: m.confidence.toFixed(0),
        reason: m.reason,
      },
    });
  } catch (error) {
    console.error("Lỗi nghiêm trọng trong worker V23.0:", error);
    self.postMessage({
      status: "error",
      message: `Lỗi Worker: ${error.message}`,
    });
  }
};
