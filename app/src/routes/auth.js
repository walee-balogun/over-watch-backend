var express = require('express');
var router = express.Router();
var authCtrl = require('../controllers/auth');


router.post('/signin', authCtrl.signIn);
router.post('/register', authCtrl.register);
router.post('/forgot-password', authCtrl.forgotPassword);
router.get('/rbstmajf+[a-z0-9]+/:token', authCtrl.resetPassword);
router.post('/reset-password/:token', authCtrl.changePasswordWithToken);
router.post('/change-password', authCtrl.changePassword);
router.get('/abldkcef+[a-z0-9]+/:token', authCtrl.verifyUserEmailWithToken);
router.post('/verify-email/user/:userId/email/:email', authCtrl.verifyUserEmail)


module.exports = router;
