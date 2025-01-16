const express = require("express");
const GeminiAi = require("../gemini-ai/ai");
const VerifyUserToken = require("../middleware/verifyUser");
const aiRouter = express.Router();

aiRouter.route("/test").post(VerifyUserToken, GeminiAi);

module.exports = aiRouter;
