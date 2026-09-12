const express = require('express');
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");

// ==================== HOME ROUTE ====================
// Yeh add karna zaroori tha warna "/" par 404 aata hai
router.get("/", (req, res) => {
    res.redirect("/listings");
});

// ==================== SIGNUP ====================
router
  .route("/signup")
  .get(userController.renderSignUpForm)
  .post(userController.signup);

// ==================== LOGIN ====================
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

// ==================== LOGOUT ====================
router.get("/logout", userController.logout);

// ==================== PROFILE ====================
router.get("/profile", isLoggedIn, userController.profile);

module.exports = router;


//signup route
// router.get("/signup",userController.renderSignUpForm);

// router.post("/signup",userController.signup);

//login route