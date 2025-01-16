const express = require("express");
const passport = require("passport");
const authRouter = express.Router();
const jwt = require("jsonwebtoken");
authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Callback route after Google login
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/login",
    // successRedirect: "http://localhost:3000/dashboard",
    session: true,
  }),
  (req, res) => {
    // Successful authentication
    const userPayload = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    };
    const token = jwt.sign(userPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: "10h",
    });
    res.redirect(`http://localhost:3000/dashboard?token=${token}`);
  }
);

// Route to check authentication status
authRouter.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user,
    });
  } else {
    res.json({
      isAuthenticated: false,
    });
  }
});

authRouter.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return res.status(500).json({ error: "Error during logout" });
    }
    res.redirect("http://localhost:3000/login");
  });
});

module.exports = authRouter;
