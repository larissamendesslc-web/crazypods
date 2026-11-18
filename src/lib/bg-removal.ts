// Client-only: removes the photo background, then trims & compresses to a transparent WebP.
export async function removeBackground(file: File, onProgress?: (pct: number) => void): Promise<Blob> {
  const { removeBackground: rb } = await import("@imgly/background-removal");
  const blob = await rb(file, {
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (onProgress && total) onProgress(Math.round((current / total) * 100));
      void key;
    },
  });
  return trimAndCompress(blob);
}

export async function trimAndCompress(blob: Blob, max = 1000): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) { minX = 0; minY = 0; maxX = width - 1; maxY = height - 1; }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const scale = Math.min(1, max / Math.max(w, h));
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  out.getContext("2d")!.drawImage(c, minX, minY, w, h, 0, 0, out.width, out.height);
  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar imagem"))), "image/webp", 0.9));
}