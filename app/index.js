
const ENV = process.env.NODE_ENV || 'development';

const config = require('./config');

const server = require('./config/server');

require('./config/mongoose').connectMongoose(config.dbConfig);

server.startExpress({
    appName: config.appConfig.name,
    port: config.serverConfig.port,
    hostname: config.serverConfig.hostname,
    session: config.serverConfig.session,
    dbUri: config.dbConfig.uri,
    env: ENV,
    root: __dirname
});
