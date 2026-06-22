const express = require('express');
const app = express();

// JSON parser - bodyParser ছাড়াই কাজ করে
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

// GET verification
app.get('/api/messenger/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST receive (null-safe)
app.post('/api/messenger/webhook', (req, res) => {
  const body = req.body;
  
  if (!body || body.object !== 'page') {
    return res.sendStatus(404);
  }

  if (body.entry && Array.isArray(body.entry)) {
    body.entry.forEach((entry) => {
      if (entry.messaging && entry.messaging[0]) {
        const event = entry.messaging[0];
        console.log('Received:', event);
      }
    });
  }
  
  res.status(200).send('EVENT_RECEIVED');
});

app.get('/', (req, res) => res.send('Bot Running'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
