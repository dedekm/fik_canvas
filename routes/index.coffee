express = require 'express'

router = express.Router()

router.get '/', (req, res, next) ->
  if process.env.MAINTENANCE == "1" && req.query.password != process.env.MAINTENANCE_PASSWORD
    res.render 'maintenance'
  else
    if req.query.projection
      vars = { projection: true }
    else
      vars = {}

    res.render 'index', vars

module.exports = router
