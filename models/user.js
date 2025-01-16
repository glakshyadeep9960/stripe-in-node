const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  stripeId: {
    type: String,
  },
  password: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
  },
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  plan: {
    type: String,
    default: "Free",
  },
  subscriptionId: {
    type: String,
    default: "Not Subscribed",
  },
  googleId: {
    type: String,
  },
});

userSchema.pre("save", async function () {
  try {
    const genSalt = await bcrypt.genSalt(12);
    const hashPass = await bcrypt.hash(this.password, genSalt);
    this.password = hashPass;
  } catch (error) {
    console.log(error, "Error in bcrypt password saving logic!");
  }
});

userSchema.methods.generateToken = async function () {
  return jwt.sign(
    {
      id: this?._id,
      name: this?.name,
      email: this?.email,
      phone: this?.phone,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
    }
  );
};

userSchema.methods.comparePass = async function (password) {
  try {
    return bcrypt.compare(password, this.password);
  } catch (error) {
    console.log(error, "Error in comparing password!");
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
