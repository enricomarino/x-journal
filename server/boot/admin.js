module.exports = function (server) {

  var Author = server.models.Author;
  var author = Author.create({
    email: 'admin@example.com',
    password: '123',
    role: 'admin'
  });

};
