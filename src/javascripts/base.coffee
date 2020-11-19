PaintTool = require './paint_tool.coffee'
io = require 'socket.io/client-dist/socket.io.js'

do ->
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

  setColor = (event) ->
    socket.emit 'message', "hej"
    tool.setColor event.target.dataset.value

  setSize = (event) ->
    tool.setSize event.target.dataset.value * 2

  mouseDown = (event) ->
    clicked = true
    positions.push mousePosition(event)

  mouseUp = (event) ->
    clicked = false
    positions = []

  mouseIn = (event) ->
    onCanvas = true

  mouseOut = (event) ->
    onCanvas = false

  mouseMove = (evt) ->
    if clicked
      positions.push mousePosition(evt)

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
    e = e || window.event;

    pageX = e.pageX
    pageY = e.pageY

    # IE 8
    unless pageX
      pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

    canvasPosition = getOffsetPosition(canvas)

    {
      x: pageX - canvasPosition.left,
      y: pageY - canvasPosition.top
    }

  # document.getElementById('form').addEventListener 'submit', (event) ->
    # event.preventDefault()
    # name = document.getElementById('name').value
    # if name

  document.addEventListener 'mousedown', mouseDown
  document.addEventListener 'mouseup', mouseUp
  document.addEventListener 'mousemove', mouseMove

  for btn in document.getElementsByClassName("f-btn-color")
    btn.addEventListener('click', setColor)

  for btn in document.getElementsByClassName("f-btn-size")
    btn.addEventListener('click', setSize)

  # document.getElementById('warning').innerHTML = ''
    #   socket.emit 'newName', name
    # else
    #   document.getElementById('warning').innerHTML = 'name is required!!!'
    #   socket.emit 'newName', ''

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
