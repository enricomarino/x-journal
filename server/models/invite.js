var jwt = require('jwt-simple');
var moment = require('moment');
var minstache = require('minstache');
var async = require('async');
var if_async = require('if-async');

var base_url = 'http://localhost:3000/admin/signup';

var url = base_url + '?token={{token}}&email={{email}}';
var email_text = "Hello there,\n\n you have been invited to take part in x-journal as {{role}}.\n\nTo accept the invitation follow this link: {{url}}";
var email_html = "<div><p>Hello there,</p><p>you have been invited to take part in x-journal as {{role}}.</p><p>To accept the invitation follow this link: <a href=\"{{url}}\">{{url}}</a><div>";

var template_url = minstache.compile(url);
var template_text = minstache.compile(email_text);
var template_html = minstache.compile(email_html);

module.exports = function (Invite) {

  var send_email = function (invite, next) {
    var text = template_text(invite);
    var html = template_html(invite);

    console.log("send_email", invite);

    Invite.app.models.Email.send({
      from: "x-journal <x-journal@something.com>",
      to: invite.email,
      subject: "Invitation to partecipate in x-journal",
      text: text,
      html: html
    }, next);
  };

  var is_complete = function (invite) {
    return function (cb) {
      var complete = invite.url !== undefined &&
                     invite.exiration !== undefined &&
                     invite.token !== undefined;
      console.log("is_complete", complete);
      return cb(null, complete);
    };
  };

  var comlpete = function (invite) {
    return function (done) {
      var expiresAt = moment().add(invite.expiresIn, 'd').toDate();
      var payload = {
        invite_id: invite.id,
        expiresAt: expiresAt,
        email: invite.email,
        role: invite.role
      };
      var token = jwt.encode(payload, process.env.SECRET);
      invite.expiresAt = expiresAt;
      invite.token = token;
      invite.url = encodeURI(template_url(invite));
      setImmediate(done);
    };
  };

  Invite.afterRemote('create', function( ctx, invite, next) {
    async.waterfall([
      if_async.not(is_complete(invite))
        .then(async.seq(
            comlpete(invite),
            invite.save.bind(invite)
        )),
      send_email
    ], next);
  });

};
