// @GUARD: Platform-neutral renderer interface. Must stay free of browser/MHS deps.
// The browser Canvas2DRenderer and future MhsDrawingRenderer both implement this.

export interface DrawImageRef {
  id: string;
}

export interface TextStyle {
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  color: string;
  align?: 'left' | 'center' | 'right';
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  /**
   * When true (default), canvas fits text to the layout width (can squash glyphs).
   * Set false for short fixed labels on narrow cards so text draws at natural width.
   */
  useLayoutMaxWidth?: boolean;
}

export interface GameRenderer {
  clear(): void;

  pushTranslate(x: number, y: number): void;
  pushScale(scaleX: number, scaleY: number, originX?: number, originY?: number): void;
  pushRotate(degrees: number, originX?: number, originY?: number): void;
  pop(): void;

  /** Multiplies `globalAlpha` for subsequent draws until `popOpacity` (nestable). */
  pushOpacity(alpha: number): void;
  popOpacity(): void;

  drawRect(color: string, x: number, y: number, width: number, height: number): void;
  drawRectAlpha(color: string, alpha: number, x: number, y: number, width: number, height: number): void;
  drawRoundRect(color: string, x: number, y: number, width: number, height: number, radius: number): void;
  drawRoundRectAlpha(color: string, alpha: number, x: number, y: number, width: number, height: number, radius: number): void;
  drawEllipse(color: string, centerX: number, centerY: number, radiusX: number, radiusY: number): void;
  drawEllipseAlpha(color: string, alpha: number, centerX: number, centerY: number, radiusX: number, radiusY: number): void;
  drawImage(image: DrawImageRef, x: number, y: number, width: number, height: number): void;
  drawImageAlpha(image: DrawImageRef, x: number, y: number, width: number, height: number, alpha: number): void;
  /** Source rectangle in texture space (for sprite sheets). */
  drawImageRegion(
    image: DrawImageRef,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  drawImageRegionAlpha(
    image: DrawImageRef,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    alpha: number,
  ): void;
  drawText(text: string, x: number, y: number, width: number, height: number, style: TextStyle): void;

  // Filled polygon (convex), points are [x0,y0, x1,y1, ...]
  drawPolygon(color: string, points: number[]): void;

  // Gradient rect: color1 at top, color2 at bottom
  drawGradientRect(color1: string, color2: string, x: number, y: number, width: number, height: number): void;
}
