const PaintTool = require('./paint_tool.js');
const io = require('socket.io/client-dist/socket.io.js');

$(function() {
  const canvas = document.getElementById('f-canvas');
  const ctx = canvas.getContext('2d');
  const tool = new PaintTool(canvas);

  let clicked = false;
  let onCanvas = false;
  let positions = [];

  function render() {
    if (positions.length > 0) {
      const data = tool.draw(positions);

      socket.emit('draw', {
        positions: data.positions,
        colors: data.colors,
        size: data.size
      });

      positions = [positions[positions.length - 1]];
    }

    window.requestAnimationFrame(render);
  }

  function setButtonActive(event) {
    const $btn = $(event.target.parentNode);
    const type = $btn.data('type');

    $(".f-btn--active[data-type='" + type + "'").removeClass('f-btn--active');
    $btn.addClass("f-btn--active");

    return $btn;
  }

  function setColor(event) {
    const $btn = setButtonActive(event);
    tool.setColor($btn.data('value'));
  }

  function setSize(event) {
    const $btn = setButtonActive(event);
    tool.setSize($btn.data('value'));
  }

  function mouseDown(event) {
    clicked = true;
    return positions.push(mousePosition(event));
  }

  function mouseUp(event) {
    clicked = false;
    positions = [];
  }

  function mouseLeave(event) {
    positions = [];
  }

  function mouseMove(event) {
    if (clicked) {
      let pos = mousePosition(event);
      positions.push(pos);
    }
  }

  function getOffsetPosition(el) {
    const position = {
      top: el.offsetTop,
      left: el.offsetLeft
    };

    if (el.offsetParent) {
      const parentPosition = getOffsetPosition(el.offsetParent);
      position.top += parentPosition.top;
      position.left += parentPosition.left;
    }

    return position;
  }

  function mousePosition(e) {
    let pageX, pageY;
    e = e || window.event;

    if (e.touches) {
      pageX = e.touches[0].clientX;
      pageY = e.touches[0].clientY;
    } else {
      pageX = e.pageX;
      pageY = e.pageY;
    }

    if (!pageX) {
      pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    const canvasPosition = getOffsetPosition(canvas);

    return {
      x: Math.round(pageX - canvasPosition.left),
      y: Math.round(pageY - canvasPosition.top)
    };
  }

  $(document).on('mouseleave', 'body', mouseLeave);
  $(document).on('mousedown touchstart', '#f-canvas', mouseDown);
  $(document).on('mouseup touchend contextmenu', mouseUp);
  $(document).on('mousemove touchmove', 'body', mouseMove);
  $(document).on('click', '.f-btn-color', setColor);
  $(document).on('click', '.f-btn-size', setSize);

  window.requestAnimationFrame(render);

  const socket = io();

  socket.on('loadImage', (msg) => {
    const imageObj = new Image;

    imageObj.onload = function() {
      ctx.drawImage(this, 0, 0);
      animatePixels();
    };

    imageObj.src = msg;
  });

  socket.on('draw', (msg) => {
    tool.draw(msg.positions, msg.size, msg.colors);
  });

  const goldColor = { r: 255, g: 215, b: 0 };

  function animatePixels() {
    const gradientValue = 0.2;
    const gradientSpacing = 20;
    const gapSizeMultiplier = 1;

    let gradientPosition = 0;

    function checkForGold(r, g, b) {
      return Math.abs(r - goldColor.r) < 150 &&
             Math.abs(g - goldColor.g) < 150 &&
             Math.abs(b - goldColor.b) < 150
    }

    function adjustBrightness(brightness) {
      let c = null;
      if (brightness > 1.1) {
        c = {
          r: Math.min(255, goldColor.r * brightness),
          g: Math.min(255, goldColor.g * brightness),
          b: 149,
        };
      } else {
        c = {
          r: Math.min(255, goldColor.r * brightness),
          g: Math.min(255, goldColor.g * brightness),
          b: Math.min(255, goldColor.b * brightness),
        };
      }

      return c;
    }

    function updateFrame() {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = imageData.width;

      for (let y = 0; y < imageData.height; y += 2) {
        for (let x = 0; x < imageData.width; x += 2) {
          const offset = (y * width + x) * 4;
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];

          const diagonalPosition = (Math.floor(x / 2) + Math.floor(y / 2) + gradientPosition) / gradientSpacing;
          const gradientFactor = 1.0 + Math.max(0, gradientValue * Math.sin(diagonalPosition * gapSizeMultiplier));

          if (checkForGold(r, g, b)) {
            for (let dy = 0; dy < 2; dy++) {
              for (let dx = 0; dx < 2; dx++) {
                  const blockOffset = ((y + dy) * width + (x + dx)) * 4;
                  const updated = adjustBrightness(gradientFactor);
                  data[blockOffset] = updated.r;
                  data[blockOffset + 1] = updated.g;
                  data[blockOffset + 2] = updated.b;
              }
            }
          }
        }
      }

      gradientPosition += 3;

      ctx.putImageData(imageData, 0, 0);

      setTimeout(updateFrame, 1000 / 15);
    }

    updateFrame();
  }
});
