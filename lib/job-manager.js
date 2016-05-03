var Agenda = require('agenda')
var mongoConnectionString = 'mongodb://mongo-agenda/agenda'
var agenda = new Agenda({db: {address: mongoConnectionString}})
var rp = require('request-promise')
var humanInterval = require('./human-interval')
var ObjectId = require('mongodb').ObjectId
var CronJob = require('cron').CronJob

agenda.define('webhook', function (job, done) {
  return rp({
    method: 'POST',
    uri: job.attrs.data.url,
    body: job.attrs.data.body,
    json: true
  }).then(function () {
    done()
  }).catch(function (err) {
    done(err)
  })
})

module.exports = {
  createJob: function (req, res) {
    if (req.body.url && req.body.scheduling && req.body.body) {
      var webhook = agenda.create('webhook', {url: req.body.url, body: req.body.body})
      try {
        var cron = new CronJob(req.body.scheduling)
        if (cron) {
          webhook.repeatEvery(req.body.scheduling)
          webhook.computeNextRunAt()
          webhook.save(function (err) {
            if (err) console.log('Job not created')
          })
          res.sendStatus(200)
        }
      } catch (err) {
        if (!isNaN(humanInterval(req.body.scheduling)) && humanInterval(req.body.scheduling) !== '') {
          webhook.schedule(req.body.scheduling)
          webhook.save(function (err) {
            if (err) console.log('Job not created')
          })
          res.sendStatus(200)
        }
        if (isNaN(humanInterval(req.body.scheduling))) {
          res.send(req.body.scheduling + ' is not a valid human readable time distance !')
        }
      }
    } else {
      res.render('error', {message: 'no parameters'})
    }
  },
  getAllJobs: function (req, res) {
    var jobsArray = []
    agenda.jobs((req.params.id) ? {_id: new ObjectId(req.params.id)} : {}, function (err, jobs) {
      if (err) console.log(err)
      if (jobs.length !== 0) {
        if (req.params.id) {
          if (jobs[0].attrs.data) {
            if (jobs[0].attrs.failReason) {
              jobsArray = [{
                name: jobs[0].attrs.name,
                id: jobs[0].attrs._id,
                url: jobs[0].attrs.data.url,
                body: JSON.stringify(jobs[0].attrs.data.body),
                lastRunAt: jobs[0].attrs.lastRunAt || '...',
                lastFinishedAt: jobs[0].attrs.lastFinishedAt || '...',
                nextRunAt: jobs[0].attrs.nextRunAt,
                status: 'failed - ' + jobs[0].attrs.failReason
              }]
            } else {
              if (jobs[0].attrs.nextRunAt === jobs[0].attrs.lastFinishedAt) {
                agenda.stop()
                jobsArray = [{
                  name: jobs[0].attrs.name,
                  id: jobs[0].attrs._id,
                  url: jobs[0].attrs.data.url,
                  body: JSON.stringify(jobs[0].attrs.data.body),
                  lastRunAt: jobs[0].attrs.lastRunAt || '...',
                  lastFinishedAt: jobs[0].attrs.lastFinishedAt || '...',
                  nextRunAt: '...',
                  status: 'completed'
                }]
              } else {
                jobsArray = [{
                  name: jobs[0].attrs.name,
                  id: jobs[0].attrs._id,
                  url: jobs[0].attrs.data.url,
                  body: JSON.stringify(jobs[0].attrs.data.body),
                  lastRunAt: jobs[0].attrs.lastRunAt || '...',
                  lastFinishedAt: jobs[0].attrs.lastFinishedAt || '...',
                  nextRunAt: jobs[0].attrs.nextRunAt,
                  repeatInterval: jobs[0].attrs.repeatInterval || '...',
                  status: 'scheduled'
                }]
              }
            }
          }
        } else {
          for (var i = 0; i < jobs.length; i++) {
            if (jobs[i].attrs.data) {
              if (jobs[i].attrs.failReason) {
                jobsArray[i] = {
                  name: jobs[i].attrs.name,
                  id: jobs[i].attrs._id,
                  url: jobs[i].attrs.data.url,
                  body: JSON.stringify(jobs[i].attrs.data.body),
                  lastRunAt: jobs[i].attrs.lastRunAt || '...',
                  lastFinishedAt: jobs[i].attrs.lastFinishedAt || '...',
                  nextRunAt: jobs[i].attrs.nextRunAt,
                  status: 'failed - ' + jobs[i].attrs.failReason
                }
              } else {
                if (jobs[i].attrs.nextRunAt === jobs[i].attrs.lastFinishedAt) {
                  agenda.stop()
                  jobsArray[i] = {
                    name: jobs[i].attrs.name,
                    id: jobs[i].attrs._id,
                    url: jobs[i].attrs.data.url,
                    body: JSON.stringify(jobs[i].attrs.data.body),
                    lastRunAt: jobs[i].attrs.lastRunAt || '...',
                    lastFinishedAt: jobs[i].attrs.lastFinishedAt || '...',
                    nextRunAt: '...',
                    status: 'completed'
                  }
                } else {
                  jobsArray[i] = {
                    name: jobs[i].attrs.name,
                    id: jobs[i].attrs._id,
                    url: jobs[i].attrs.data.url,
                    body: JSON.stringify(jobs[i].attrs.data.body),
                    lastRunAt: jobs[i].attrs.lastRunAt || '...',
                    lastFinishedAt: jobs[i].attrs.lastFinishedAt || '...',
                    nextRunAt: jobs[i].attrs.nextRunAt,
                    repeatInterval: jobs[i].attrs.repeatInterval || '...',
                    status: 'scheduled'
                  }
                }
              }
            }
          }
        }
      }
      if (req.url === '/') jobsArray.length === 0 ? res.render('index', {title: 'No jobs'}) : res.render('index', {jobs: jobsArray})
      if (req.url === '/webhooks') jobsArray.length === 0 ? res.status(200).json({}) : res.status(200).json(jobsArray)
      if (req.url === '/webhooks/' + req.params.id) jobsArray.length === 0 ? res.status(200).json({}) : res.status(200).json(jobsArray)
    })
  },
  updateJob: function (req, res) {
    if (req.params.id) {
      agenda.jobs({_id: new ObjectId(req.params.id)}, function (err, jobs) {
        if (err) console.log(err)
        if (jobs.length !== 0) {
          if (req.body) {
            jobs[0].attrs.data.url = req.body.url
            jobs[0].attrs.data.body = req.body.body
            jobs[0].attrs.repeatInterval = req.body.scheduling
            jobs[0].save()
          }
          res.sendStatus(200)
        } else {
          res.status(500).send('No Jobs')
        }
      })
    }
  },
  removeJobs: function (req, res) {
    if (req.params.id) {
      agenda.jobs({_id: new ObjectId(req.params.id)}, function (err, jobs) {
        if (err) console.log(err)
        if (jobs.length !== 0) {
          jobs[0].remove()
        }
        res.sendStatus(200)
      })
    } else {
      agenda.jobs({}, function (err, jobs) {
        if (err) console.log(err)
        if (jobs.length !== 0) {
          for (var i = 0; i < jobs.length; i++) {
            jobs[i].remove(function (err) {
              if (err) console.log(err)
              agenda.purge(function (err, numRemoved) {
                if (err) console.log(err)
                return
              })
            })
          }
        }
        res.sendStatus(200)
      })
    }
  },
  graceful: function () {
    console.log('\nbye')
    agenda.stop(function () {
      process.exit(0)
    })
  },
  start: function () {
    agenda.on('ready', function () {
      agenda.start()
    })
  }
}