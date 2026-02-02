const mongoose = require("mongoose");

async function databaseConnection(req, res) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to Database");
  } catch (error) {
    console.log("Error in Connection");
  }
}

module.exports = databaseConnection;
