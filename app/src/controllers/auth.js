const _ = require("lodash");
const async = require('async');
const mongoose = require("mongoose");
const User = mongoose.model("User");
const moment = require("moment");
const config = require('./../../config/index');
const jwt = require('jsonwebtoken');
const helper = require('sendgrid').mail;
const sg = require('sendgrid')(config.appConfig.sendgrid.apiKey);
const deeplink = require('node-deeplink');
const tokenHelper = require('../helpers/token');
const passwordHelper = require('../helpers/password');
const EmailTemplate = require('email-templates');
const sgTransport = require('nodemailer-sendgrid-transport');
const path = require('path');
const nodemailer = require('nodemailer');
const inlineCss = require('nodemailer-juice');
const sgMail = require('@sendgrid/mail');
const crypto = require("crypto");


function signIn(req, res, next) {
    User.authenticate(req.body.email, req.body.password, (err, user) => {
        if (err) {
            console.error(err);
            
            return res.status(400).json({
                code: "99",
                status: "error",
                success: false,
                message: 'Unable to authenticate user',
                error: {
                    name: err.name,
                    message: err.message
                }
            });
        }

        if (!user) {

            return res.status(400).json({
                code: "99",
                status: "error",
                success: false,
                message: 'Invalid email or password.'
            });

        }


        console.log('config.jwtSecret: ' + config.jwtSecret);

        let token = jwt.sign(user, config.jwtSecret, {
            expiresInMinutes: 1440 // expires in 24 hours
        });

        return res.json({
            code: '00',
            status: 'success',
            success: true,
            message: 'User authenticated successfully',
            data: {
                token: token
            }
        });

    });
}

function register(req, res, next) {
    console.log('--- reqgisterUser ---');
    let userData = _.pick(req.body, 'firstName', 'lastName', 'email', 'phoneNo', 'password', 'medium');

    console.log('--- userData ---');
    console.log(userData);

    async.waterfall([
        (callback) => {

            User.register(userData, (err, user) => {
                if (err && (11000 === err.code || 11001 === err.code)) {
                    console.error(err);

                    return callback({
                        name: "DuplicateEmail",
                        message: 'E-mail is already in use.'
                    });
                }

                if (err) {
                    console.error(err);
                    //return next(err);
                    return res.json({
                        code: '99',
                        status: 'error',
                        success: false,
                        message: 'Unable to register user'
                    });

                    return callback(err);

                }

                console.log('--- user ---');
                console.log(user);



                return callback(null, user);

            
            });
        },
        (user, callback) => {

            console.log('--- user ---');
            console.log(user);

            tokenHelper.generateRandomUnique(function (err, token) {
                console.log('--- err ---');
                console.log(err);
                console.log('---- token ----')
                console.log(token);

                return callback(null, token, user);

            });

        },
        (token, user, callback) => {

            user.verifyEmailToken = token;
            user.verifyEmailExpires = Date.now() + 3600000; // 1 hour

            User.update({
                _id: user.id
            }, {
                    verifyEmailToken: token,
                    verifyEmailExpires: Date.now() + 3600000
                }, (err, savedUser) => {
                    if (err) {
                        console.error(err);
                        callback(err);
                    }

                    console.log('--- savedUser ---');
                    console.log(savedUser);

                    return callback(null, token, user);
                })

            

        },
        (token, user, callback) => {

            console.log('--- Verify User Email ---');
            console.log('--- user ---');
            console.log(user);

            console.log("http://"+config.serverConfig.hostname+":"+config.serverConfig.port);


            var chars = "abcdefghijklmnopqrstuvwxyz1234567890";

            var fromEmail = new helper.Email('no-reply@email-verification.overwatch.com');
            var toEmail = new helper.Email(user.email);
            var subject = 'Over-Watch Email Verification';
            var content = new helper.Content('text/plain', 'You are receiving this because you (or someone else) just created an account on Over-Watch.\n\n' +
                'Please click on the following link, or paste this into your browser to verify your account:\n\n' +
                "http://"+config.serverConfig.hostname+":"+config.serverConfig.port + '/abldkcef'+ crypto.createHash('md5').update( chars + moment.now()).digest('base64') + "/" + token + '\n\n');

            var mail = new helper.Mail(fromEmail, subject, toEmail, content);

            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON()
            });

            sg.API(request, function (error, response) {
                if (error) {

                    console.log('Error response received');
                    console.log(error);

                    return res.json({
                        code: '99',
                        status: 'error',
                        success: false,
                        message: 'Unable to send email to user'
                    });
                }

                console.log(response.statusCode);
                console.log(response.body);
                console.log(response.headers);

                return callback(null, user);

                
            });

        }
    ], (err, user) => {
        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);

        if (err) {

            console.error(err);

            return res.json({
                code: '99',
                status: 'error',
                success: false,
                message: 'Unable to register user',
                data: {
                    error: err.name,
                    errorMessage: err.message
                }
            });
        }

        return res.json({
            code: '00',
            status: 'success',
            success: true,
            message: 'User registered successfully',
            data: {
                message: 'An e-mail has been sent to ' + user.email + ' with further instructions on verification.'
            }

        });

    })


}

function verifyUserEmail(req, res, next) {
    console.log('--- verifyUserEmail ---');
    console.log('--- req.params ---');
    console.log(req.params);


    async.waterfall([
        (callback) => {

            User.findOne({
                _id: req.params.userId,
                email: req.params.email
            }, (err, user) => {

                if (err) {
                    console.error(err);

                    callback(err);
                }

                if (!user) {

                    return res.status(400).json({
                        code: '99',
                        success: false,
                        status: 'error',
                        message: 'User does not exist.'
                    });

                }

                return callback(null, user);



            });

        },
        (user, callback) => {

            console.log('--- user ---');
            console.log(user);

            tokenHelper.generateRandomUnique(function (err, token) {
                console.log('--- err ---');
                console.log(err);
                console.log('---- token ----')
                console.log(token);

                return callback(null, token, user);

            });

        },
        (token, user, callback) => {

            user.verifyEmailToken = token;
            user.verifyEmailExpires = Date.now() + 3600000; // 1 hour

            user.save((err, saved) => {
                if (err) {
                    console.error(err);
                    callback(err);
                }

                return callback(null, saved);
            });

        },
        (user, callback) => {

            console.log('--- Verify User Email ---');
            console.log('--- user ---');
            console.log(user);

            var fromEmail = new helper.Email('no-reply@email-verification.overwatch.com');
            var toEmail = new helper.Email(user.email);
            var subject = 'Over-Watch Email Verification';
            var content = new helper.Content('text/plain', 'You are receiving this because you (or someone else) just created an account on Over-Watch.\n\n' +
                'Please click on the following link, or paste this into your browser to verify your account:\n\n' +
                config.baseUrl + '/verify-email/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n');

            var mail = new helper.Mail(fromEmail, subject, toEmail, content);

            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON()
            });

            sg.API(request, function (error, response) {
                if (error) {

                    console.log('Error response received');
                    console.log(error);

                    return res.json({
                        code: '99',
                        status: 'error',
                        success: false,
                        message: 'Unable to send email to user'
                    });
                }

                console.log(response.statusCode);
                console.log(response.body);
                console.log(response.headers);

                return callback(null, user);


            });

        }
    ], (err, user) => {
        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);

        if (err) {

            console.error(err);

            return res.json({
                code: '99',
                status: 'error',
                success: false,
                message: 'Unable to send email to user'
            });
        }

        return res.json({
            code: '00',
            status: 'success',
            success: true,
            message: 'User registered successfully',
            data: {
                message: 'An e-mail has been sent to ' + user.email + ' with further instructions on verification.'
            }

        });

    })


}

function verifyUserEmailWithToken(req, res, next) {
    console.log('--- verifyUserEmailWithToken ---');
    console.log('--- req.params ---');
    console.log(req.params);


    async.waterfall([
        (callback) => {

            User.findOne({
                $and: [{ verifyEmailToken: req.params.token }, { verifyEmailToken: { $gt: Date.now() } }]
            }, (err, user) => {

                if (err) {
                    console.error(err);

                    return callback(err);
                }

                if (!user) {

                    return res.status(400).json({
                        code: '99',
                        success: false,
                        status: 'error',
                        message: 'Email verification token is invalid or has expired.'
                    });

                }

                console.log('--- user ---');
                console.log(user);

                return callback(null, user);


            });
        },
        (user, callback) => {
            console.log('--- user ----');
            console.log(user);

            user.isActive = true;
            user.isVerified = true;

            user.save((err, savedUser) => {

                if (err) {
                    console.error(err);
                    return callback(err);
                }


                return callback(null, savedUser);

            })

        }

    ], (err, user) => {

        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);


        if (err) {
            console.error(err);
            return res.status(400).json({
                code: '99',
                success: false,
                status: 'error',
                message: 'Unable to verify email.',
                data: {
                    error: err.name,
                    errorMessage: err.message
                }
            });
        }

        let token = jwt.sign(user, config.jwtSecret, {
            expiresInMinutes: 1440 // expires in 24 hours
        });


        /* return res.redirect('/verify-email/deeplink?url=overwatchapp://overwatch.intelligentinnovations.co/verify-email?token=' + token
            + '&fallback=http://overwatch.com/verify?token=' + token);
 */
        return res.redirect('http://overwatch.com/verify?token=' + token);


    });

}

function forgotPassword(req, res, next) {
    console.log('--- forgotPassword ---');
    console.log('--- req.body ---');
    console.log(req.body);

    let userData = _.pick(req.body, 'email', 'phoneNo');
    console.log('--- userData ----');
    console.log(userData);

    async.waterfall([

        (callback) => {
            User.findOne({
                email: req.body.email
            }).exec((err, user) => {

                if (err) {
                    console.error(err);

                    return callback(err);
                }

                // no user found just return the empty user
                if (!user) {
                    return callback({
                        name: "NoUserFound",
                        message: "User does not exist"
                    });
                }

                return callback(null, user);


            })
        },
        (user, callback) => {
            console.log('--- user ---');
            console.log(user);

            tokenHelper.generateRandomUnique(function (err, token) {
                console.log('--- err ---');
                console.log(err);
                console.log('---- token ----')
                console.log(token);

                return callback(null, token, user);

            });

        },
        (token, user, callback) => {

            console.log('--- token ---');
            console.log(token);

            console.log('--- user ---');
            console.log(user);

            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

            user.save((err, saved) => {
                if (err) {
                    console.error(err);
                    return callback(err);
                }

                return callback(null, token, saved);
            });
        },
        (token, user, callback) => {
            console.log('--- user ---');
            console.log(user);

            console.log('--- config.baseUrl ---');
            console.log("http://"+config.serverConfig.hostname+":"+config.serverConfig.port);

            var chars = "abcdefghijklmnopqrstuvwxyz1234567890";

            var fromEmail = new helper.Email('no-reply@password-reset.overwatch.com');
            var toEmail = new helper.Email(user.email);
            var subject = 'Over-Watch Password Reset';
            var content = new helper.Content('text/plain', 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                "http://"+config.serverConfig.hostname+":"+config.serverConfig.port + '/rbstmajf'+ crypto.createHash('md5').update( chars + moment.now()).digest('base64') + "/"+ token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n');

            var mail = new helper.Mail(fromEmail, subject, toEmail, content);

            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON()
            });

            sg.API(request, function (error, response) {
                if (error) {

                    console.log('Error response received');
                    console.log(error);

                    return res.json({
                        code: '99',
                        status: 'error',
                        success: false,
                        message: 'Unable to send email to user'
                    });
                }

                console.log(response.statusCode);
                console.log(response.body);
                console.log(response.headers);

                return callback(null, user);




            });
        }

    ], (err, user) => {

        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);

        if (err) {
            console.error(err);

            return res.json({
                code: '99',
                status: 'error',
                success: false,
                message: 'Unable to register user',
                data: {
                    error: err.name,
                    errorMessage: err.message
                }
            });
        }


        return res.json({
            code: '00',
            status: 'success',
            success: true,
            message: 'An e-mail has been sent to ' + user.email + ' with further instructions.'
        });
    })


}


function resetPassword(req, res, next) {
    console.log('--- reesetPassword ---');
    console.log('--- req.params ---');
    console.log(req.params);

    let token = req.params.token;

    User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    }, (err, user) => {
        if (!user) {

            return res.json({
                status: false,
                message: 'Password reset token is invalid or has expired.'
            });

        }

        /* return res.redirect('/reset-password/deeplink?url=overwatchapp://overwatch.intelligentinnovations.co/forgotpassword?token=' + token
            + '&fallback=http://overwatch.com/reset-password?token=' + token);
 */
        return res.redirect('http://overwatch.com/reset?token=' + token);


    });
}

function changePassword(req, res, next) {
    console.log('--- changePassword ---');
    console.log('--- req.body ---');
    console.log(req.body);

    User.changePassword(req.body.oldPassword, req.body.newPassword, (err, user) => {
        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);

        if (err) {
            console.error(err);

            return res.json({
                code: '99',
                success: false,
                status: "error",
                message: 'Unable to change your password.',
                data: {
                    error: err.name,
                    errorMessage: err.message
                }
            });


        }

        return res.json({
            code: '00',
            status: 'success',
            success: true,
            message: 'Your password has been changed successfully.'
        });

    })


}

function changePasswordWithToken(req, res, next) {
    console.log('--- changePassword ---');
    console.log('--- req.params ---');
    console.log(req.params);

    console.log('--- req.body ---');
    console.log(req.body);

    let token = req.params.token

    async.waterfall([
        function (callback) {
            User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            }, (err, user) => {

                if (err) {
                    console.error(err);
                    return callback(err);
                }
                if (!user) {

                    return callback({
                        name: 'InvalidToken',
                        message: 'Password reset token is invalid or has expired.'
                    });

                }

                return callback(null, user);


            });
        },
        (user, callback) => {
            console.log('--- user ----');
            console.log(user);

            passwordHelper.hash(req.body.password, (err, hashedPassword, salt) => {
                user.password = hashedPassword;
                user.passwordSalt = salt;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save((err, saved) => {
                    if (err) {
                        console.error(err);

                        return callback(err);

                    } else {

                        return callback(null, user);
                    }

                });

            });

        },
        (user, callback) => {
            console.log('--- user ---');
            console.log(user);

            var fromEmail = new helper.Email('no-reply@password-reset.overwatch.com');
            var toEmail = new helper.Email(user.email);
            var subject = 'Your Over-Watch password has been changed';
            var content = new helper.Content('text/plain', 'This is a confirmation that the password for your account ' + user.email + ' has just been changed.');

            var mail = new helper.Mail(fromEmail, subject, toEmail, content);

            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON()
            });

            sg.API(request, function (error, response) {
                if (error) {
                    console.log('Error response received');
                    console.error(error);

                    return res.json({
                        code: '99',
                        status: 'error',
                        success: false,
                        message: 'Unable to send email to user'
                    });
                }

                console.log(response.statusCode);
                console.log(response.body);
                console.log(response.headers);
                return callback(null, user);
            });
        }
    ], (err, user) => {
        console.log('--- err ---');
        console.log(err);

        console.log('--- user ---');
        console.log(user);

        if (err) {
            console.error(err);
            return res.json({
                code: '99',
                success: false,
                status: "error",
                message: 'Unable to change your password.',
                data: {
                    error: err.name,
                    errorMessage: err.message
                }
            });
        }

        return res.json({
            code: '00',
            success: true,
            status: 'success',
            message: 'Success! Your password has been changed.'
        });
    });
}

module.exports = Object.assign({}, {signIn, register, changePassword, changePasswordWithToken, forgotPassword, resetPassword, verifyUserEmail, verifyUserEmailWithToken});