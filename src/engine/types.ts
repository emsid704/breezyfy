export type WatermarkProfile = 'auto' | 'classic' | 'modern' | 'compact' | 'custom';

export interface RemovalSettings {
  profile: WatermarkProfile;
  strength: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  threshold: number;
  feather: number;
  /** Pixel coordinates in the original, orientation-corrected image. */
  position?: { x: number; y: number; size: number };
  /** A calibrated white-on-black opacity map, or white RGBA mask. */
  customMask?: Blob;
}

export const DEFAULT_SETTINGS: RemovalSettings = Object.freeze({
  profile: 'auto', strength: 1, scale: 1, offsetX: 0, offsetY: 0,
  threshold: 0.25, feather: 0,
});

export const MEDIA_LIMITS = Object.freeze({
  imageBytes: 50 * 1024 * 1024,
  imagePixels: 40_000_000,
  imageDimension: 12_288,
  videoBytes: 100 * 1024 * 1024,
  videoPixels: 3840 * 2160,
  videoDuration: 300,
  videoOutputBytes: 256 * 1024 * 1024,
  maskBytes: 4 * 1024 * 1024,
});

export interface ProcessOptions {
  signal?: AbortSignal;
  onProgress?: (fraction: number, label?: string) => void;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
  detected: boolean;
  /** A match score, not a calibrated probability. */
  confidence: number;
  message: string;
  duration?: number;
  processedFrames?: number;
  totalFrames?: number;
}

export interface AlphaMask {
  name: string;
  size: number;
  alpha: Float32Array;
}

export interface Candidate {
  x: number;
  y: number;
  size: number;
  mask: AlphaMask;
}

export interface Detection {
  candidate: Candidate;
  confidence: number;
  accepted: boolean;
  corrected: Uint8ClampedArray;
  clipping: number;
}
