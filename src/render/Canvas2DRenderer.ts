// Browser-only Canvas 2D implementation of GameRenderer.
// Do not import this file from core/ or from MHS platform code.

import type { DrawImageRef, GameRenderer, TextStyle } from './GameRenderer';

export class Canvas2DRenderer implements GameRenderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly images: Record<string, HTMLImageElement>,
    private readonly width: number,
    private readonly height: number,
  ) {}

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  pushTranslate(x: number, y: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
  }

  pushScale(scaleX: number, scaleY: number, originX = 0, originY = 0): void {
    this.ctx.save();
    this.ctx.translate(originX, originY);
    this.ctx.scale(scaleX, scaleY);
    this.ctx.translate(-originX, -originY);
  }

  pushRotate(degrees: number, originX = 0, originY = 0): void {
    this.ctx.save();
    this.ctx.translate(originX, originY);
    this.ctx.rotate((degrees * Math.PI) / 180);
    this.ctx.translate(-originX, -originY);
  }

  pop(): void {
    this.ctx.restore();
  }

  pushOpacity(alpha: number): void {
    this.ctx.save();
    this.ctx.globalAlpha *= alpha;
  }

  popOpacity(): void {
    this.ctx.restore();
  }

  pushClipRect(x: number, y: number, width: number, height: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  popClip(): void {
    this.ctx.restore();
  }

  drawRect(color: string, x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  drawRectAlpha(color: string, alpha: number, x: number, y: number, width: number, height: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  drawRoundRect(color: string, x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
  }

  drawRoundRectAlpha(color: string, alpha: number, x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawEllipse(color: string, centerX: number, centerY: number, radiusX: number, radiusY: number): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawEllipseAlpha(color: string, alpha: number, centerX: number, centerY: number, radiusX: number, radiusY: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawImage(image: DrawImageRef, x: number, y: number, width: number, height: number): void {
    const img = this.images[image.id];
    if (img == null) return;
    this.ctx.drawImage(img, x, y, width, height);
  }

  drawImageAlpha(image: DrawImageRef, x: number, y: number, width: number, height: number, alpha: number): void {
    const img = this.images[image.id];
    if (img == null) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(img, x, y, width, height);
    this.ctx.restore();
  }

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
  ): void {
    const img = this.images[image.id];
    if (img == null) return;
    this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

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
  ): void {
    const img = this.images[image.id];
    if (img == null) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    this.ctx.restore();
  }

  drawText(text: string, x: number, y: number, width: number, height: number, style: TextStyle): void {
    this.ctx.save();
    this.ctx.fillStyle = style.color;
    this.ctx.font = `${style.fontWeight ?? '900'} ${style.fontSize}px ${style.fontFamily ?? '"Archivo Black", sans-serif'}`;
    this.ctx.textAlign = style.align ?? 'left';
    this.ctx.textBaseline = 'middle';

    if (style.shadowColor) {
      this.ctx.shadowColor = style.shadowColor;
      this.ctx.shadowBlur = style.shadowBlur ?? 0;
    }

    const tx =
      style.align === 'center' ? x + width / 2 :
      style.align === 'right' ? x + width :
      x;
    const ty = y + height / 2;

    const naturalWidth = style.useLayoutMaxWidth === false;
    if (style.strokeColor && style.strokeWidth) {
      this.ctx.strokeStyle = style.strokeColor;
      this.ctx.lineWidth = style.strokeWidth;
      this.ctx.lineJoin = 'round';
      if (naturalWidth) {
        this.ctx.strokeText(text, tx, ty);
      } else {
        this.ctx.strokeText(text, tx, ty, width);
      }
    }

    if (naturalWidth) {
      this.ctx.fillText(text, tx, ty);
    } else {
      this.ctx.fillText(text, tx, ty, width);
    }
    this.ctx.restore();
  }

  drawPolygon(color: string, points: number[]): void {
    if (points.length < 6) return;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.ctx.lineTo(points[i], points[i + 1]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawGradientRect(color1: string, color2: string, x: number, y: number, width: number, height: number): void {
    const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, width, height);
  }
}
