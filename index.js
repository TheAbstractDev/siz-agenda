var express = require('express')
var bodyParser = require('body-parser')
var ip = process.env.IP || 'localhost'
var hbs = require('hbs')
var path = require('path')
var _ = require('lodash')
var fs = require('fs')
var md5 = require('md5')
var app = express()
var WebhooksManager = require('./lib/webhooks-manager')

// view engine setup
hbs.registerHelper('assets', (process.env.NODE_ENV === 'production' ? _.memoize : _.identity)(function (filePath) {
  var file = fs.readFileSync('assets' + (process.env.NODE_ENV === 'production' ? '/prod' : '/dev') + filePath, 'utf8')
  return '/assets' + filePath + '?v=' + md5(file).substring(10, 0)
}))

app.use('/assets/', express.static(path.join(__dirname, '/assets', process.env.NODE_ENV === 'production' ? 'prod' : 'dev')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'hbs')

process.on('SIGTERM', WebhooksManager.graceful)
process.on('SIGINT', WebhooksManager.graceful)

WebhooksManager.start()

app.get('/', WebhooksManager.getWebhooks)

app.get('/webhooks', WebhooksManager.getWebhooks)

app.get('/webhooks/:id', WebhooksManager.getWebhooks)

app.post('/webhooks', WebhooksManager.createWebhooks)

app.put('/webhooks/:id', WebhooksManager.updateWebhooks)

app.delete('/webhooks/:id', WebhooksManager.removeWebhooks)

app.delete('/webhooks', WebhooksManager.removeWebhooks)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

app.listen(process.env.PORT || 8080, function () {
  if (ip === 'localhost' || ip[0] === '1') {
    console.log('Server running on http://' + ip + ':' + (process.env.PORT || 8080))
  } else if (ip !== 'localhost' && ip[0] !== '1') {
    console.error('Your ip address is not valid')
    process.exit(1)
  }
})
