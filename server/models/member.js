module.exports = function (Member) {

  Member.invite = function (email, role, done) {

    console.log('\n\n\tI have been invited\n\n');

    // if email is a valid email

    // if it is not already registered

    // generate invite model and JWT

    // save invite into DB

    // compose and send email

    Member.email.send({
      from: "x-journal <x-journal@something.com>", // sender address
      to: email,
      subject: "Hello", // Subject line
      text: "Hello world", // plaintext body
      html: "<b>Hello world</b>" // html body
    }, function (err) {
      setImmediate(done, err, {accepted: true});
    });
  };

  Member.remoteMethod(
    'invite',
    {
      http: {
        verb: 'post',
        path: '/invite'
      },
      accepts: [
        {arg: 'email', type: 'string'},
        {arg: 'role', type: 'string'}
      ],
      returns: {
        arg: 'dispatched',
        type: 'boolean'
      }
    }
  );


};
