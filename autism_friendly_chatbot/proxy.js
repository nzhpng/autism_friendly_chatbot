const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

const NIM_API_KEY = process.env.NIM_API_KEY;;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NIM_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    // Log the status and response for debugging
    const text = await response.text();
    console.log('NVIDIA API status:', response.status);
    console.log('NVIDIA API response:', text);

    // Try to parse JSON, or return raw text if not JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    if (!response.ok) {
      res.status(response.status).json(data);
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`)); 