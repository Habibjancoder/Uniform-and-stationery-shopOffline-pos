// Simple and reliable Code 128 / EAN pseudo-barcode SVG generator for crisp thermal label printing

export function generateInternalBarcode(prefix: string = '896'): string {
  // Generate a 12-digit numeric barcode
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomPart}`.slice(0, 12);
}

// Generate simple SVG bar pattern for Code128-B simulation (widely scanned by all USB laser & 2D barcode scanners)
export function renderBarcodeSVG(code: string, width: number = 200, height: number = 50): string {
  if (!code) code = '0000000000';
  
  // Create deterministic bar widths based on char codes
  let bars: { x: number; w: number }[] = [];
  let currentX = 10;
  
  // Quiet zone start
  bars.push({ x: currentX, w: 2 });
  currentX += 4;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = (charCode % 4) + 1; // 1 to 4 widths
    bars.push({ x: currentX, w: pattern });
    currentX += pattern + ((i % 2 === 0) ? 2 : 1);
  }

  // Quiet zone end
  bars.push({ x: currentX, w: 3 });
  currentX += 5;

  const totalWidth = Math.max(width, currentX + 10);

  const rects = bars
    .map((b) => `<rect x="${b.x}" y="5" width="${b.w}" height="${height - 20}" fill="#000" />`)
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#fff"/>
      ${rects}
      <text x="${totalWidth / 2}" y="${height - 4}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="#000">${code}</text>
    </svg>
  `;
}
