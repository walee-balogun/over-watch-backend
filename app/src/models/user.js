const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passwordHelper = require('../helpers/password');
const tokenHelper = require('../helpers/token');
const _ = require('lodash');


const UserSchema = new Schema({
    firstName: {
        type: String,
        trim: true,
    },
    lastName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    phoneNo: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    passwordSalt: {
        type: String,
        required: true,
        select: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    medium: {
        type: String,
        trim: true
    },
    verifyEmailToken: {
        type: String,
        trim: true
    },
    verifyEmailExpires: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
        trim: true
    },
    resetPasswordExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

UserSchema.statics.authenticate = authenticateUser;
UserSchema.statics.register = registerUser;
UserSchema.methods.changePassword = changeUserPassword;


function authenticateUser(email, password, callback) {
    this
        .findOne({ email: email })
        .select('+password +passwordSalt')
        .exec((err, user) => {
            if (err) {
                return callback(err, null);
            }

            // no user found just return the empty user
            if (!user) {
                return callback(err, user);
            }

            // verify the password with the existing hash from the user
            passwordHelper.verify(
                password,
                user.password,
                user.passwordSalt,
                (err, result) => {
                    if (err) {
                        return callback(err, null);
                    }

                    // if password does not match don't return user
                    if (result === false) {
                        return callback(err, null);
                    }

                    // remove password and salt from the result
                    user.password = undefined;
                    user.passwordSalt = undefined;
                    // return user if everything is ok
                    callback(err, user);
                }
            );
        });
}


function registerUser(opts, callback) {
    let data = _.cloneDeep(opts);

    passwordHelper.hashPassword(opts.password, (err, hashedPassword, salt) => {
        if (err) {
            return callback(err);
        }

        data.password = hashedPassword;
        data.passwordSalt = salt;

        this.model('User').create(data, (err, user) => {
            if (err) {
                return callback(err, null);
            }

            user.password = undefined;
            user.passwordSalt = undefined;

            callback(err, user);

        });
    });
}


function changeUserPassword(oldPassword, newPassword, callback) {
    console.log('--- this.id ---');
    console.log(this.id);

    this
        .model('User')
        .findById(this.id)
        .select('+password +passwordSalt')
        .exec((err, user) => {
            if (err) {
                return callback(err, null);
            }

            if (!user) {
                return callback(err, user);
            }

            passwordHelper.verify(
                oldPassword,
                user.password,
                user.passwordSalt,
                (err, result) => {
                    if (err) {
                        return callback(err, null);
                    }

                    if (result === false) {
                        let PassNoMatchError = new Error('Old password does not match.');
                        PassNoMatchError.type = 'old_password_does_not_match';
                        return callback(PassNoMatchError, null);
                    }

                    passwordHelper.hash(newPassword, (err, hashedPassword, salt) => {
                        this.password = hashedPassword;
                        this.passwordSalt = salt;

                        this.save((err, saved) => {
                            if (err) {
                                return callback(err, null);
                            }

                            if (callback) {
                                return callback(null, {
                                    success: true,
                                    message: 'Password changed successfully.',
                                    type: 'password_change_success'
                                });
                            }
                        });
                    });
                }
            );
        });
}

function forgotPassword(email, callback) {
    console.log('--- email ---');
    console.log(email);

    this.model('User').findOne({
        email: email
    }).exec((err, user) => {

        if (err) {
            console.error(err);

            return callback(err, null);
        }

        if (!user) {
            return callback(err, user);
        }

        tokenHelper.randomBytes(20, function (err, token) {
            console.log('---- token ----')
            console.log(token);
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

            this.save((err, saved) => {
                if (err) {
                    console.error(err);
                    return callback(err, null);
                }

                if (callback) {
                    return callback(null, {
                        success: true,
                        message: 'Password changed successfully.',
                        type: 'password_change_success'
                    });
                }
            })
        });



    })
}


const User = mongoose.model("User", UserSchema, "user");

module.exports = Object.assign({}, {User, UserSchema})
