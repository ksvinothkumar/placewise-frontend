const MAX_SIDE = 256;
const MAX_INPUT = 5 * 1024 * 1024;

/**
 * Reads a chosen image and returns a small data URL (at most 256 px on the long side, PNG so transparency survives).
 * The logo is stored on the client record, so it works without any file storage on the server.
 */
export async function imageToLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPEG or WebP image');
  if (file.size > MAX_INPUT) throw new Error('That image is over 5 MB');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that image');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
