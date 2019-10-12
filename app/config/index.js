
const ENV = process.env.NODE_ENV || 'development';

const  {dbConfig, serverConfig, appConfig} = require('./environments/'+ENV.toLowerCase());

module.exports = Object.assign({}, {dbConfig, serverConfig, appConfig});