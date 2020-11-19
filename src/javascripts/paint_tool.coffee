drawPixels = (ctx, x, y, size) ->
  ctx.fillRect roundToPixel(x, size) - (size / 2), roundToPixel(y, size) - (size / 2), size, size

roundToPixel = (n, size) ->
  Math.floor(n / size) * size

class PaintTool

  ALLOWED_COLORS =
    black: "#000000"
    blue: "#0000ff"
    green: "#00ff00"
    white: "#ffffff"

  ALLOWED_SIZES = [ 2, 4, 8 ]

  constructor: (canvas) ->
    @canvas = canvas
    @ctx = @canvas.getContext('2d')
    @size = 4
    @color = 'black'

  setColor: (color) ->
    @color = color

  setSize: (size) ->
    return if ALLOWED_SIZES.indexOf(size) == -1
    @size = size

  hexColor: (color) ->
    color ||= @color
    ALLOWED_COLORS[color]

  bline: (x0, y0, x1, y1, size) ->
    dx = Math.abs(x1 - x0)
    sx = if x0 < x1 then 1 else -1
    dy = Math.abs(y1 - y0)
    sy = if y0 < y1 then 1 else -1
    err = (if dx > dy then dx else -dy) / 2

    loop
      drawPixels @ctx, x0, y0, size
      if x0 == x1 and y0 == y1
        break
      e2 = err
      if e2 > -dx
        err -= dy
        x0 += sx
      if e2 < dy
        err += dx
        y0 += sy

  draw: (positions, color, size) ->
    @ctx.fillStyle = @hexColor(color)
    size ||= @size
    start = positions[0]
    drawPixels @ctx, start.x, start.y, size

    return if positions.length == 1

    for i in [1...positions.length]
      previous = positions[i - 1]
      current = positions[i]
      @bline previous.x, previous.y, current.x, current.y, size

module.exports = PaintTool
