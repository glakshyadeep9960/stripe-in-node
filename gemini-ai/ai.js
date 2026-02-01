const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user");
const Ai = require("../models/ai");
const path = require("path");
const fs = require("fs");
const { userInfo } = require("os");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_SECRET_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
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
      chatId: newChat._id,
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
    const findUser = await User.findById(id);

    if (findUser?.messageLimit > 0) {
      const keywords = {
        weather: ["weather", "temperature", "forecast", "climate"],
        programming: [
          "javascript",
          "python",
          "coding",
          "programming",
          "code",
          "function",
        ],
        travel: [
          "travel",
          "vacation",
          "trip",
          "flight",
          "hotel",
          "destination",
        ],
        // Add more topics and keywords as needed
      };

      let chatData;
      if (chatId) {
        // If chatId exists, retrieve the chat data.
        chatData = await Ai.findOne({ _id: chatId, userId: id });
        if (!chatData) {
          throw new Error("Chat not found");
        }
        if (chatData.messages.length === 0) {
          chatData.chatName = question;
          await chatData.save();
        }
      }

      // Determine the topic based on keywords.
      let detectedTopic = null;
      for (const topic in keywords) {
        if (
          keywords[topic].some((keyword) =>
            question.toLowerCase().includes(keyword),
          )
        ) {
          detectedTopic = topic;
          break;
        }
      }
      chatData.topic = detectedTopic || chatData.topic;
      // Prepare the chat history for the conversation.
      const chatHistory = chatData.messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.1,
        },
      });

      // Send the question to the AI and stream the response.
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

      // Update chat history with the new conversation.
      chatData.messages.push({ role: "user", text: question });
      chatData.messages.push({ role: "model", text: fullResponse });
      await chatData.save();

      findUser.messageLimit = findUser.messageLimit - 1;
      await findUser.save();
      res.end();
    } else {
      return res
        .status(400)
        .json({ message: "You have used your free tier! Upgrade Your Plan." });
    }
  } catch (error) {
    console.error(error, "ai error");
    if (!res.headersSent) {
      res.status(500).json({ message: "An Error Occurred at AI API" });
    } else {
      res.end();
    }
  }
}

async function getChats(req, res) {
  const { id } = req.user;

  try {
    const findChats = await Ai.find({ userId: id }).select("-messages -topic");

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
      const messages = data.messages.map((item) => item);

      return res.status(200).json({
        message: "Data has been fetched",
        data: {
          messages,
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
    const { chatId } = req.body;
    if (!file) {
      return res.status(400).json({ message: "Please upload an image file." });
    }
    const findChat = await Ai.findOne({ _id: chatId });
    if (!findChat) {
      return res.status(404).json({ message: "No Chat Found" });
    }
    const fileName = path.basename(file.path);
    const userDetails = await User.findById(id);
    const url = `${process.env.BACKEND_URL}/uploads/${fileName}`;
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
    findChat.messages.push({ role: "user", text: url });
    findChat.messages.push({ role: "model", text: result.response.text() });
    await findChat.save();
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
