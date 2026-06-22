// Facebook Webhook Verification (GET)
app.get('/api/messenger/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive Messages (POST)
app.post('/api/messenger/webhook', (req, res) => {
  let body = req.body;
  
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);
      
      // এখানে মেসেজ প্রসেসিং লজিক যোগ করুন
      // যেমন: sendMessage(webhookEvent.sender.id, "Hello!");
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});
