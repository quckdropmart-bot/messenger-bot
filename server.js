// ==========================================
// Messenger GPT Bot - Railway Version
// ==========================================

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// লগ দেখানোর জন্য
console.log("🚀 Server starting...");
console.log("📋 Checking environment variables...");

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// মেমরি স্টোরেজ
const conversationMemory = new Map();
const MAX_HISTORY_LENGTH = 10;

// ==========================================
// Webhook Verification (Meta চেক করে)
// ==========================================
app.get("/api/messenger/webhook", (req, res) => {
  console.log("🔍 Webhook verification request received");
  
  const verify_token = process.env.META_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Mode:", mode);
  console.log("Token received:", token ? "Yes" : "No");
  console.log("Expected token:", verify_token ? "Yes" : "No");

  if (mode === "subscribe" && token === verify_token) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// ==========================================
// Receive Messages
// ==========================================
app.post("/api/messenger/webhook", async (req, res) => {
  console.log("📩 Webhook POST received");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      
      // ইউজারের মেসেজ চেক করুন (বোটের নিজের মেসেজ ইগনোর করুন)
      if (event && event.message && event.message.text && !event.message.is_echo) {
        const senderId = event.sender.id;
        const userMessage = event.message.text;
        
        console.log(`👤 User ${senderId}: ${userMessage}`);

        // রিসেট কমান্ড
        if (userMessage.toLowerCase().trim() === "/reset") {
          conversationMemory.delete(senderId);
          await sendReply(senderId, "ঠিক আছে আমি সব ভুলে গেছি। নতুন করে শুরু করুন।");
          continue;
        }

        try {
          // মেমরিতে যোগ করুন
          addToMemory(senderId, "user", userMessage);
          
          // GPT রিপ্লাই তৈরি করুন
          const aiReply = await generateAIReply(senderId);
          
          // মেমরিতে বোটের রিপ্লাই যোগ করুন
          addToMemory(senderId, "assistant", aiReply);
          
          // রিপ্লাই পাঠান
          await sendReply(senderId, aiReply);
          
        } catch (error) {
          console.error("❌ Error processing message:", error.message);
          await sendReply(senderId, "দুঃখিত, এখন উত্তর দিতে পারছি না। কিছুক্ষণ পর আবার চেষ্টা করুন।");
        }
      }
    }
    
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ==========================================
// GPT Reply Generation
// ==========================================
async function generateAIReply(userId) {
  const history = conversationMemory.get(userId) || { messages: [] };
  
  const messages = [
    {
      role: "system",
      content: "আপনি একটি ফেসবুক পেইজের সহায়ক। সংক্ষিপ্ত, স্নিগ্ধ বাংলায় উত্তর দিন। আগের কথা মনে রাখুন।"
    },
    ...history.messages
  ];

  try {
    console.log("🤖 Calling OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 200,
    });
    
    const reply = response.choices[0].message.content;
    console.log("🤖 AI Reply:", reply);
    return reply;
    
  } catch (error) {
    console.error("❌ OpenAI Error:", error.message);
    return "দুঃখিত, এখন উত্তর দিতে পারছি না।";
  }
}

// ==========================================
// Send Message to Facebook
// ==========================================
async function sendReply(senderId, message) {
  try {
    console.log(`📤 Sending reply to ${senderId}: ${message}`);
    
    const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`;
    
    const response = await axios.post(url, {
      recipient: { id: senderId },
      message: { text: message }
    });
    
    console.log("✅ Message sent successfully");
    return response;
    
  } catch (error) {
    console.error("❌ Failed to send message:", error.response?.data || error.message);
    throw error;
  }
}

// ==========================================
// Memory Helper
// ==========================================
function addToMemory(userId, role, content) {
  if (!conversationMemory.has(userId)) {
    conversationMemory.set(userId, { messages: [] });
  }
  
  const history = conversationMemory.get(userId);
  history.messages.push({ role, content });
  
  if (history.messages.length > MAX_HISTORY_LENGTH) {
    history.messages.shift();
  }
  
  conversationMemory.set(userId, history);
}

// ==========================================
// Health Check (Railway চেক করে)
// ==========================================
app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Messenger Bot is running!",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("========================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://your-domain/api/messenger/webhook`);
  console.log("========================================");
  console.log("✅ Environment Check:");
  console.log("   - OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Missing");
  console.log("   - META_PAGE_ACCESS_TOKEN:", process.env.META_PAGE_ACCESS_TOKEN ? "✓ Set" : "✗ Missing");
  console.log("   - META_VERIFY_TOKEN:", process.env.META_VERIFY_TOKEN ? "✓ Set" : "✗ Missing");
  console.log("========================================");
});
