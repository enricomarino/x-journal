var async = require('async');
var jwt = require('jwt-simple');

var email_re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

module.exports = function (Member) {


  var decode_token = function (x_data, token) {
    return function (done) {
      try {
        x_data.decoded_token = jwt.decode(token, process.env.SECRET);
      } catch (e) {
        setImmediate(done, {
          code: 1,
          message: 'Invalid token.'
        });
      }
      setImmediate(done);
    };
  };

  var valid_email = function (email) {
    return function (done) {
      var is_valid = email_re.exec(email);
      var error = is_valid ? null : {
        code: 2,
        message: 'Invalid email address.'
      };
      setImmediate(done, error);
    };
  };

  var not_registered = function (email) {
    return function (done) {
      Member.findOne({where: {email: email}}, function (err, member) {
        var error = null;
        if (member) {
          error = {
            code: 3,
            message: 'Email already registered.'
          }
        }

        setImmediate(done, err || error);
      });
    };
  };

  var retrieve_invite = function (x_data) {
    return function (done) {
      console.log(x_data);
      var invite_id = x_data.decoded_token.invite_id;
      console.log(invite_id);
      Member.app.models.Invite.findById(invite_id, function (err, invite) {
        var error = null;
        if (!invite) {
          error = {
            code: 4,
            message: 'Invite not valid.'
          }
        }

        x_data.invite = invite;
        setImmediate(done, err || error);
      });
    };
  };

  var prepare_body = function (x_data, body) {
    return function (done) {
      body.role = x_data.decoded_token.role;
      setImmediate(done);
    };
  };

  Member.beforeRemote('create', function (ctx, none, next) {
    var body = ctx.req.body;
    var email = body.email;
    var token = body.token;
    var x_data = ctx.x_data = {};

    async.waterfall([
      decode_token(x_data, token),
      valid_email(email),
      not_registered(email),
      retrieve_invite(x_data),
      prepare_body(x_data, body),
    ], next);
  });

  Member.afterRemote('create', function (ctx, member, next) {
    ctx.x_data.invite.updateAttributes({
      'status': 'accepted',
      'acceptedAt': new Date()
    }, next);
  });
};
