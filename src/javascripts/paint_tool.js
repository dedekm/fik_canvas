function drawPixels(ctx, x, y, size) {
  ctx.fillRect(roundToPixel(x, size) - (size / 2),
               roundToPixel(y, size) - (size / 2),
               size,
               size);
}

function roundToPixel(n, size) {
  return Math.floor(n / size) * size;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function rgbToHex(rgb) {
  return (
    "#" +
    ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b)
      .toString(16)
      .slice(1)
  );
}

function interpolateColor(color1, color2, factor) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const interpolatedColor = {
    r: Math.round(rgb1.r + factor * (rgb2.r - rgb1.r)),
    g: Math.round(rgb1.g + factor * (rgb2.g - rgb1.g)),
    b: Math.round(rgb1.b + factor * (rgb2.b - rgb1.b))
  };

  return rgbToHex(interpolatedColor);
}

// Festival color for the spray tool.
const SPRAY_COLOR = "#000000";

const ALLOWED_COLORS = {
  black: "#000000",
  red: "#fa3b00",
  green: "#2e705e",
  pink: "#e8affe",
  // gradient: ["#a4e0f2", "#ead188", "#e48f2e"],
  gold: "#ffd700",
  spray: SPRAY_COLOR
};

const ALLOWED_SIZES = [2, 4, 8];

// Cloud diameter in screen pixels. Button 1 is 24. Buttons 2 and 3 are
// 2× and 3× so the bigger pencil squares still read as a spray.
const SPRAY_DIAMETER = {
  2: 24,
  4: 48,
  8: 72
};

function sprayDiameter(size) {
  return SPRAY_DIAMETER[size] || SPRAY_DIAMETER[2];
}

// Size buttons 2 and 3 stamp the same squares as the pencil (4 and 8).
// Button 1 (value 2) stays a 1px airbrush.
function sprayPixelSize(size) {
  if (size === 4 || size === 8) return size;
  return 1;
}

// Pencil squares per dab. Null keeps the MS Paint attempt count, which is
// right for 1px specks. A 4px square already covers 16 specks and an 8px
// square covers 64, so the same attempt count tiles the cloud shut even
// on a fast stroke. A few squares per dab stay stippled while the pointer
// moves and still fill in while it is held.
function sprayStampBudget(pixel) {
  if (pixel === 4) return 4;
  if (pixel === 8) return 2;
  return null;
}

// JS Paint sprays on this interval while the button is held, including when
// the pointer stays still. Moving fast therefore leaves a sparser trail.
const SPRAY_INTERVAL_MS = 5;

class PaintTool {
  constructor(canvas, client = true) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.size = 4;
    this.color = 'red';

    this.client = client;

    if (this.client && ALLOWED_COLORS['gradient']) {
      this.gradient = {
        colors: ALLOWED_COLORS['gradient'],
        index: Math.floor(Math.random() * (ALLOWED_COLORS['gradient'].length - 1)),
        position: Math.floor(Math.random()* 10) / 10,
        direction: 1,
        speed: 0.025,
      };
    }
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

  gradientHexColor() {
    this.updateGradient()

    const from = this.gradient.colors[this.gradient.index];
    const to = this.gradient.colors[this.gradient.index + this.gradient.direction];
    return interpolateColor(from, to, this.gradient.position);
  }

  updateGradient() {
    this.gradient.position += this.gradient.speed;

    if (this.gradient.position >= 1) {
      this.gradient.position = 0;
      this.gradient.index += this.gradient.direction;
    }

    if (this.gradient.index == (this.gradient.colors.length - 1) && this.gradient.direction == 1) {
      this.gradient.direction = -1
    } else if (this.gradient.index == 0 && this.gradient.direction == -1) {
      this.gradient.direction = 1
    }
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

  draw(positions, size, colors) {
    size = size || this.size;

    if (!colors) {
      let hexColor;

      if (this.color == 'gradient') {
        hexColor = this.gradientHexColor();
      } else {
        hexColor = this.hexColor(this.color);
      }

      this.ctx.fillStyle = hexColor
    } else {
      this.ctx.fillStyle = colors[0]
    }

    const outputColors = [];
    const start = positions[0];

    drawPixels(this.ctx, start.x, start.y, size);
    outputColors.push(this.ctx.fillStyle);

    if (positions.length > 1) {
      for (let i = 1; i < positions.length; i++) {
        const previous = positions[i - 1];
        const current = positions[i];

        if (colors) {
          this.ctx.fillStyle = colors[i];
        } else if (this.color == 'gradient') {
          this.ctx.fillStyle = this.gradientHexColor();
        }

        this.bline(previous.x, previous.y, current.x, current.y, size);
        outputColors.push(this.ctx.fillStyle);
      }
    }

    return {
      colors: outputColors,
      positions: positions,
      size: size,
    };
  }

  // One airbrush dab. Same scatter as MS Paint: try points in the square
  // and keep those inside the circle. Size 1 is a 1px speck. Sizes 2 and 3
  // snap onto the pencil grid and place only sprayStampBudget squares.
  sprayDots(x, y, size) {
    const pixel = sprayPixelSize(size);
    const r = sprayDiameter(size) / 2;
    const dots = [];
    const seen = new Set();
    const budget = sprayStampBudget(pixel);
    const maxTries = budget == null ? 6 + r / 5 : 40;

    for (let i = 0; i < maxTries && (budget == null || dots.length < budget); i++) {
      const rx = (Math.random() * 2 - 1) * r;
      const ry = (Math.random() * 2 - 1) * r;
      if (rx * rx + ry * ry > r * r) continue;

      let px;
      let py;
      if (pixel === 1) {
        px = x + ~~rx;
        py = y + ~~ry;
      } else {
        const cx = roundToPixel(x + rx, pixel);
        const cy = roundToPixel(y + ry, pixel);
        const dx = cx - x;
        const dy = cy - y;
        if (dx * dx + dy * dy > r * r) continue;
        px = cx - pixel / 2;
        py = cy - pixel / 2;
      }

      const key = px + ',' + py;
      if (seen.has(key)) continue;
      seen.add(key);
      dots.push({ x: px, y: py, size: pixel });
    }

    return dots;
  }

  // Stamp already-chosen dots. Randomness stays on the drawing client so the
  // server and the other clients paint the same pixels. Color is always
  // SPRAY_COLOR.
  drawSpray(positions, size) {
    const hex = SPRAY_COLOR;
    const drawn = [];
    const fallback = sprayPixelSize(size);

    this.ctx.fillStyle = hex;

    if (positions) {
      const limit = Math.min(positions.length, 2000);
      for (let i = 0; i < limit; i++) {
        const p = positions[i];
        if (!p) continue;
        const x = Number(p.x);
        const y = Number(p.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const pixel = p.size == null ? fallback : sprayPixelSize(p.size);
        const px = pixel === 1 ? (x | 0) : x;
        const py = pixel === 1 ? (y | 0) : y;
        if (px + pixel <= 0 || py + pixel <= 0 || px >= this.canvas.width || py >= this.canvas.height) continue;
        this.ctx.fillRect(px, py, pixel, pixel);
        drawn.push({ x: px, y: py, size: pixel });
      }
    }

    return {
      colors: [hex],
      positions: drawn,
      size: drawn.length ? drawn[0].size : fallback,
      isSpray: true
    };
  }
}

module.exports = PaintTool;
module.exports.SPRAY_COLOR = SPRAY_COLOR;
module.exports.SPRAY_INTERVAL_MS = SPRAY_INTERVAL_MS;
module.exports.SPRAY_DIAMETER = SPRAY_DIAMETER;
