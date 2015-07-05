module.exports = function mountRestApi(server) {

  var email_connector = server.dataSources.Email.connector;
  var email_options = email_connector.transportForName('smtp').transporter.options;
  email_options.auth = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  };

  var restApiRoot = server.get('restApiRoot');
  server.use(restApiRoot, server.loopback.rest());
};
