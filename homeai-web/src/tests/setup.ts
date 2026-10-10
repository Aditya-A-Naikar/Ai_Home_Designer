import "@testing-library/jest-dom";

// Standard HTMLCanvasElement 2D context mock for jsdom test environment
if (typeof window !== "undefined" && typeof HTMLCanvasElement !== "undefined") {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown
  ) {
    if (contextId === "2d") {
      const width = this.width || 300;
      const height = this.height || 150;
      const buffer = new Uint8ClampedArray(Math.max(1, width * height * 4));

      return {
        canvas: this,
        fillStyle: "#000000",
        strokeStyle: "#000000",
        lineWidth: 1,
        lineCap: "butt",
        fillRect: (x: number, y: number, w: number, h: number) => {
          const r = 128, g = 128, b = 128, a = 255;
          const x0 = Math.max(0, Math.floor(x));
          const y0 = Math.max(0, Math.floor(y));
          const x1 = Math.min(width, Math.floor(x + w));
          const y1 = Math.min(height, Math.floor(y + h));
          for (let cy = y0; cy < y1; cy++) {
            for (let cx = x0; cx < x1; cx++) {
              const idx = (cy * width + cx) * 4;
              buffer[idx] = r;
              buffer[idx + 1] = g;
              buffer[idx + 2] = b;
              buffer[idx + 3] = a;
            }
          }
        },
        clearRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        bezierCurveTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        getImageData: (x: number, y: number, w: number, h: number) => ({
          width: w,
          height: h,
          data: buffer.slice(0, w * h * 4),
        }),
        putImageData: (imgData: ImageData, dx: number, dy: number) => {
          const srcData = imgData.data;
          const x0 = Math.max(0, Math.floor(dx));
          const y0 = Math.max(0, Math.floor(dy));
          const x1 = Math.min(width, x0 + imgData.width);
          const y1 = Math.min(height, y0 + imgData.height);
          for (let cy = y0; cy < y1; cy++) {
            for (let cx = x0; cx < x1; cx++) {
              const srcIdx = ((cy - y0) * imgData.width + (cx - x0)) * 4;
              const dstIdx = (cy * width + cx) * 4;
              buffer[dstIdx] = srcData[srcIdx];
              buffer[dstIdx + 1] = srcData[srcIdx + 1];
              buffer[dstIdx + 2] = srcData[srcIdx + 2];
              buffer[dstIdx + 3] = srcData[srcIdx + 3];
            }
          }
        },
        drawImage: () => {},
      } as unknown as CanvasRenderingContext2D;
    }
    return originalGetContext ? originalGetContext.call(this, contextId as "bitmaprenderer", options as ImageBitmapRenderingContextSettings) : null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
