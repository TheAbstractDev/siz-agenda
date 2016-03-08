var express = require('express')
var bodyParser = require('body-parser')
var ip = process.env.IP || 'localhost'
var hbs = require('hbs')
var path = require('path')
var _ = require('lodash')
var fs = require('fs')
var md5 = require('md5')
var app = express()
var JobManager = require('./job-manager')

// view engine setup
hbs.registerHelper('assets', (process.env.NODE_ENV === 'production' ? _.memoize : _.identity)(function (filePath) {
  var file = fs.readFileSync('assets' + (process.env.NODE_ENV === 'production' ? '/prod' : '/dev') + filePath, 'utf8')
  return '/assets' + filePath + '?v=' + md5(file).substring(10, 0)
}))

app.use('/assets/', express.static(path.join(__dirname, '/assets', process.env.NODE_ENV === 'production' ? 'prod' : 'dev')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'hbs')

app.get('/', function (req, res) {
  JobManager.getAllJobs(function (data) {
    data.length === 0 ? res.render('index', {title: 'No jobs'}) : res.render('index', {jobs: data})
  })
})

app.post('/webhook', function (req, res) {
  if (req.body.url && req.body.scheduling && req.body.body) {
    var url = req.body.url
    var scheduling = req.body.scheduling
    var body = req.body.body
    var jobID = md5(url).substring(5, 0)

    if (req.body.repeat === 'true') {
      JobManager.schedulejobEvery(jobID, url, body, scheduling)
    } else if (req.body.repeat === 'false') {
      JobManager.scheduleJobOnceAt(jobID, url, body, scheduling)
    } else {
      res.render('error', {message: 'repeat must be true or false'})
    }
    res.sendStatus(200)
  } else {
    res.render('error', {message: 'no parameters'})
  }
})

app.delete('/webhook', function (req, res) {
  JobManager.removeAllJobs()
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
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
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

app.listen(8080, function () {
  if (ip === 'localhost' || ip[0] === '1') {
    console.log('Server running on http://' + ip + ':8080')
  } else if (ip !== 'localhost' && ip[0] !== '1') {
    console.error('Your ip address is not valid')
    process.exit(1)
  }
})
