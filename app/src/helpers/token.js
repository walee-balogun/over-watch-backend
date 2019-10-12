'use strict';

const crypto = require('crypto');
const len = 512;
const iterations = 18000;
const digest = 'sha256';


function generateRandomUnique(callback) {

    crypto.randomBytes(20, (err, buf) => {

        if (err) {
            console.error(err);
        }

        let token = buf.toString('hex');
        console.log('---- token ----')
        console.log(token);
        callback(err, token);
    });
}

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

module.exports = Object.assign({}, {generateRandomUnique, randomString});