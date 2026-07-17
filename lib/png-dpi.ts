/** Embed physical DPI in PNG via pHYs chunk (pixels per meter). */

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!
  );
}

function writeUint32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!
  );
}

function pixelsPerMeterFromDpi(dpi: number): number {
  return Math.round(dpi / 0.0254);
}

function buildPhysChunk(dpi: number): Uint8Array {
  const ppm = pixelsPerMeterFromDpi(dpi);
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  view.setUint32(0, ppm, false);
  view.setUint32(4, ppm, false);
  data[8] = 1;

  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  writeUint32BE(chunk, 0, 9);
  chunk[4] = "p".charCodeAt(0);
  chunk[5] = "H".charCodeAt(0);
  chunk[6] = "Y".charCodeAt(0);
  chunk[7] = "s".charCodeAt(0);
  chunk.set(data, 8);
  const crcInput = chunk.subarray(4, 8 + 9);
  writeUint32BE(chunk, 8 + 9, crc32(crcInput));
  return chunk;
}

function signaturesMatch(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

/** Insert or replace pHYs so the PNG reports the given DPI (default 300). */
export function embedPngDpi(pngBytes: Uint8Array, dpi = 300): Uint8Array {
  if (!signaturesMatch(pngBytes)) {
    throw new Error("Invalid PNG signature");
  }

  const chunks: Uint8Array[] = [];
  let offset = PNG_SIGNATURE.length;
  let inserted = false;
  const physChunk = buildPhysChunk(dpi);

  while (offset < pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    const type = chunkType(pngBytes, offset + 4);
    const chunkEnd = offset + 12 + length;
    const chunk = pngBytes.subarray(offset, chunkEnd);

    if (type === "pHYs") {
      if (!inserted) {
        chunks.push(physChunk);
        inserted = true;
      }
      offset = chunkEnd;
      continue;
    }

    chunks.push(chunk);

    if (type === "IHDR" && !inserted) {
      chunks.push(physChunk);
      inserted = true;
    }

    offset = chunkEnd;
  }

  if (!inserted) {
    chunks.splice(1, 0, physChunk);
  }

  const totalLength =
    PNG_SIGNATURE.length + chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(totalLength);
  out.set(PNG_SIGNATURE, 0);
  let writeOffset = PNG_SIGNATURE.length;
  for (const chunk of chunks) {
    out.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return out;
}

export function embedPngDpiFromDataUrl(dataUrl: string, dpi = 300): string {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) {
    throw new Error("Expected PNG data URL");
  }
  const pngBytes = Uint8Array.from(Buffer.from(dataUrl.slice(prefix.length), "base64"));
  const withDpi = embedPngDpi(pngBytes, dpi);
  return `${prefix}${Buffer.from(withDpi).toString("base64")}`;
}

export function pngHasPhysChunk(pngBytes: Uint8Array): boolean {
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    if (chunkType(pngBytes, offset + 4) === "pHYs") return true;
    offset += 12 + length;
  }
  return false;
}

export function pngPhysPixelsPerMeter(pngBytes: Uint8Array): number | null {
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    if (chunkType(pngBytes, offset + 4) === "pHYs" && length >= 4) {
      return readUint32BE(pngBytes, offset + 8);
    }
    offset += 12 + length;
  }
  return null;
}
