var async = require('async');

module.exports = function (server, done) {

  var Role = server.models.Role;

  var create_role = function (name) {
    return function (next) {
      Role.create({ name: name }, function (err) {
        setImmediate(next, err);
      });
    };
  };

  // create roles
  async.waterfall([
    create_role('admin'),
    create_role('editor'),
    create_role('author'),
  ], done);

};


