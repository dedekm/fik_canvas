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
    };

    imageObj.src = msg;
  });

  socket.on('draw', (msg) => {
    tool.draw(msg.positions, msg.size, msg.colors);
  });
});
