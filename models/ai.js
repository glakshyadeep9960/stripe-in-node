const mongoose = require("mongoose");

const aiSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  topic: { type: String, default: null },
  messages: [
    {
      role: { type: String, enum: ["user", "model"] },
      text: { type: String },
    },
  ],
  subscriptionId: { type: String },
  googleId: { type: String },
  chatName: { type: String, default: "No Name Provided" },
});

const Ai = mongoose.model("Ai", aiSchema);

module.exports = Ai;
