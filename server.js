require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationMemory = new Map();
const MAX_HISTORY_LENGTH = 12;

app.get("/api/messenger/webhook", (req, res) => {
  const verify_token = process.env.META_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verify_token) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/api/messenger/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      if (event.message && event.message.text && !event.message.is_echo) {
        const senderId = event.sender.id;
        const userMessage = event.message.text;
        
        if (userMessage.toLowerCase().trim() === "/reset") {
          conversationMemory.delete(senderId);
          await sendMessage(senderId, "ঠিক আছে আমি সব ভুলে গেছি। নতুন করে শুরু করুন।");
          return res.status(200).send("OK");
        }

        addToMemory(senderId, "user", userMessage);
        const aiReply = await generateAIReply(senderId);
        addToMemory(senderId, "assistant", aiReply);
        await sendMessage(senderId, aiReply);
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

function addToMemory(userId, role, content) {
  if (!conversationMemory.has(userId)) {
    conversationMemory.set(userId, { startedAt: Date.now(), messages: [] });
  }
  const history = conversationMemory.get(userId);
  history.messages.push({ role, content });
  if (history.messages.length > MAX_HISTORY_LENGTH) history.messages.shift();
  conversationMemory.set(userId, history);
}

async function generateAIReply(userId) {
  try {
    const history = conversationMemory.get(userId);
    const messages = [
      { role: "system", content: "আপনি একটি ফেসবুক পেইজের সহায়ক। সংক্ষিপ্ত, স্নিগ্ধ বাংলায় উত্তর দিন। আগের কথা মনে রাখুন।" },
      ...history.messages
    ];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0].message.content;
  } catch (error) {
    return "দুঃখিত, এখন উত্তর দিতে পারছি না।";
  }
}

async function sendMessage(senderId, message) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/me/messages`, {
      recipient: { id: senderId },
      message: { text: message }
    }, {
      params: { access_token: process.env.META_PAGE_ACCESS_TOKEN }
    });
  } catch (error) {
    console.error("Send Error:", error.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
