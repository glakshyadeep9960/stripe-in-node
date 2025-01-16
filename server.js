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
const User = require("./models/user");
const authRouter = require("./routers/auth");
const aiRouter = require("./routers/ai");
app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Serialize user info into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user info from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_AUTH_SECRET_KEY,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            isVerified: true,
          });

          await user.save();
        } else {
          if (user.isVerified === false) {
            user.isVerified = true;
            await user.save();
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

app.use("uploads", express.static(path.resolve(__dirname, "uploads")));

app.use("/api/v1/stripe", StripeRouter);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.status(200).json({ message: "App is running" });
});

databaseConnection();
app.use("/api/v1/auth", authRouter);

app.use("/api/v1/user", UserRouter);
app.use("/api/v1/ai", aiRouter);
app.listen(process.env.PORT, () => {
  console.log(`App is running on ${process.env.PORT}`);
});
