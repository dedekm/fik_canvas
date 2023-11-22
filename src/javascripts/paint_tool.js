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

const ALLOWED_COLORS = {
  black: "#000000",
  blue: "#34449d",
  gradient: ["#a4e0f2", "#ead188", "#e48f2e"],
  white: "#ffffff"
};

const ALLOWED_SIZES = [2, 4, 8];

class PaintTool {
  constructor(canvas, client = true) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.size = 4;
    this.color = 'black';

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
}

module.exports = PaintTool;
