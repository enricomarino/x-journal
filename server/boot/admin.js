module.exports = function (server) {

  var Author = server.models.Author;
  var author = Author.create({
    fullname: 'Admin',
    email: 'admin@example.com',
    password: '123',
    role: 'admin'
  });

};
