require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const socket_io = require('socket.io');
const date = require('date-and-time');
const fs = require('fs');

const app = express();

const Canvas = require('canvas');
const Paint = require('./src/javascripts/paint_tool.js');

const dir = './images';

const images = fs.readdirSync(dir)
                 .filter((file) => {
                   return file.match(/.*\.png/) && fs.lstatSync(path.join(dir, file)).isFile();
                 }).map((file) => {
                   return {
                     file: file,
                     mtime: fs.lstatSync(path.join(dir, file)).mtime
                   };
                 }).sort((a, b) => {
                   return b.mtime.getTime() - a.mtime.getTime();
                 });

const canvas = Canvas.createCanvas(700, 700);
canvas.dirty = false;

const ctx = canvas.getContext('2d');

if (images[0]) {
  img = new Canvas.Image;
  img.onload = () => {
    return ctx.drawImage(img, 0, 0);
  }
  img.src = dir + "/" + images[0].file;
} else {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const tool = new Paint(canvas);

function saveImage() {
  if (!canvas.dirty) {
    return;
  }

  console.log('saving canvas...');

  const filename = date.format(new Date(), 'fik_YYYY-MM-DD_HH-mm-ss.png');
  const out = fs.createWriteStream(__dirname + "/images/" + filename);
  const stream = canvas.pngStream();

  stream.on('data', (chunk) => {
    out.write(chunk);
  });

  stream.on('end', () => {
    canvas.dirty = false;
    console.log("saved canvas to " + filename);
  });
};

if (process.env.SAVE_IMAGES_ENABLED) {
  setInterval(saveImage, (process.env.SAVE_IMAGES_INTERVAL || 60) * 1000);
}

app.io = socket_io();

app.io.on('connection', (socket) => {
  console.log("a user " + socket.id + " connected");

  socket.emit('loadImage', canvas.toDataURL());

  socket.on('draw', (req) => {
    tool.draw(req.positions, req.color, req.size);
    socket.broadcast.emit('draw', req);
    canvas.dirty = true;
  });
});

const indexRouter = require('./routes/index');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter);

// app.use((req, res, next) => {
//   next(createError(404));
// });

// app.use((err, req, res, next) => {
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
