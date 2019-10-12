const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const serveStatic = require('serve-static');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const config = require('./index');
const express = require('express');
const moment = require('moment-timezone');
const http = require('http');


const startExpress = (options) => {

    console.log("options --> ", options)

    console.log('options.port: '+options.port);
    console.log('options.hostname: '+options.hostname);

    const app = express();

    app.set('config', config);
    app.set('root', options.root);
    app.set('env', options.env);

    console.log('sets timezone to Africa/Lagos');

    moment.tz.setDefault("Africa/Lagos");

    console.log('moment().format()', moment().format());

    const root = app.get('root');
    const sessionOpts = {
        secret: options.session.secret,
        key: 'skey.sid',
        resave: options.session.resave,
        saveUninitialized: options.session.saveUninitialized
    };

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(methodOverride());
    app.disable('x-powered-by');

    if (options.session.type === 'mongo') {
        sessionOpts.store = new MongoStore({
            url: options.dbUri
        });
    }

    app.use(session(sessionOpts));

    app.use(function (req, res, next) {

        res.locals.app = config.app;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');

        next();
    });


    if (config.serveStatic) {
        app.use(serveStatic(path.join(root, 'public')));
    }

    require('./models').init(app);
    require('./routes').init(app);


    const server = http.createServer(app);

    server.listen(
        options.port,
        options.hostname,
        () => {
            console.log(`${options.appName} is running`);
            console.log(`   listening on port: ${options.port}`);
            console.log(`   environment: ${options.env.toLowerCase()}`);
        }
    );
}

module.exports = Object.assign({}, {startExpress})
