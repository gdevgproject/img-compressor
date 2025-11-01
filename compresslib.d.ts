/**
 * UltraCompressPro v3.0.0 TypeScript Definitions
 * @module UltraCompressPro
 */

declare module "ultracompresspro" {
  // ==================== ENUMS & CONSTANTS ====================

  export enum CompressionQuality {
    MAXIMUM = "maximum",
    HIGH = "high",
    BALANCED = "balanced",
    AGGRESSIVE = "aggressive",
    EXTREME = "extreme",
  }

  export enum ImageFormat {
    JPEG = "image/jpeg",
    PNG = "image/png",
    WEBP = "image/webp",
    GIF = "image/gif",
    BMP = "image/bmp",
    TIFF = "image/tiff",
    SVG = "image/svg+xml",
  }

  export enum ProcessingStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
  }

  export enum EventType {
    START = "start",
    PROGRESS = "progress",
    COMPLETE = "complete",
    ERROR = "error",
    CANCEL = "cancel",
    VERSION_COMPLETE = "version_complete",
    BATCH_START = "batch_start",
    BATCH_COMPLETE = "batch_complete",
  }

  // ==================== INTERFACES ====================

  export interface CompressorConfig {
    defaultQuality?: CompressionQuality | string;
    maxFileSize?: number;
    concurrency?: number;
    enableWebWorkers?: boolean;
    cacheResults?: boolean;
  }

  export interface PresetConfig {
    maxDimension: number;
    targetSize: number;
    aspectRatio?: number | null;
  }

  export interface Dimensions {
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
    scale: number;
    aspectRatio: number;
  }

  export interface ImageAnalysis {
    complexity: number;
    uniqueColors: number;
    hasTransparency: boolean;
    transparencyRatio: number;
    imageType: "photo" | "graphic" | "simple" | "complex";
    avgBrightness: number;
    avgSaturation: number;
    variance: number;
    recommendedQuality: number;
    compressibility: number;
    suggestedFormat: ImageFormat;
    edgeRatio: number;
    colorDiversity: number;
    isLowDetail: boolean;
    isHighDetail: boolean;
    isDark: boolean;
    isBright: boolean;
    isVibrant: boolean;
    isDesaturated: boolean;
  }

  export interface VersionMetadata {
    versionIndex: number;
    presetName: string;

    originalSize: number;
    compressedSize: number;
    saved: number;
    originalSizeKB: number;
    compressedSizeKB: number;
    savedKB: number;
    originalSizeMB: number;
    compressedSizeMB: number;
    savedMB: number;

    compressionRatio: number;
    compressionRatioFormatted: string;
    sizeReduction: number;
    efficiency: "good" | "excellent" | "moderate";

    width: number;
    height: number;
    dimensions: string;
    aspectRatio: number;
    scale: number;
    resolutionReduction: number;

    inputFormat: string;
    outputFormat: string;
    formatChanged: boolean;

    compressionTime: number;
    compressionTimeFormatted: string;
    throughput: number;
    throughputFormatted: string;

    quality: string;
    qualityScore: number;

    imageType: string;
    complexity: number;
    compressibility: number;
    hasTransparency: boolean;

    processedAt: string;
    timestamp: number;
  }

  export interface CompressedVersion {
    blob: Blob;
    metadata: VersionMetadata;
    preview: string;
    dataUrl: string | null;
  }

  export interface FileInfo {
    name: string;
    size: number;
    sizeKB: number;
    sizeMB: number;
    type: string;
    dimensions: string;
    width: number;
    height: number;
    aspectRatio: number;
    isAnimated: boolean;
  }

  export interface PerformanceMetrics {
    totalTime: number;
    timePerVersion: number;
    throughput: number;
  }

  export interface Recommendation {
    index: number;
    size: number;
    dimensions: string;
    reason: string;
  }

  export interface Summary {
    versionsCount: number;
    bestVersion: {
      index: number;
      size: number;
      ratio: number;
    };
    totalOutputSize: number;
    totalOutputSizeKB: number;
    averageOutputSize: number;
    averageOutputSizeKB: number;
    averageCompressionRatio: number;
    totalSavings: number;
    recommendation: {
      forQuality: Recommendation;
      forSize: Recommendation;
      balanced: Recommendation | null;
    } | null;
  }

  export interface CompressionResult {
    success: boolean;
    jobId: string;
    file: FileInfo;
    versions: CompressedVersion[];
    analysis: ImageAnalysis;
    performance: PerformanceMetrics;
    summary: Summary;
    timestamp: string;
  }

  export interface CompressionError {
    success: false;
    jobId: string;
    error: string;
    stack?: string;
    file: {
      name: string;
      size: number;
    };
  }

  export interface BatchFileResult {
    fileName: string;
    fileSize: number;
    index: number;
    success: boolean;
    data: CompressionResult | null;
    error: string | null;
  }

  export interface BatchSummary {
    total: number;
    successful: number;
    failed: number;
    successRate: number;

    totalOriginalSize: number;
    totalCompressedSize: number;
    totalSaved: number;

    totalOriginalSizeKB: number;
    totalCompressedSizeKB: number;
    totalSavedKB: string;

    totalOriginalSizeMB: number;
    totalCompressedSizeMB: number;
    totalSavedMB: string;

    compressionRatio: number;
    averageOriginalSize: number;
    averageCompressedSize: number;

    totalTime: number;
    averageTimePerFile: number;
    throughput: number;
  }

  export interface BatchResult {
    success: boolean;
    batchId: string;
    results: BatchFileResult[];
    summary: BatchSummary;
    timestamp: string;
  }

  export interface ProgressData {
    batchId: string;
    processed: number;
    total: number;
    percentage: number;
    currentFile: string;
    currentIndex: number;
    success: boolean;
    failed: number;
    remaining: number;
  }

  export interface CompressOptions {
    quality?: CompressionQuality | string;
    presets?: string[] | PresetConfig[];
    customPresets?: PresetConfig[] | null;
    outputFormat?: ImageFormat | string | null;
    metadata?: boolean;
  }

  export interface BatchOptions extends CompressOptions {
    concurrency?: number;
    onProgress?: (progress: ProgressData) => void;
    onFileComplete?: (result: BatchFileResult, progress: ProgressData) => void;
    stopOnError?: boolean;
  }

  export interface LibraryInfo {
    name: string;
    version: string;
    features: string[];
    formats: ImageFormat[];
    qualityModes: CompressionQuality[];
    presets: string[];
    stats: Statistics;
  }

  export interface Statistics {
    totalProcessed: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    totalSaved: number;
    averageCompressionRatio: number;
    averageProcessingTime: number;
    sessionDuration: number;
    averageSavingsPerImage: number;
  }

  export interface EventData {
    [key: string]: any;
  }

  export type EventCallback = (data: EventData) => void;
  export type UnsubscribeFn = () => void;

  // ==================== UTILITY CLASSES ====================

  export class ImageUtils {
    static detectMimeType(bytes: Uint8Array): string;
    static isAnimated(file: File): Promise<boolean>;
    static loadImage(file: File | Blob): Promise<HTMLImageElement>;
    static canvasToBlob(
      canvas: HTMLCanvasElement,
      mimeType?: string,
      quality?: number
    ): Promise<Blob>;
    static isWebPSupported(): boolean;
    static calculateDimensions(
      width: number,
      height: number,
      maxDimension: number,
      targetAspectRatio?: number | null
    ): Dimensions;
  }

  export class ImageAnalyzer {
    static analyze(img: HTMLImageElement, file: File): Promise<ImageAnalysis>;
    static calculateRecommendedQuality(
      complexity: number,
      imageType: string,
      hasTransparency: boolean
    ): number;
    static calculateCompressibility(
      uniqueColors: number,
      complexity: number
    ): number;
    static suggestFormat(
      imageType: string,
      hasTransparency: boolean
    ): ImageFormat;
  }

  export class CompressionEngine {
    static compress(
      canvas: HTMLCanvasElement,
      format: string,
      targetSize: number,
      analysis: ImageAnalysis,
      qualityMode?: CompressionQuality | string
    ): Promise<Blob>;
    static advancedOptimize(
      canvas: HTMLCanvasElement,
      format: string,
      targetSize: number,
      analysis: ImageAnalysis
    ): Promise<Blob>;
    static createOptimizedCanvas(
      img: HTMLImageElement,
      dimensions: Dimensions,
      analysis: ImageAnalysis
    ): HTMLCanvasElement;
  }

  // ==================== MAIN CLASS ====================

  export default class UltraCompressPro {
    static readonly VERSION: string;
    static readonly CompressionQuality: typeof CompressionQuality;
    static readonly ImageFormat: typeof ImageFormat;
    static readonly ProcessingStatus: typeof ProcessingStatus;
    static readonly EventType: typeof EventType;
    static readonly Utils: typeof ImageUtils;
    static readonly Analyzer: typeof ImageAnalyzer;
    static readonly Engine: typeof CompressionEngine;

    readonly version: string;
    readonly config: CompressorConfig;
    readonly presets: Record<string, PresetConfig>;
    readonly stats: Statistics;

    constructor(config?: CompressorConfig);

    // Public API Methods
    getInfo(): LibraryInfo;
    getStats(): Statistics;
    resetStats(): void;
    validateFile(file: File | Blob): boolean;

    compress(
      file: File | Blob,
      options?: CompressOptions
    ): Promise<CompressionResult>;

    compressMultiple(
      files: File[] | FileList,
      options?: BatchOptions
    ): Promise<BatchResult>;

    cancel(): void;

    addPreset(name: string, config: PresetConfig): PresetConfig;
    removePreset(name: string): boolean;
    getPresets(): Record<string, PresetConfig>;

    // Utility Methods
    loadImage(file: File | Blob): Promise<HTMLImageElement>;
    createCanvas(
      img: HTMLImageElement,
      dimensions: Dimensions
    ): HTMLCanvasElement;
    canvasToBlob(
      canvas: HTMLCanvasElement,
      format?: string,
      quality?: number
    ): Promise<Blob>;
    calculateDimensions(
      width: number,
      height: number,
      maxDimension: number,
      aspectRatio?: number | null
    ): Dimensions;
    analyzeImage(file: File | Blob): Promise<ImageAnalysis>;
    isFormatSupported(format: string): boolean;

    // Event Methods
    on(event: EventType | string, callback: EventCallback): UnsubscribeFn;
    off(event: EventType | string, callback: EventCallback): void;
    once(event: EventType | string, callback: EventCallback): void;
    emit(event: EventType | string, data: EventData): void;
    removeAllListeners(event?: EventType | string): void;
  }

  // Export as namespace for browser globals
  export as namespace UltraCompressPro;
}

/**
 * Usage Examples with TypeScript:
 *
 * import UltraCompressPro, { CompressionQuality, EventType } from 'ultracompresspro';
 *
 * const compressor = new UltraCompressPro({
 *   defaultQuality: CompressionQuality.HIGH,
 *   concurrency: 5
 * });
 *
 * // Single file compression
 * const result = await compressor.compress(file, {
 *   quality: CompressionQuality.BALANCED,
 *   presets: ['large', 'small']
 * });
 *
 * // Batch with progress
 * const batchResult = await compressor.compressMultiple(files, {
 *   onProgress: (progress) => {
 *     console.log(`${progress.percentage}%`);
 *   }
 * });
 *
 * // Event listeners
 * compressor.on(EventType.COMPLETE, (data) => {
 *   console.log('Completed:', data);
 * });
 */
