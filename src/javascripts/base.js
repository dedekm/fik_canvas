const PaintTool = require('./paint_tool.js');
const io = require('socket.io/client-dist/socket.io.js');

$(function() {
  const canvas = document.getElementById('f-canvas');
  const ctx = canvas.getContext('2d');
  const tool = new PaintTool(canvas);

  let clicked = false;
  let onCanvas = false;
  let positions = [];
  let vectorStartPoint = null;
  let vectorColor = null;
  let savedCanvasState = null;
  let currentMousePos = null;
  let otherPlayersPreviews = {}; // Store previews from other players by socketId

  function drawAllPreviews() {
    // Draw other players' previews first (in consistent order)
    const socketIds = Object.keys(otherPlayersPreviews).sort();
    for (const socketId of socketIds) {
      const preview = otherPlayersPreviews[socketId];
      tool.ctx.fillStyle = preview.color;
      tool.drawPixelatedCircle(preview.start.x, preview.start.y, preview.size);
      tool.bline(preview.start.x, preview.start.y, preview.end.x, preview.end.y, preview.size);
      tool.drawPixelatedCircle(preview.end.x, preview.end.y, preview.size);
    }

    // Draw our own preview on top (so we always see our own)
    if (vectorStartPoint !== null && currentMousePos !== null && vectorColor !== null) {
      tool.ctx.fillStyle = vectorColor;
      tool.drawPixelatedCircle(vectorStartPoint.x, vectorStartPoint.y, tool.size);
      tool.bline(vectorStartPoint.x, vectorStartPoint.y, currentMousePos.x, currentMousePos.y, tool.size);
      tool.drawPixelatedCircle(currentMousePos.x, currentMousePos.y, tool.size);
    }
  }

  function render() {
    if (positions.length > 0 && tool.color !== 'vector') {
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      
      // If other players have previews, we need to draw on clean canvas
      if (hasOtherPreviews && savedCanvasState !== null) {
        // Restore clean canvas (remove previews)
        ctx.putImageData(savedCanvasState, 0, 0);
      }
      
      const data = tool.draw(positions);

      socket.emit('draw', {
        positions: data.positions,
        colors: data.colors,
        size: data.size
      });

      // Update saved state with our new drawing
      if (hasOtherPreviews) {
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Redraw all previews on top
        drawAllPreviews();
      }

      positions = [positions[positions.length - 1]];
    }

    window.requestAnimationFrame(render);
  }

  function setButtonActive(event) {
    const $btn = $(event.target.parentNode);
    const type = $btn.data('type');

    $(`.f-btn--active[data-type='${type}']`).removeClass('f-btn--active');
    $btn.addClass('f-btn--active');

    return $btn;
  }

  function setColor(event) {
    const $btn = setButtonActive(event);
    const newColor = $btn.data('value');

    if (tool.color === 'vector' && newColor !== 'vector') {
      // Restore canvas if we were drawing a vector preview
      if (savedCanvasState !== null && vectorStartPoint !== null) {
        ctx.putImageData(savedCanvasState, 0, 0);
        
        // Clear our preview for other players
        socket.emit('vectorPreviewClear');
        
        vectorStartPoint = null;
        vectorColor = null;
        currentMousePos = null;
        
        // Check if there are still other players' previews
        const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
        if (hasOtherPreviews) {
          // Keep saved state and draw other previews
          savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
          drawAllPreviews();
        } else {
          // No other previews, clear saved state
          savedCanvasState = null;
        }
      } else {
        vectorStartPoint = null;
        vectorColor = null;
        currentMousePos = null;
      }
    }

    tool.setColor(newColor);
  }

  function setSize(event) {
    const $btn = setButtonActive(event);
    tool.setSize($btn.data('value'));
  }

  function mouseDown(event) {
    clicked = true;
    const pos = mousePosition(event);

    if (tool.color === 'vector') {
      // Start of vector drag - save the start point and choose color
      vectorStartPoint = pos;

      const vectorColorArray = tool.hexColor('vector');
      vectorColor = Array.isArray(vectorColorArray)
        ? vectorColorArray[Math.floor(Math.random() * vectorColorArray.length)]
        : vectorColorArray;

      // If there are other players' previews, we need to get clean canvas state first
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      if (hasOtherPreviews && savedCanvasState !== null) {
        // Restore to clean state first, then save it
        ctx.putImageData(savedCanvasState, 0, 0);
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } else {
        // Save the current canvas state before drawing preview
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      tool.ctx.fillStyle = vectorColor;
      tool.drawPixelatedCircle(pos.x, pos.y, tool.size);
      return;
    }

    return positions.push(pos);
  }

  function mouseUp(event) {
    if (tool.color === 'vector' && vectorStartPoint !== null && clicked) {
      // End of vector drag - restore canvas and draw the final line
      const endPos = mousePosition(event);
      
      // Restore canvas to remove all previews
      if (savedCanvasState !== null) {
        ctx.putImageData(savedCanvasState, 0, 0);
      }
      
      const data = tool.drawVector(vectorStartPoint, endPos, null, vectorColor);

      socket.emit('draw', {
        positions: data.positions,
        colors: data.colors,
        size: data.size,
        isVector: true
      });

      // Clear our preview for other players
      socket.emit('vectorPreviewClear');

      // Reset for next line
      vectorStartPoint = null;
      vectorColor = null;
      currentMousePos = null;

      // Check if there are still other players' previews
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      if (hasOtherPreviews) {
        // Save the clean state with our drawn vector, then draw other previews
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        drawAllPreviews();
      } else {
        // No other previews, clear saved state
        savedCanvasState = null;
      }
    }

    clicked = false;
    positions = [];
  }

  function mouseLeave(event) {
    // Restore canvas if we were drawing a vector preview
    if (tool.color === 'vector' && savedCanvasState !== null && vectorStartPoint !== null) {
      ctx.putImageData(savedCanvasState, 0, 0);
      
      // Clear our preview for other players
      socket.emit('vectorPreviewClear');
      
      vectorStartPoint = null;
      vectorColor = null;
      currentMousePos = null;
      
      // Check if there are still other players' previews
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      if (hasOtherPreviews) {
        // Keep saved state and draw other previews
        drawAllPreviews();
      } else {
        // No other previews, clear saved state
        savedCanvasState = null;
      }
    }
    
    positions = [];
  }

  function mouseMove(event) {
    if (clicked) {
      let pos = mousePosition(event);
      currentMousePos = pos;
      
      if (tool.color === 'vector' && vectorStartPoint !== null && savedCanvasState !== null) {
        // Restore canvas to state before preview, then draw all previews
        ctx.putImageData(savedCanvasState, 0, 0);
        drawAllPreviews();

        // Emit preview update to other players
        socket.emit('vectorPreview', {
          start: vectorStartPoint,
          end: pos,
          color: vectorColor,
          size: tool.size
        });
      } else {
        positions.push(pos);
      }
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
      const hasOwnPreview = vectorStartPoint !== null;
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      
      // If we have any previews, restore first
      if (savedCanvasState !== null && (hasOwnPreview || hasOtherPreviews)) {
        ctx.putImageData(savedCanvasState, 0, 0);
      }
      
      ctx.drawImage(this, 0, 0);
      
      // Update saved canvas state if we have any previews
      if (hasOwnPreview || hasOtherPreviews) {
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Redraw all previews on top
        drawAllPreviews();
      }
      
      // animatePixels();
    };

    imageObj.src = msg;
  });

  socket.on('draw', (msg) => {
    const hasOwnPreview = vectorStartPoint !== null;
    const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
    
    // If we have any previews (ours or others'), we need to be careful
    if (savedCanvasState !== null && (hasOwnPreview || hasOtherPreviews)) {
      // 1. Restore canvas to remove all previews
      ctx.putImageData(savedCanvasState, 0, 0);
      
      // 2. Draw the incoming data from other player
      tool.draw(msg.positions, msg.size, msg.colors, msg.isVector);
      
      // 3. Save the clean state (with other player's drawing, but without any previews)
      savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 4. Redraw all previews (ours + other players') on top
      drawAllPreviews();
    } else {
      // Not in vector preview mode, just draw normally
      tool.draw(msg.positions, msg.size, msg.colors, msg.isVector);
    }
  });

  socket.on('vectorPreview', (msg) => {
    // Store or update the preview from another player
    const wasFirstPreview = Object.keys(otherPlayersPreviews).length === 0;
    
    otherPlayersPreviews[msg.socketId] = {
      start: msg.start,
      end: msg.end,
      color: msg.color,
      size: msg.size
    };

    if (savedCanvasState !== null) {
      // We already have a saved state, restore and redraw all previews
      ctx.putImageData(savedCanvasState, 0, 0);
      drawAllPreviews();
    } else if (wasFirstPreview) {
      // First preview from any player - save clean canvas state first
      savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Don't restore, just draw the preview on top for the first time
      drawAllPreviews();
    } else {
      // Should not happen, but handle it
      if (savedCanvasState === null) {
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      ctx.putImageData(savedCanvasState, 0, 0);
      drawAllPreviews();
    }
  });

  socket.on('vectorPreviewClear', (msg) => {
    // Remove the preview from the specified player
    if (msg.socketId && otherPlayersPreviews[msg.socketId]) {
      delete otherPlayersPreviews[msg.socketId];

      // Check if we have any previews left
      const hasOtherPreviews = Object.keys(otherPlayersPreviews).length > 0;
      const hasOwnPreview = vectorStartPoint !== null;

      if (savedCanvasState !== null) {
        ctx.putImageData(savedCanvasState, 0, 0);
        
        if (hasOtherPreviews || hasOwnPreview) {
          // Still have previews to draw
          drawAllPreviews();
        } else {
          // No more previews, clear the saved state
          savedCanvasState = null;
        }
      }
    }
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
