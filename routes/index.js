const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  if (process.env.MAINTENANCE === "1" && req.query.password !== process.env.MAINTENANCE_PASSWORD) {
    return res.render('maintenance');
  } else {
    const options = {};

    if (req.query.projection) {
      options.projection = true
    }

    res.render('index', options);
  }
});

module.exports = router;
