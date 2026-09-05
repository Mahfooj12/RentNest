const express = require('express');
const router = express.Router();
const passport = require("passport");
const {saveRedirectUrl, isLoggedIn} = require("../middleware.js");
const userController=require("../controllers/users.js")

router
.route("/signup")
.get(userController.renderSignUpForm)
.post(userController.signup);

router
.route("/login")
.get(userController.renderLoginForm)
.post(saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",   
    failureFlash: true,          
  }),
  userController.login);
router.get("/logout",userController.logout );

// Profile page
router.get('/profile', isLoggedIn, userController.profile);

module.exports=router;


//signup route
// router.get("/signup",userController.renderSignUpForm);

// router.post("/signup",userController.signup);

//login route