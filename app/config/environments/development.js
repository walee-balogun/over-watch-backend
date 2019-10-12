const dbConfig = {
    db: process.env || 'over-watch-db',
    hostname: process.env.DB_HOST || '',
    user: process.env.DB_USER || '',
    pass: process.env.DB_PASS || '',
    uri: process.env.DB_URI || 'mongodb://127.0.0.1:27017/over-watch-db',
    repl: process.env.DB_REPLS || 'rs1',
    servers: (process.env.DB_SERVERS) ? process.env.DB_SERVERS.split(' ') : [
        '127.0.0.1:27017'
    ],
};

const serverConfig = {
    port: process.env.PORT || 3000,
    hostname: process.env.HOST || '',
    jwtSecret: '',
    serverStatic: true,
    session: {
        type: 'mongo',
        secret: 'someVeRyN1c3S#cr3tHer34U',
        resave: false,
        saveUninitialized: true
    }
};

const appConfig = {
    name: "Over Watch"
};


module.exports = Object.assign({}, {dbConfig, serverConfig, appConfig});