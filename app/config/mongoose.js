const mongoose = require("mongoose");


const connectMongoose = (options) => {
    
    var mongoUri = options.uri;

    mongoose.connect(mongoUri);

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);

    return mongoose;
};

function cleanup() {
    mongoose.connection.close(function () {
        console.log('Closing DB connections and stopping the app. Bye bye.');
        process.exit(0);
    });
}

module.exports = Object.assign({}, {connectMongoose});