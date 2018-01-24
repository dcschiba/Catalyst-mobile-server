$(document).ready(function () {
  var url = 'https://catalyst-push.glitch.me/notification/devices';

  $.ajax({
    url: url,
    dataType: "json",
    success: function (data) {
      for (var i in data.devices) {
        $('#device').append($('<option></option>')
          .val(data.devices[i].uuid)
          .text(data.devices[i].uuid));
      }
    },
    error: function (err) {
      console.error(err);
      alert('connection error');
    },
  });
})

$('#post').click(function () {
  var data = {
    uuid: $('#topForm [name=uuid]').val(),
    title: $('#topForm [name=text-title]').val(),
    message: $('#topForm [name=text-body]').val(),
    path: $('#topForm [name=radio-path]:checked').val(),
    contents: $('#topForm [name=select-contents]').val(),
  };
  var url = 'https://catalyst-push.glitch.me/notification/send';
  $.ajax({
    url: url,
    type: 'post',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function () {
      alert('success');
    },
    error: function (err) {
      console.error(err);
      alert('connection error');
    },
  })
});

$('#topForm [name=radio-path]').change(function (e) {
  if (e.target.value === 'app/main') {
    $('#contents').prop('disabled', false);
  } else {
    $('#contents').prop('disabled', true);
  };
});
