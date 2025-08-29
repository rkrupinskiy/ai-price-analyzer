// Serverless функция для Vercel/Netlify - обход CORS для OpenAI API
// Поместите этот файл в папку api/openai.js (Vercel) или netlify/functions/openai.js (Netlify)

export default async function handler(req, res) {
    // Устанавливаем CORS заголовки для всех запросов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Принимаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['POST'] 
        });
    }
    
    try {
        // Извлекаем данные из запроса
        const { 
            apiKey, 
            messages, 
            model = 'gpt-4o', 
            temperature = 0.1, 
            maxTokens = 3000,
            stream = false
        } = req.body;
        
        // Проверяем наличие API ключа
        if (!apiKey) {
            return res.status(400).json({ 
                error: 'OpenAI API key is required',
                code: 'MISSING_API_KEY'
            });
        }
        
        // Проверяем формат API ключа
        if (!apiKey.startsWith('sk-')) {
            return res.status(400).json({ 
                error: 'Invalid OpenAI API key format',
                code: 'INVALID_API_KEY'
            });
        }
        
        // Проверяем наличие сообщений
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ 
                error: 'Messages array is required',
                code: 'MISSING_MESSAGES'
            });
        }
        
        console.log(`🚀 Отправляем запрос к OpenAI API для модели ${model}`);
        console.log(`📝 Сообщений: ${messages.length}, Токенов: ${maxTokens}`);
        
        // Отправляем запрос к OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'AI-Price-Analyzer/1.0'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature,
                stream,
                presence_penalty: 0,
                frequency_penalty: 0
            })
        });
        
        const responseData = await openaiResponse.json();
        
        // Проверяем успешность ответа от OpenAI
        if (!openaiResponse.ok) {
            console.error('❌ Ошибка OpenAI API:', responseData);
            
            // Специальная обработка разных типов ошибок
            if (openaiResponse.status === 401) {
                return res.status(401).json({
                    error: 'Invalid OpenAI API key',
                    code: 'INVALID_API_KEY',
                    details: responseData.error?.message || 'Authentication failed'
                });
            } else if (openaiResponse.status === 429) {
                return res.status(429).json({
                    error: 'OpenAI API rate limit exceeded',
                    code: 'RATE_LIMIT',
                    details: responseData.error?.message || 'Too many requests'
                });
            } else if (openaiResponse.status === 400) {
                return res.status(400).json({
                    error: 'Invalid request to OpenAI API',
                    code: 'BAD_REQUEST',
                    details: responseData.error?.message || 'Bad request'
                });
            }
            
            return res.status(openaiResponse.status).json({
                error: 'OpenAI API error',
                code: 'OPENAI_API_ERROR',
                details: responseData.error?.message || 'Unknown error'
            });
        }
        
        console.log('✅ Успешный ответ от OpenAI API');
        console.log(`📊 Использовано токенов: ${responseData.usage?.total_tokens || 'неизвестно'}`);
        
        // Возвращаем успешный ответ
        return res.status(200).json(responseData);
        
    } catch (error) {
        console.error('💥 Ошибка в serverless функции:', error);
        
        // Обработка сетевых ошибок
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(502).json({
                error: 'Failed to connect to OpenAI API',
                code: 'CONNECTION_ERROR',
                details: 'Please check your internet connection'
            });
        }
        
        // Обработка ошибок парсинга JSON
        if (error instanceof SyntaxError) {
            return res.status(400).json({
                error: 'Invalid JSON in request body',
                code: 'JSON_PARSE_ERROR',
                details: error.message
            });
        }
        
        // Общая обработка ошибок
        return res.status(500).json({ 
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
}

// Для Netlify Functions (альтернативный экспорт)
export const handler = async (event, context) => {
    const req = {
        method: event.httpMethod,
        body: event.body ? JSON.parse(event.body) : {}
    };
    
    const res = {
        setHeader: () => {},
        status: (code) => ({ 
            json: (data) => ({
                statusCode: code,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }),
            end: () => ({
                statusCode: code,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: ''
            })
        })
    };
    
    return await handler(req, res);
};

// Для локального тестирования (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handler };
}
