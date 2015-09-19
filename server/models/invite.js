var jwt = require('jwt-simple');
var moment = require('moment');
var minstache = require('minstache');
var async = require('async');
var if_async = require('if-async');

var duration = 7; // days
var base_url = 'http://localhost:3000/admin/signup?token=';

var email_text = "Hello there,\n\n you have been invited to take part in x-journal as {{role}}.\n\nTo accept the invitation follow this link: {{url}}";
var email_html = "<div><p>Hello there,</p><p>you have been invited to take part in x-journal as {{role}}.</p><p>To accept the invitation follow this link: <a href=\"{{url}}\">{{url}}</a><div>";

var template_text = minstache.compile(email_text);
var template_html = minstache.compile(email_html);

module.exports = function (Invite) {

  var send_email = function (invite) {
    var text = template_text(invite);
    var html = template_html(invite);

    return function (next) {
        Invite.app.models.Email.send({
        from: "x-journal <x-journal@something.com>", // sender address
        to: invite.email,
        subject: "Invitation to partecipate in x-journal",
        text: text,
        html: html
      }, next);
    };
  };

  var not_complete = function (invite) {
    return function (cb) {
      var not_complete = invite.url === undefined ||
                         invite.exiration === undefined ||
                         invite.token === undefined;
      return cb(null, not_complete);
    };
  };

  var comlpete_invite = function (invite) {
    return function (done) {
      var url = base_url + token;
      var expiration = moment().add(duration, 'd').toDate();
      var payload = {
        invitation_id: invite._id,
        expiration: expiration,
        email: invite.email,
        url: url
      };
      var token = jwt.encode(payload, process.env.SECRET);
      invite.expiration = expiration;
      invite.url = base_url + token;
      invite.token = token;
      setImmediate(done);
    };
  };

  Invite.afterRemote('create', function( ctx, invite, next) {
    async.waterfall([
      if_async(not_complete(invite)).then(async.seq(comlpete_invite, invite.update)),
      send_email(invite)
    ], next);
  });

};
