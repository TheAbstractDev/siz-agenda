/* global $, moment */

var lang = window.navigator.userLanguage || window.navigator.language
moment.lang(lang)

$('.next').hide()
$('.last-run').hide()
$('.last-finished').hide()

function localeDate (element) {
  var localTime = moment.utc(element.text()).toDate()
  return moment(localTime).calendar()
}

$('.next').each(function () {
  $(this).text(localeDate($(this)))
})

$('.next').show()

if ($('last-run') && $('.last-run').text() !== '' && $('.last-run').text() !== '...') {
  $('.last-run').each(function () {
    $(this).text(localeDate($(this)))
  })
}
$('.last-run').show()

if ($('last-finished') && $('.last-finished').text() !== '' && $('.last-finished').text() !== '...') {
  $('.last-finished').each(function () {
    $(this).text(localeDate($(this)))
  })
}
$('.last-finished').show()

$('.status').each(function () {
  if ($(this).text() === 'completed') $('.status').addClass('success')
  if ($(this).text() === 'scheduled') $('.status').addClass('pending')
  if ($(this).text()[0] === 'f') $('.status').addClass('failed')
})

$('.removeAll').click(function (e) {
  e.preventDefault()
  $.ajax({
    url: 'http://localhost:8080/webhook',
    type: 'DELETE'
  })
  setInterval(function () {
    window.location = '/'
  }, 10000)
})

$('.remove').click(function (e) {
  e.preventDefault()
  $.ajax({
    url: 'http://localhost:8080/webhook/' + $(this).data('name'),
    type: 'DELETE'
  })
  setInterval(function () {
    window.location = '/'
  }, 10000)
})

$('.create').click(function (e) {
  e.preventDefault($('.body').val())
  $.ajax({
    url: 'http://localhost:8080/webhook/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      'url': $('.url').val(),
      'scheduling': $('.scheduling').val(),
      'body': $('.body').val()
    })
  })
  setInterval(function () {
    window.location = '/'
  }, 10000)
})
