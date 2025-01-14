require("dotenv").config({ path: "./configs/.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const databaseConnection = require("./configs/db");
const UserRouter = require("./routers/user");
const StripeRouter = require("./routers/stripe");
const passport = require("passport");
const session = require("express-session");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Serialize user info into the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user info from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_AUTH_SECRET_KEY,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      // Process the user profile information
      return done(null, profile);
    }
  )
);

app.use("uploads", express.static(path.resolve(__dirname, "uploads")));

app.use("/api/v1/stripe", StripeRouter);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  return res.status(200).json({ message: "App is running" });
});

databaseConnection();

app.use("/api/v1/user", UserRouter);

app.listen(process.env.PORT, () => {
  console.log(`App is running on ${process.env.PORT}`);
});
