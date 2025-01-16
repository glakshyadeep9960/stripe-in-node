const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user");
const Ai = require("../models/ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_SECRET_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "You are an Ai Agent named Jarvis ok you have to give appropriate response with example code if needed ok to give user suitable response. You have to remember which topic is on the user is ok, User should not have to repeat the subject again and again.",
});
async function GeminiAi(req, res) {
  const { id } = req.user;
  const { question } = req.body;
  try {
    const userDetails = await User.findById(id);

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
        {
          role: "model",
          parts: [{ text: "Great to meet you. What would you like to know?" }],
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
    await Ai.create({
      userId: id,
      question: question,
      answer: fullResponse,
      subscriptionId: userDetails.subscriptionId,
      googleId: userDetails.googleId,
    });
    res.end();
  } catch (error) {
    console.log(error, "ai error");

    return res.status(500).json({ message: "An Error Occured at AI api" });
  }
}

module.exports = GeminiAi;
