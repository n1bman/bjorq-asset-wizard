/**
 * Thumbnail generator — creates a branded info-card image for each asset.
 *
 * Uses `sharp` to compose a dark card with asset name, triangle count,
 * and file size. Output: thumb.webp (512×512).
 *
 * This is the final thumbnail solution — no 3D rendering needed.
 */

import sharp from "sharp";

interface ThumbnailInfo {
  name: string;
  triangles: number;
  fileSizeKB: number;
  materials: number;
  category?: string;
}

/**
 * Generate a branded info-card thumbnail as a WebP buffer.
 */
export async function generateThumbnail(info: ThumbnailInfo): Promise<Buffer> {
  const width = 512;
  const height = 512;

  const triangleStr = info.triangles.toLocaleString();
  const sizeStr = info.fileSizeKB >= 1024
    ? `${(info.fileSizeKB / 1024).toFixed(1)} MB`
    : `${info.fileSizeKB} KB`;
  const categoryStr = info.category || "asset";

  // Build SVG info card
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bg)" rx="16" />

      <!-- Decorative cube icon -->
      <g transform="translate(206, 100)">
        <rect x="0" y="20" width="60" height="60" rx="6" fill="none" stroke="#4a9eff" stroke-width="2" opacity="0.6" transform="rotate(-10, 50, 50)" />
        <rect x="20" y="10" width="60" height="60" rx="6" fill="none" stroke="#4a9eff" stroke-width="2" opacity="0.8" transform="rotate(5, 50, 50)" />
        <rect x="10" y="0" width="60" height="60" rx="6" fill="none" stroke="#4a9eff" stroke-width="2" opacity="1" />
      </g>

      <!-- Asset name -->
      <text x="${width / 2}" y="230" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#ffffff">
        ${escapeXml(truncate(info.name, 22))}
      </text>

      <!-- Category badge -->
      <rect x="${width / 2 - 50}" y="248" width="100" height="24" rx="12" fill="#4a9eff" opacity="0.2" />
      <text x="${width / 2}" y="265" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#4a9eff">
        ${escapeXml(categoryStr.toUpperCase())}
      </text>

      <!-- Stats -->
      <line x1="100" y1="300" x2="${width - 100}" y2="300" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />

      <text x="${width / 2}" y="340" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#aaaacc">
        ${triangleStr} triangles
      </text>
      <text x="${width / 2}" y="365" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#aaaacc">
        ${info.materials} material${info.materials !== 1 ? "s" : ""}
      </text>
      <text x="${width / 2}" y="390" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#aaaacc">
        ${sizeStr}
      </text>

      <!-- Branding -->
      <text x="${width / 2}" y="460" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#555577" letter-spacing="2">
        BJORQ ASSET WIZARD
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .resize(width, height)
    .webp({ quality: 85 })
    .toBuffer();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
