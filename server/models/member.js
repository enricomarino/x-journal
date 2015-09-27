var async = require('async');
var moment = require('moment');
var jwt = require('jwt-simple');

var email_re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

module.exports = function (Member) {

  var x_ = function (f) {
    return function (x_data) {
      return function (done) {
        f(x_data, arguments[arguments.length - 1]);
      };
    };
  };

  var decode_token = function (x_data, done) {
    var token = x_data.token;
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

  var valid_token = function (x_data, done) {
    var token = x_data.decoded_token;
    var error = null;
    if (token.status !== 'pending') {
      error = {
        code: 5,
        message: 'Token status not valid.'
      }
    }
    if (moment().isAfter(token.expiresAt)) {
      error = {
        code: 6,
        message: 'Your token is expired.'
      }
    }
    setImmediate(done, error);
  };

  var valid_email = function (x_data, done) {
    var email = x_data.email
    var is_valid = email_re.exec(email);
    var error = is_valid ? null : {
      code: 2,
      message: 'Invalid email address.'
    };
    setImmediate(done, error);
  };

  var not_registered = function (x_data, done) {
    var email = x_data.email;
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

  var retrieve_invite = function (x_data, done) {
    var invite_id = x_data.decoded_token.invite_id;
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

  var prepare_body = function (x_data, done) {
    x_data.body.role = x_data.decoded_token.role;
    setImmediate(done);
  };

  Member.beforeRemote('create', function (ctx, none, next) {
    var body = ctx.req.body;
    var email = body.email;
    var token = body.token;
    var x_data = ctx.x_data = {
      token: token,
      email: email,
      body: body
    };

    async.waterfall([
      x_(decode_token)(x_data),
      x_(valid_token)(x_data),
      x_(valid_email)(x_data),
      x_(not_registered)(x_data),
      x_(retrieve_invite)(x_data),
      x_(prepare_body)(x_data, body),
    ], next);
  });

  var retrieve_role = function (x_data, done) {
    Member.app.models.Role.findOne({where: {name: x_data.member.role}}, function (err, role) {
      x_data.role = role;
      setImmediate(done, err);
    });
  };

  var assign_role = function  (x_data, done) {
    x_data.role.principals.create({
      principalType: Member.app.models.RoleMapping.USER,
      principalId: x_data.member.id
    }, done);
  };

  var update_invite = function (x_data, done) {
    x_data.invite.updateAttributes({
      'status': 'accepted',
      'acceptedAt': new Date()
    }, done);
  };

  Member.afterRemote('create', function (ctx, member, next) {
    var x_data = ctx.x_data;
    x_data.member = member;

    async.waterfall([
      x_(retrieve_role)(x_data),
      x_(assign_role)(x_data),
      x_(update_invite)(x_data)
    ], next);

  });
};
