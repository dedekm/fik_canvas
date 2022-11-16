express = require 'express'

router = express.Router()

router.get '/', (req, res, next) ->
  console.log req.query.password != process.env.MAINTENANCE_PASSWORD
  if process.env.MAINTENANCE == "1" && req.query.password != process.env.MAINTENANCE_PASSWORD
    res.render 'maintenance'
  else
    res.render 'index'

module.exports = router
