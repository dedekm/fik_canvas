PaintTool = require './paint_tool.coffee'
io = require 'socket.io/client-dist/socket.io.js'

$ ->
  canvas = document.getElementById('f-canvas')
  ctx = canvas.getContext('2d')
  clicked = false
  onCanvas = false
  users = []
  tool = new PaintTool(canvas)
  mouse = { x: 0, y: 0 }
  positions = []

  render = ->
    if positions.length > 0
      tool.draw(positions)

      socket.emit 'draw',
        positions: positions
        color: tool.color
        size: tool.size

      positions = [ positions[positions.length - 1] ]
    window.requestAnimationFrame render
    return

  setButtonActive = (event) ->
    $btn = $(event.target.parentNode)
    type = $btn.data('type')
    $(".f-btn--active[data-type='#{type}'").removeClass('f-btn--active')
    $btn.addClass("f-btn--active")

    return $btn

  setColor = (event) ->
    $btn = setButtonActive(event)
    tool.setColor $btn.data('value')

  setSize = (event) ->
    $btn = setButtonActive(event)
    tool.setSize $btn.data('value')

  mouseDown = (event) ->
    clicked = true
    positions.push mousePosition(event)

  mouseUp = (event) ->
    clicked = false
    positions = []

  mouseLeave = (event) ->
    positions = []

  mouseMove = (event) ->
    if clicked
      pos = mousePosition(event)
      positions.push(pos)

  getOffsetPosition = (el) ->
    position =
      top: el.offsetTop
      left: el.offsetLeft

    if el.offsetParent
      parentPosition = getOffsetPosition(el.offsetParent)
      position.top += parentPosition.top
      position.left += parentPosition.left

    position

  mousePosition = (e) ->
    e = e || window.event

    if e.touches
      pageX = e.touches[0].clientX
      pageY = e.touches[0].clientY
    else
      pageX = e.pageX
      pageY = e.pageY

    # IE 8
    unless pageX
      pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

    canvasPosition = getOffsetPosition(canvas)

    {
      x: Math.round(pageX - canvasPosition.left),
      y: Math.round(pageY - canvasPosition.top)
    }

  $(document).on 'mouseleave', 'body', mouseLeave
  $(document).on 'mousedown touchstart', '#f-canvas', mouseDown
  $(document).on 'mouseup touchend contextmenu', mouseUp
  $(document).on 'mousemove touchmove', 'body', mouseMove

  $(document).on 'click', '.f-btn-color', setColor
  $(document).on 'click', '.f-btn-size', setSize

  window.requestAnimationFrame render

  # Socket.io
  socket = io()

  socket.on 'loadImage', (msg) ->
    imageObj = new Image

    imageObj.onload = ->
      ctx.drawImage this, 0, 0

    imageObj.src = msg

  # socket.on 'users', (msg) ->
  #   users = msg.users
  #   # console.log('connected users are ' + users);
  #   $('ul').empty()
  #   i = 0
  #   while i < users.length
  #     $('#users').append '<li><span class=\'icons\'>' + users[i][0] + '</span> ' + users[i] + '</li>'
  #     i++
  #   return

  socket.on 'draw', (msg) ->
    tool.draw msg.positions, msg.color, msg.size
