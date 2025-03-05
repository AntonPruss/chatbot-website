// api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call the OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The API key is stored securely as an environment variable in Vercel.
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or your custom model
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error: ${err}`);
    }

    const data = await response.json();
    const botReply = data.choices[0].message.content.trim();
    return res.status(200).json({ reply: botReply });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ reply: "Sorry, I encountered an error." });
  }
}
