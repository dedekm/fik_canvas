createError     = require('http-errors')
express         = require('express')
minify          = require('express-minify')
browserify      = require('browserify-middleware')
coffeeify       = require('coffeeify')
path            = require('path')
cookieParser    = require('cookie-parser')
logger          = require('morgan')
sassMiddleware  = require('node-sass-middleware')
socket_io       = require('socket.io')

# Express
app = express()

# Canvas
createCanvas = require('canvas').createCanvas
Canvas = require('canvas').Canvas
Paint = require('./src/javascripts/paint_tool.coffee')

canvas = createCanvas(500, 500)
tool = new Paint(canvas)

# Socket.io
app.io = socket_io()

app.io.on 'connection', (socket) ->
  console.log "a user #{socket.id} connected"

  # send current image
  socket.emit 'loadImage', canvas.toDataURL()

  # receive drawing data
  socket.on 'draw', (req) ->
    tool.draw req.positions, req.color, req.size
    socket.broadcast.emit 'draw', req

indexRouter = require('./routes/index')

# view engine setup
app.set 'views', path.join(__dirname, 'views')
app.set 'view engine', 'pug'
app.use logger('dev')
app.use express.json()
app.use express.urlencoded(extended: false)
app.use cookieParser()
app.use sassMiddleware(
  src: path.join(__dirname, 'src')
  dest: path.join(__dirname, 'public')
  indentedSyntax: true
  sourceMap: true
)

browserify.settings('transform', coffeeify)
app.get('/javascripts/base.js', browserify('./src/javascripts/base.coffee'))
app.use express.static(path.join(__dirname, 'public'))

app.use '/', indexRouter

# catch 404 and forward to error handler
app.use (req, res, next) ->
  next createError(404)
  return

# error handler
app.use (err, req, res, next) ->
  # set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = if req.app.get('env') == 'development' then err else {}
  # render the error page
  res.status err.status or 500
  res.render 'error'
  return

module.exports = app
