var async = require('async');

module.exports = function (server, done) {

  var Role = server.models.Role;

  var create_role = function (name) {
    return function (next) {
      // add role only if it not exists
      Role.findOne({where: {name: name}}, function (err, role) {
        if (err || role) {
          setImmediate(next, err);
          return;
        }

        Role.create({ name: name }, next);
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
