const mongoose = require("mongoose");

const aiSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  question: {
    type: Array,
  },
  answer: {
    type: Array,
  },
  subscriptionId: {
    type: String,
  },
  googleId: {
    type: String,
  },
});

const Ai = mongoose.model("Ai", aiSchema);

module.exports = Ai;
