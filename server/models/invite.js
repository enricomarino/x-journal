var loopback = require('loopback');
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

  var getCurrentUserId = function () {
    var ctx = loopback.getCurrentContext();
    var accessToken = ctx && ctx.get('accessToken');
    var userId = accessToken && accessToken.userId;
    return userId;
  };

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
      return cb(null, complete);
    };
  };

  var complete = function (invite) {
    return function (done) {
      var expiresAt = moment().add(invite.expiresIn, 'd').toDate();
      var payload = {
        invite_id: invite.id,
        expiresAt: expiresAt,
        email: invite.email,
        role: invite.role,
        status: invite.status
      };
      var token = jwt.encode(payload, process.env.SECRET);
      invite.expiresAt = expiresAt;
      invite.token = token;
      invite.url = encodeURI(template_url(invite));
      invite.senderId = getCurrentUserId();
      setImmediate(done);
    };
  };

  var retrieve_invite = function (x_data, id) {
    return function (next) {
      Invite.findById(id, function (err, invite) {
        x_data.invite = invite;
        setImmediate(next, err);
      });
    }
  };

  var check_invite = function (x_data) {
    return function (next) {
      var error = null;
      if (!x_data.invite) {
        error = {
          code: 10,
          message: 'Invalid invite id.',
        };
      }
      setImmediate(next, error);
    }
  };

  var check_status = function (x_data, status) {
    return function (next) {
      var error = null;
      if (x_data.invite.status !== status) {
        error = {
          code: 11,
          mesage: 'Invalide invite status'
        };
      }
      setImmediate(next, error);
    };
  };

  var revoke_invite = function (x_data) {
    return function (next) {
      x_data.invite.updateAttribute('status', 'revoked', function (err, invite) {
        setImmediate(next, err, true);
      });
    };
  };

  Invite.afterRemote('create', function( ctx, invite, next) {
    async.waterfall([
      if_async.not(is_complete(invite))
        .then(async.seq(
            complete(invite),
            invite.save.bind(invite)
        )),
      send_email
    ], next);
  });

  /**
   * resend
   */

  Invite.resend = function (id, cb) {
    var x_data = {};

    async.waterfall([
      retrieve_invite(x_data, id),
      check_invite(x_data),
      check_status(x_data, 'pending'),
      function (next) { setImmediate(next, null, x_data.invite); },
      send_email
    ], done);
  };

  Invite.remoteMethod(
      'resend',
      {
        accepts: {arg: 'id', type: 'string', required: true},
        http: {
          path: '/:id/resend',
          verb: 'post'
        },
        returns: {arg: 'ok', type: 'boolean'}
      }
  );

  /**
   * revoke
   */

  Invite.revoke = function (id, done) {
    var x_data = {};

    async.waterfall([
      retrieve_invite(x_data, id),
      check_invite(x_data),
      check_status(x_data, 'pending'),
      revoke_invite(x_data)
    ], done);

  };

  Invite.remoteMethod(
      'revoke',
      {
        accepts: {arg: 'id', type: 'string', required: true},
        http: {
          path: '/:id/revoke',
          verb: 'post'
        },
        returns: {arg: 'ok', type: 'boolean'}
      }
  );

};
