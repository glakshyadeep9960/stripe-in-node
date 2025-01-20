const express = require("express");
const VerifyUserToken = require("../middleware/verifyUser");
const {
  GeminiAiTextGeneration,
  GeminiTextGenerationFromImage,
  createChat,
  getMessages,
  getChats,
} = require("../gemini-ai/ai");
const multer = require("multer");
const aiRouter = express.Router();
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
aiRouter.route("/create-chat").post(VerifyUserToken, createChat);
aiRouter.route("/get-chats").get(VerifyUserToken, getChats);
aiRouter.route("/get-messages").post(VerifyUserToken, getMessages);
aiRouter.route("/generate-text").post(VerifyUserToken, GeminiAiTextGeneration);
aiRouter
  .route("/generate-text-from-image")
  .post(upload.single("file"), VerifyUserToken, GeminiTextGenerationFromImage);

module.exports = aiRouter;
