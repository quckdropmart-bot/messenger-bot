const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Environment Variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'frame-lab-ctg-2026';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

// Webhook Verification (GET) - Facebook verification
app.get('/api/messenger/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Receive Messages (POST)
app.post('/api/messenger/webhook', (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);
      
      // Sender ID
      let senderPsid = webhookEvent.sender.id;
      
      // Message text
      if (webhookEvent.message) {
        let receivedMessage = webhookEvent.message.text;
        console.log('Received:', receivedMessage);
        
        // এখানে আপনার রেসপন্স লজিক যোগ করুন
        // যেমন: sendTextMessage(senderPsid, "Hello!");
      }
    });
    
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Messenger Bot is running!');
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook URL: https://your-domain/api/messenger/webhook`);
  console.log(`Verify Token: ${VERIFY_TOKEN ? 'Set' : 'Missing'}`);
  console.log(`Page Access Token: ${PAGE_ACCESS_TOKEN ? 'Set' : 'Missing'}`);
});
