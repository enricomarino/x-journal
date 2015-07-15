var DEBUG = true;

var async = require('async');
var faker = require('faker');
var request = require('request');
var fs = require('fs');

var categories_names = [
  // 'people',
  'sports',
  'animals',
  'business',
  'nature',
  'technics'
];

var author;
var token;
var categories = [];

var create_author = function (done) {
  DEBUG && console.log('creating author...');
  author = {
    email: faker.internet.email(),
    fullname: faker.name.findName(),
    password: '123'
  };

  setImmediate(done);
};


var create_category = function (name, done) {
  DEBUG && console.log('creating category...');
  var category = {
    name: name
  };

  categories.push(category);
  setImmediate(done, null, category);
};


var create_article = function (n, done) { // n is required due to the use of async.seq
  DEBUG && console.log('creating article...');
  var category_index = Math.floor(Math.random()*categories.length);
  var datetime = faker.date.past().toISOString();
  var article = {
    title: faker.lorem.sentence(),
    subtitle: faker.lorem.sentence(),
    summary: faker.lorem.paragraph(),
    content: faker.lorem.paragraphs(),
    created_at: datetime,
    updated_at: datetime,
    published_at: datetime,
    authorId: author.id,
    categoryId: categories[category_index].id
};

  // articles.push(article);
  setImmediate(done, null, article);
};


var create_image = function (article, done) {
  DEBUG && console.log('creating image...');
  var image = {
    filename: faker.lorem.words()[0] + '.jpeg',
    description: faker.lorem.sentence(),
    caption: faker.lorem.sentence(),
    filetype: "image/jpeg",
    container: "images"
  };

  setImmediate(done, null, image, article);
};

var post_author = function (done) {
  DEBUG && console.log('posting author...');
  request({
    method: 'POST',
    url:'http://localhost:3000/api/Authors',
    json: true,
    body: author
  }, function (error, response, body) {
    author.id = body && body.id;
    setImmediate(done, error);
  });
};

var login_author = function (done) {
  DEBUG && console.log('logging author...');
  request({
    method: 'POST',
    url: 'http://localhost:3000/api/Authors/login',
    body: {
      email: author.email,
      password: author.password
    },
    json: true
  }, function (error, response, body) {
    token = body && body.id;
    setImmediate(done, error);
  });
};

var post_category = function (category, done) {
  DEBUG && console.log('posting category...');
  request({
    method: 'POST',
    url: 'http://localhost:3000/api/Categories',
    body: category,
    json: true,
    headers: {
      'Authorization': token
    }
  }, function (error, response, body) {
    category.id = body && body.id;
    setImmediate(done, error);
  });
};

var post_article = function (article, done) {
  DEBUG && console.log('posting article...');
  request({
    method: 'POST',
    url: 'http://localhost:3000/api/Articles',
    body: article,
    json: true,
    headers: {
      'Authorization': token
    }
  }, function (error, response, body) {
    article.id = body && body.id;
    setImmediate(done, error, body);
  });
};

var post_image = function (image, article, done) {
  DEBUG && console.log('posting image...');
  request({
    method: 'POST',
    url: 'http://localhost:3000/api/Articles/' + article.id + '/image',
    body: image,
    json: true,
    headers: {
      'Authorization': token
    }
  }, function (error, response, body) {
    image = body;
    setImmediate(done, error, body, article);
  });
};

var upload_image = function (image, article, done) {
  DEBUG && console.log('uploading image...');
  var category = categories.filter(function (category) {
    return category.id === article.categoryId;
  })[0].name;

  async.retry({
    times: 500,
    interval: 200
  }, function (cb) {
    request({
      method: 'GET',
      url: 'http://lorempixel.com/1200/400/' + category
    })
    .on('error', cb)
    .on('end', function () {
          request({
            method: 'POST',
            url: 'http://localhost:3000' + image.signed_url,
            headers: {
              'Authorization': token
            },
            formData: {
              file: {
                value: fs.createReadStream('./images/' + image.filename),
                options: {
                  filename: image.filename,
                  contentType: image.filetype
                }
              }
            }
          })
          .on('error', cb)
          .on('end', cb);
      })
    .pipe(fs.createWriteStream('./images/' + image.filename));

  }, done);
};

var create_and_save_categories = function (done) {
  // async.each(categories_names, async.seq(
  async.eachLimit(categories_names, 4, async.seq(
    create_category,
    post_category
  ), done);

};

var create_and_save_articles = function (done) {
  // async.times(30, async.seq(
  async.timesLimit(100, 4, async.seq(
    create_article,
    post_article,
    create_image,
    post_image,
    upload_image
  ), done);
};

async.series([
  create_author,
  post_author,
  login_author,
  create_and_save_categories,
  create_and_save_articles
], function (err, res) {
  if (err) {
    console.log('ERROR :(');
    console.error(err);
  }

  console.log('DONE :)');
});
