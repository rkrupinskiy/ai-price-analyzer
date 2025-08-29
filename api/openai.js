export default async function handler(req, res) {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { apiKey, messages, model = 'gpt-4o', temperature = 0.1, maxTokens = 3000 } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key required' });
        }
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array required' });
        }
        
        // Запрос к OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('OpenAI error:', data);
            return res.status(response.status).json(data);
        }
        
        return res.json(data);
        
    } catch (error) {
        console.error('Serverless error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
