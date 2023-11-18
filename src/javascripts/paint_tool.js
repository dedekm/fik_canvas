var drawPixels = function(ctx, x, y, size) {
  return ctx.fillRect(roundToPixel(x, size) - (size / 2),
                      roundToPixel(y, size) - (size / 2),
                      size,
                      size);
};

var roundToPixel = function(n, size) {
  return Math.floor(n / size) * size;
};

const ALLOWED_COLORS = {
  black: "#000000",
  green: "#0affcd",
  gray: "#bbbdbf",
  white: "#ffffff"
};

const ALLOWED_SIZES = [2, 4, 8];

class PaintTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.size = 4;
    this.color = 'black';
  }

  setColor(color) {
    return this.color = color;
  }

  setSize(size) {
    if (ALLOWED_SIZES.indexOf(size) === -1) {
      return;
    }
    return this.size = size;
  }

  hexColor(color) {
    return ALLOWED_COLORS[color];
  }

  bline(x0, y0, x1, y1, size) {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;

    let err = (dx > dy ? dx : -dy) / 2;

    while (true) {
      drawPixels(this.ctx, x0, y0, size);
      if (x0 === x1 && y0 === y1) break;
      let e2 = err;
      if (e2 > -dx) { err -= dy; x0 += sx; }
      if (e2 < dy) { err += dx; y0 += sy; }
    }
  }

  draw(positions, color, size) {
    this.ctx.fillStyle = this.hexColor(this.color || color);
    size = size || this.size;

    const start = positions[0];

    drawPixels(this.ctx, start.x, start.y, size);

    if (positions.length === 1) { return; }

    for (let i = 1; i < positions.length; i++) {
      const previous = positions[i - 1];
      const current = positions[i];
      this.bline(previous.x, previous.y, current.x, current.y, size);
    }
  }
}

  module.exports = PaintTool;
