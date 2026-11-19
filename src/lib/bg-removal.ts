// Browser-only image processing. The same Lovable @imgly model is used by
// product uploads and Home images. No third-party server receives customer media.
async function containsTransparentPixels(file: Blob): Promise<boolean> {
  const image = await createImageBitmap(file);
  try {
    const width = Math.max(1, Math.min(image.width, 220));
    const height = Math.max(1, Math.round(image.height * width / Math.max(image.width, 1)));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.min(height, 220);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Seu navegador não permitiu processar a imagem");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let pixel = 3; pixel < alpha.length; pixel += 4) {
      if ((alpha[pixel] ?? 255) < 220) return true;
    }
    return false;
  } finally {
    image.close();
  }
}

export async function removeBackground(file: File, onProgress?: (pct: number) => void): Promise<Blob> {
  if (await containsTransparentPixels(file)) {
    onProgress?.(100);
    return trimAndCompress(file);
  }
  // Keep original Lovable client-side ML workflow. Load it only on demand.
  const { removeBackground: rb } = await import("@imgly/background-removal");
  const result = await rb(file, {
    output: { format: "image/png" },
    progress: (_key, current, total) => {
      if (onProgress && total) onProgress(Math.max(0, Math.min(100, Math.round((current / total) * 100))));
    },
  });
  if (!await containsTransparentPixels(result)) {
    throw new Error("O recorte automático não conseguiu separar o objeto do fundo. Use outra foto com mais contraste ou desative a remoção.");
  }
  onProgress?.(100);
  return trimAndCompress(result);
}

export async function trimAndCompress(blob: Blob, max = 1000): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 16_000_000) {
      throw new Error("Imagem muito grande. Envie uma foto com até 16 megapixels.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Não foi possível preparar a imagem");
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
    if (maxX <= minX || maxY <= minY) {
      minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const scale = Math.min(1, Math.max(64, max) / Math.max(w, h));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    const outCtx = out.getContext("2d");
    if (!outCtx) throw new Error("Não foi possível converter a imagem");
    outCtx.drawImage(canvas, minX, minY, w, h, 0, 0, out.width, out.height);
    return await new Promise<Blob>((resolve, reject) => out.toBlob(
      processed => processed ? resolve(processed) : reject(new Error("Falha ao converter a imagem em WebP")),
      "image/webp", .9,
    ));
  } finally {
    bitmap.close();
  }
}
