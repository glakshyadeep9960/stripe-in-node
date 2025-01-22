const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user");
const Ai = require("../models/ai");
const path = require("path");
const fs = require("fs");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_SECRET_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "You are an Ai Agent named Jarvis ok you have to give appropriate response with example code if needed ok to give user suitable response. You have to remember which topic is on the user is ok, User should not have to repeat the subject again and again.",
});

async function createChat(req, res) {
  const { id } = req.user;
  try {
    const findUser = await User.findById(id);
    const newChat = await Ai.create({
      userId: id,
      subscriptionId: findUser.subscriptionId,
      googleId: findUser.googleId,
    });

    return res.status(201).json({
      message: "Chat has been created",
      chatId: newChat._id.toString(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "An Error Occured at Creating chat",
      error: error?.message,
    });
  }
}

async function GeminiAiTextGeneration(req, res) {
  const { id } = req.user;
  const { chatId, question } = req.body;
  try {
    const findChat = await Ai.findOne({ _id: chatId, userId: id });
    if (findChat) {
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: "Hello" }],
          },
          {
            role: "model",
            parts: [
              { text: "Great to meet you. What would you like to know?" },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.1,
        },
      });

      let result = await chat.sendMessageStream(question);
      res.status(200).setHeader("Content-Type", "text/plain");
      const chunks = [];
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        chunks.push(chunkText);
        console.log(chunkText);
        res.write(chunkText);
      }

      const fullResponse = chunks.join("");
      const findAi = await Ai.findById(chatId);
      if (findAi) {
        findAi.question.push(question);
        findAi.answer.push(fullResponse);
        await findAi.save();
      }

      const chatName = await Ai.findById(chatId);
      await Ai.updateOne(
        { _id: chatId, userId: id },
        {
          chatName: chatName.question[0],
        }
      );

      res.end();
    } else {
      return res.status(404).json({ message: "Chat not find!" });
    }
  } catch (error) {
    console.log(error, "ai error");

    return res.status(500).json({ message: "An Error Occured at AI api" });
  }
}

async function getChats(req, res) {
  const { id } = req.user;

  try {
    const findChats = await Ai.find({ userId: id }).select("-question -answer");

    if (!findChats) {
      return res.status(400).json({ message: "No Chats Found!" });
    } else {
      const data = findChats?.map((item) => item);

      return res.status(200).json({
        message: "Chats has been fetched",
        data: data,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error In Fetching Chats", error: error.message });
  }
}

async function getMessages(req, res) {
  const { id } = req.user;

  const { chatId } = req.body;

  try {
    const data = await Ai.findOne({ userId: id, _id: chatId });
    console.log(data);

    if (!data) {
      return res.status(404).json({ message: "No Messages Find!" });
    } else {
      const questions = data?.question?.map((item) => item);
      const answers = data?.answer?.map((item) => item);

      return res.status(200).json({
        message: "Data has been fetched",
        data: {
          questions,
          answers,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Error Occured at Fetching Messages",
      error: error.message,
    });
  }
}

async function renameChat(req, res) {
  const { id } = req.user;
  const { chatId, chatName } = req.body;
  try {
    const findChat = await Ai.findOne({ _id: chatId, userId: id });
    if (!findChat) {
      return res.status(404).json({ message: "No Chat Found!" });
    } else {
      await Ai.updateOne({ _id: chatId, userId: id }, { chatName: chatName });
      return res.status(200).json({ message: "Chat Name has been Changed" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error Occured at Server side", error: error.message });
  }
}

async function deleteChat(req, res) {
  const { id } = req.user;
  const { chatId } = req.params;
  try {
    let findChat = await Ai.findOne({ userId: id, _id: chatId });
    if (!findChat) {
      return res.status(404).json({ message: "No chat found!" });
    } else {
      await Ai.deleteOne({ _id: chatId });
      return res.status(200).json({ message: "Chat has been deleted" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error Occured at Server side", error: error.message });
  }
}

async function GeminiTextGenerationFromImage(req, res) {
  try {
    const { id } = req.user;
    const file = req?.file;

    if (!file) {
      return res.status(400).json({ message: "Please upload an image file." });
    }

    const fileName = file.originalname;
    const userDetails = await User.findById(id);

    const imageBuffer = await fs.promises.readFile(file.path);

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(imageBuffer).toString("base64"),
          mimeType: "image/jpeg",
        },
      },
      "Caption this image.",
    ]);

    await Ai.create({
      userId: id,
      question: fileName,
      answer: result.response.text(),
      subscriptionId: userDetails?.subscriptionId,
      googleId: userDetails?.googleId,
    });

    return res.status(200).json({
      message: "Response has been fetched",
      data: result.response.text(),
    });
  } catch (error) {
    console.error("Error generating text from image:", error);
    return res
      .status(500)
      .json({ message: "An error occurred. Please try again later." });
  }
}

module.exports = {
  createChat,
  getChats,
  getMessages,
  GeminiAiTextGeneration,
  GeminiTextGenerationFromImage,
  renameChat,
  deleteChat,
};
