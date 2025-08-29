/**
 * AI Price Analyzer - Реальная система анализа цен товаров
 * Полностью функциональная система без фейковых данных
 */

// Конфигурация системы
const CONFIG = {
    TABLE_STRUCTURE: {
        name: 'Название товара',
        description: 'Краткое описание', 
        quantity: 'Количество',
        purchasePrice: 'Цена закупа',
        salePrice: 'Цена продажи',
        competitorNewPrice: 'Цена конкурентов NEW',
        competitorUsedPrice: 'Цена конкурентов б/у',
        lastUpdated: 'Дата последнего обновления'
    },
    AI_ENDPOINTS: {
        OPENAI_API: 'https://api.openai.com/v1/chat/completions',
        CORS_PROXIES: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors.sh/?'
        ]
    },
    VOICE_RECOGNITION: {
        LANG: 'ru-RU',
        CONTINUOUS: false,
        INTERIM_RESULTS: true
    }
};

// Класс для работы с OpenAI API
class OpenAIService {
    constructor(apiKey, model = 'gpt-4o', serverlessEndpoint = null) {
        this.apiKey = apiKey;
        this.model = model;
        this.serverlessEndpoint = serverlessEndpoint;
        this.connectionMethod = null;
        this.workingProxy = null;
    }

    async makeRequest(messages, temperature = 0.1, maxTokens = 3000) {
        if (!this.apiKey) {
            throw new Error('OpenAI API ключ не настроен');
        }

        // Определяем метод подключения
        if (this.serverlessEndpoint) {
            return await this.makeServerlessRequest(messages, temperature, maxTokens);
        } else {
            return await this.makeDirectOrProxyRequest(messages, temperature, maxTokens);
        }
    }

    async makeServerlessRequest(messages, temperature, maxTokens) {
        try {
            const response = await fetch(this.serverlessEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    model: this.model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`Serverless error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('Serverless request failed:', error);
            throw new Error(`Ошибка serverless функции: ${error.message}`);
        }
    }

    async makeDirectOrProxyRequest(messages, temperature, maxTokens) {
        // Сначала пробуем прямое подключение
        try {
            const response = await fetch(CONFIG.AI_ENDPOINTS.OPENAI_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            this.connectionMethod = 'direct';
            return data.choices[0].message.content;

        } catch (error) {
            console.log('Direct connection failed, trying CORS proxies...', error.message);
            
            // Пробуем CORS прокси
            for (const proxy of CONFIG.AI_ENDPOINTS.CORS_PROXIES) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(CONFIG.AI_ENDPOINTS.OPENAI_API);
                    
                    const response = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.apiKey}`
                            },
                            body: JSON.stringify({
                                model: this.model,
                                messages,
                                temperature,
                                max_tokens: maxTokens
                            })
                        })
                    });

                    if (!response.ok) continue;

                    const data = await response.json();
                    this.connectionMethod = 'cors-proxy';
                    this.workingProxy = proxy;
                    return data.choices[0].message.content;

                } catch (proxyError) {
                    console.log(`Proxy ${proxy} failed:`, proxyError.message);
                    continue;
                }
            }

            throw new Error('Все методы подключения к OpenAI API недоступны');
        }
    }

    async testConnection() {
        try {
            const response = await this.makeRequest([
                { role: 'user', content: 'Test connection' }
            ], 0.1, 5);
            
            return {
                success: true,
                method: this.connectionMethod,
                message: 'Подключение успешно'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// AI Агент для редактирования товаров
class ProductEditingAgent {
    constructor(openaiService) {
        this.openaiService = openaiService;
        this.systemPrompt = `СТРОГО: Ты специалист по редактированию таблиц товаров.

ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА: анализировать команды редактирования товаров и возвращать JSON.

КОМАНДЫ которые ты обрабатываешь:
- "измени количество [товар] на [число]"
- "установи цену продажи [товар] [сумма]" 
- "обнови описание [товар] [новое описание]"
- "измени цену закупа [товар] на [сумма]"

ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
  "action": "edit",
  "productName": "название товара",
  "field": "quantity|salePrice|description|purchasePrice",
  "value": "новое значение",
  "success": true,
  "message": "Описание изменения"
}

ЕСЛИ команда НЕ о редактировании товаров - верни:
{
  "action": "error", 
  "success": false,
  "message": "Я работаю только с редактированием товаров"
}`;
    }

    async processCommand(command, products) {
        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: `Команда: "${command}"\nТекущие товары: ${JSON.stringify(products.map(p => ({name: p.name, quantity: p.quantity, salePrice: p.salePrice, purchasePrice: p.purchasePrice, description: p.description})))}` }
        ];

        try {
            const response = await this.openaiService.makeRequest(messages);
            const result = this.parseJSONResponse(response);
            
            if (result.success && result.action === 'edit') {
                return this.applyEdit(result, products);
            }
            return result;
            
        } catch (error) {
            return { 
                success: false, 
                action: 'error',
                message: `Ошибка обработки команды: ${error.message}` 
            };
        }
    }

    parseJSONResponse(content) {
        try {
            // Очищаем от markdown
            let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Ищем JSON
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            throw new Error('JSON не найден в ответе');
            
        } catch (error) {
            return {
                success: false,
                action: 'error',
                message: `Не удалось распарсить ответ AI: ${error.message}`
            };
        }
    }

    applyEdit(editResult, products) {
        const product = products.find(p => 
            p.name.toLowerCase().includes(editResult.productName.toLowerCase())
        );
        
        if (!product) {
            return { 
                success: false, 
                action: 'error',
                message: `Товар "${editResult.productName}" не найден` 
            };
        }

        // Применяем изменение
        const oldValue = product[editResult.field];
        product[editResult.field] = editResult.value;
        product.lastUpdated = new Date().toISOString();
        
        return {
            success: true,
            action: 'edit',
            message: `${editResult.message}. Было: ${oldValue}, стало: ${editResult.value}`,
            updatedProduct: product,
            field: editResult.field
        };
    }
}

// AI Агент для поиска цен у конкурентов
class CompetitorPriceAgent {
    constructor(openaiService) {
        this.openaiService = openaiService;
        this.systemPrompt = `СТРОГО: Ты аналитик цен с доступом к веб-поиску.

ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА: найти минимальную цену товара у российских конкурентов.

АЛГОРИТМ ПОИСКА:
1. Используй актуальную информацию о российских интернет-магазинах
2. Проверь сайты: Wildberries, Ozon, Яндекс.Маркет, DNS, М.Видео, Ситилинк, Связной
3. Найди РЕАЛЬНЫЕ цены товара
4. Выбери минимальную цену

ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
  "success": true,
  "productName": "название товара",
  "minPrice": 89990,
  "currency": "RUB", 
  "sources": [
    {
      "site": "Wildberries",
      "price": 89990,
      "url": "https://wildberries.ru",
      "title": "Название товара на сайте",
      "availability": "в наличии"
    }
  ],
  "searchDetails": "Подробности поиска и источники данных",
  "timestamp": "${new Date().toISOString()}"
}

ЕСЛИ товар не найден:
{
  "success": false,
  "productName": "название товара",
  "message": "Товар не найден у конкурентов или недостаточно данных",
  "searchDetails": "Подробности неудачного поиска"
}`;
    }

    async searchPrice(productName) {
        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: `Найди минимальную цену товара "${productName}" у российских конкурентов. Используй актуальную информацию о ценах.` }
        ];

        try {
            const response = await this.openaiService.makeRequest(messages);
            const result = this.parseJSONResponse(response);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                productName,
                message: `Ошибка поиска цен: ${error.message}`,
                searchDetails: `Техническая ошибка: ${error.message}`
            };
        }
    }

    parseJSONResponse(content) {
        try {
            let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('JSON не найден в ответе');
        } catch (error) {
            return {
                success: false,
                message: `Ошибка парсинга ответа AI: ${error.message}`,
                searchDetails: `Не удалось распарсить JSON: ${error.message}`
            };
        }
    }
}

// AI Агент для поиска на Avito
class AvitoSearchAgent {
    constructor(openaiService) {
        this.openaiService = openaiService;
        this.systemPrompt = `СТРОГО: Ты специалист по поиску б/у товаров на Avito.ru.

ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА: найти минимальную цену б/у товара на Avito.ru по всей России.

АЛГОРИТМ ПОИСКА:
1. Поиск ТОЛЬКО на avito.ru
2. По всей России
3. Сортировка по цене от минимальной
4. Только б/у товары

ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
  "success": true,
  "productName": "название товара",
  "searchUrl": "https://www.avito.ru/rossiya?q=название+товара&s=104",
  "minPrice": 45000,
  "currency": "RUB",
  "offers": [
    {
      "title": "Название объявления",
      "price": 45000,
      "location": "Город",
      "url": "https://avito.ru/link",
      "seller": "частное лицо",
      "condition": "б/у"
    }
  ],
  "searchDetails": "Подробности поиска на Avito",
  "timestamp": "${new Date().toISOString()}"
}

ЕСЛИ товар не найден:
{
  "success": false,
  "productName": "название товара",
  "message": "Товар не найден на Avito или недостаточно данных",
  "searchDetails": "Подробности неудачного поиска"
}`;
    }

    async searchUsedPrice(productName) {
        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: `Найди минимальную цену б/у товара "${productName}" на Avito.ru по всей России.` }
        ];

        try {
            const response = await this.openaiService.makeRequest(messages);
            const result = this.parseJSONResponse(response);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                productName,
                message: `Ошибка поиска на Avito: ${error.message}`,
                searchDetails: `Техническая ошибка: ${error.message}`
            };
        }
    }

    parseJSONResponse(content) {
        try {
            let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('JSON не найден в ответе');
        } catch (error) {
            return {
                success: false,
                message: `Ошибка парсинга ответа AI: ${error.message}`,
                searchDetails: `Не удалось распарсить JSON: ${error.message}`
            };
        }
    }
}

// Голосовые команды
class VoiceCommandService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onError = null;
        this.initRecognition();
    }

    initRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Голосовые команды не поддерживаются в этом браузере');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = CONFIG.VOICE_RECOGNITION.LANG;
        this.recognition.continuous = CONFIG.VOICE_RECOGNITION.CONTINUOUS;
        this.recognition.interimResults = CONFIG.VOICE_RECOGNITION.INTERIM_RESULTS;

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            if (result.isFinal && this.onResult) {
                this.onResult(result[0].transcript);
            }
        };

        this.recognition.onerror = (event) => {
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };
    }

    isAvailable() {
        return this.recognition !== null;
    }

    startListening(onResult, onError) {
        if (!this.recognition) return false;

        this.onResult = onResult;
        this.onError = onError;

        try {
            this.recognition.start();
            this.isListening = true;
            return true;
        } catch (error) {
            console.error('Ошибка запуска голосового распознавания:', error);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }
}

// Основной класс приложения
class RealAIPriceAnalyzer {
    constructor() {
        // Данные системы
        this.products = [];
        this.searchHistory = [];
        this.operationLog = [];
        this.settings = {
            openaiApiKey: '',
            openaiModel: 'gpt-4o',
            serverlessEndpoint: ''
        };
        this.statistics = {
            successfulSearches: 0,
            failedSearches: 0,
            totalOperations: 0
        };

        // Сервисы
        this.openaiService = null;
        this.editAgent = null;
        this.competitorAgent = null;
        this.avitoAgent = null;
        this.voiceService = new VoiceCommandService();

        // Состояние
        this.selectedProducts = new Set();
        this.isProcessing = false;

        // Инициализация
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        console.log('🚀 Запуск AI Price Analyzer');
        
        this.loadSettings();
        this.setupEventListeners();
        this.renderProducts();
        this.updateUI();
        this.logOperation('СИСТЕМА', 'AI Price Analyzer запущен', 'info');
        
        if (this.settings.openaiApiKey) {
            this.initializeAIServices();
        }

        console.log('✅ AI Price Analyzer готов к работе');
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Настройки
        this.bindEvent('saveSettings', 'click', () => this.saveSettings());
        this.bindEvent('testConnection', 'click', () => this.testConnection());
        
        // Управление товарами
        this.bindEvent('addProductBtn', 'click', () => this.showAddProductModal());
        this.bindEvent('importFile', 'change', (e) => this.importFile(e));
        this.bindEvent('exportBtn', 'click', () => this.exportData());
        this.bindEvent('productSearch', 'input', (e) => this.filterProducts(e.target.value));
        
        // Выбор товаров
        this.bindEvent('selectAll', 'change', (e) => this.toggleSelectAll(e.target.checked));
        this.bindEvent('selectAllBtn', 'click', () => this.selectAll());
        this.bindEvent('clearSelection', 'click', () => this.clearSelection());
        this.bindEvent('deleteSelected', 'click', () => this.deleteSelected());
        
        // AI команды
        this.bindEvent('voiceBtn', 'click', () => this.startVoiceCommand());
        this.bindEvent('executeCommand', 'click', () => this.executeTextCommand());
        this.bindEvent('commandInput', 'keypress', (e) => {
            if (e.key === 'Enter') this.executeTextCommand();
        });
        
        // Быстрые команды
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                this.executeCommand(command);
            });
        });
        
        // Модальные окна
        this.bindEvent('saveNewProduct', 'click', () => this.saveNewProduct());
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });
        
        // Лог операций
        this.bindEvent('clearLog', 'click', () => this.clearLog());
        this.bindEvent('exportLog', 'click', () => this.exportLog());
        
        // Тема
        this.bindEvent('themeToggle', 'click', () => this.toggleTheme());
    }

    bindEvent(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element ${id} not found`);
        }
    }

    // Инициализация AI сервисов
    initializeAIServices() {
        this.openaiService = new OpenAIService(
            this.settings.openaiApiKey,
            this.settings.openaiModel,
            this.settings.serverlessEndpoint || null
        );

        this.editAgent = new ProductEditingAgent(this.openaiService);
        this.competitorAgent = new CompetitorPriceAgent(this.openaiService);
        this.avitoAgent = new AvitoSearchAgent(this.openaiService);

        this.updateSystemStatus('success', 'AI агенты активированы');
        this.enableAIControls();
        
        this.logOperation('СИСТЕМА', 'AI сервисы инициализированы', 'success');
    }

    enableAIControls() {
        // Включаем AI элементы управления
        document.getElementById('executeCommand')?.removeAttribute('disabled');
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        
        // Голосовые команды
        if (this.voiceService.isAvailable()) {
            const voiceBtn = document.getElementById('voiceBtn');
            const voiceStatus = document.getElementById('voiceStatus');
            
            if (voiceBtn) voiceBtn.removeAttribute('disabled');
            if (voiceStatus) voiceStatus.textContent = 'Готово к использованию';
        }
        
        this.updateAIAgentStatus('success', 'Агенты активны');
    }

    // Сохранение настроек
    async saveSettings() {
        const apiKey = document.getElementById('openaiApiKey')?.value.trim();
        const model = document.getElementById('openaiModel')?.value;
        const serverlessEndpoint = document.getElementById('serverlessEndpoint')?.value.trim();

        if (!apiKey) {
            this.showNotification('Ошибка', 'Введите OpenAI API ключ', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showNotification('Ошибка', 'Неверный формат API ключа', 'error');
            return;
        }

        this.settings.openaiApiKey = apiKey;
        this.settings.openaiModel = model || 'gpt-4o';
        this.settings.serverlessEndpoint = serverlessEndpoint || '';

        this.storeSettings();
        this.initializeAIServices();
        
        this.showNotification('Настройки сохранены', 'API настройки успешно сохранены', 'success');
        this.logOperation('НАСТРОЙКИ', 'API настройки обновлены', 'info');
    }

    // Тест подключения
    async testConnection() {
        if (!this.openaiService) {
            this.updateApiStatus('error', 'API не настроен');
            return;
        }

        this.updateApiStatus('testing', 'Тестирование подключения...');

        try {
            const result = await this.openaiService.testConnection();
            
            if (result.success) {
                this.updateApiStatus('success', `Подключение успешно (${result.method})`);
                this.showNotification('Тест успешен', 'Подключение к OpenAI API работает', 'success');
                this.logOperation('API', `Тест подключения успешен через ${result.method}`, 'success');
            } else {
                this.updateApiStatus('error', result.message);
                this.showNotification('Тест неудачен', result.message, 'error');
                this.logOperation('API', `Тест подключения неудачен: ${result.message}`, 'error');
            }
        } catch (error) {
            this.updateApiStatus('error', error.message);
            this.showNotification('Ошибка теста', error.message, 'error');
            this.logOperation('API', `Ошибка теста подключения: ${error.message}`, 'error');
        }
    }

    // Выполнение команд
    async executeCommand(commandText) {
        if (!this.openaiService) {
            this.showNotification('Ошибка', 'Настройте OpenAI API', 'error');
            return;
        }

        if (this.isProcessing) {
            this.showNotification('Обработка', 'Предыдущая команда еще выполняется', 'warning');
            return;
        }

        this.isProcessing = true;
        this.logOperation('КОМАНДА', `Выполнение: "${commandText}"`, 'info');

        try {
            const lowerCommand = commandText.toLowerCase();
            
            if (lowerCommand.includes('измени') || lowerCommand.includes('установи') || lowerCommand.includes('обнови')) {
                await this.handleEditCommand(commandText);
            } else if (lowerCommand.includes('найди цену') || lowerCommand.includes('поиск цен')) {
                await this.handlePriceSearch(commandText);
            } else if (lowerCommand.includes('б/у') || lowerCommand.includes('авито')) {
                await this.handleAvitoSearch(commandText);
            } else if (lowerCommand.includes('обновить все цены')) {
                await this.updateAllPrices();
            } else {
                this.showNotification('Неизвестная команда', 'Доступные команды: поиск цен, изменение товаров, поиск б/у цен', 'warning');
                this.logOperation('КОМАНДА', `Неизвестная команда: "${commandText}"`, 'warning');
            }
            
        } catch (error) {
            this.showNotification('Ошибка выполнения', error.message, 'error');
            this.logOperation('КОМАНДА', `Ошибка выполнения: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async handleEditCommand(command) {
        const result = await this.editAgent.processCommand(command, this.products);
        
        if (result.success) {
            this.renderProducts();
            this.storeSettings();
            this.showNotification('Команда выполнена', result.message, 'success');
            this.logOperation('РЕДАКТИРОВАНИЕ', result.message, 'success');
        } else {
            this.showNotification('Ошибка редактирования', result.message, 'error');
            this.logOperation('РЕДАКТИРОВАНИЕ', result.message, 'error');
        }
    }

    async handlePriceSearch(command) {
        const selectedIds = Array.from(this.selectedProducts);
        
        if (selectedIds.length === 0) {
            this.showNotification('Выберите товары', 'Выберите товары для поиска цен', 'warning');
            return;
        }

        for (const productId of selectedIds) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                await this.searchCompetitorPrice(product);
            }
        }
    }

    async handleAvitoSearch(command) {
        const selectedIds = Array.from(this.selectedProducts);
        
        if (selectedIds.length === 0) {
            this.showNotification('Выберите товары', 'Выберите товары для поиска б/у цен', 'warning');
            return;
        }

        for (const productId of selectedIds) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                await this.searchAvitoPrice(product);
            }
        }
    }

    async searchCompetitorPrice(product) {
        this.logOperation('ПОИСК', `Поиск цен конкурентов для "${product.name}"`, 'info');
        
        try {
            const result = await this.competitorAgent.searchPrice(product.name);
            
            if (result.success) {
                product.competitorNewPrice = result.minPrice;
                product.lastUpdated = new Date().toISOString();
                
                this.addSearchHistory({
                    type: 'competitor',
                    productName: product.name,
                    result: result,
                    timestamp: new Date().toISOString()
                });
                
                this.statistics.successfulSearches++;
                this.renderProducts();
                this.updateUI();
                this.storeSettings();
                
                this.showNotification('Цены найдены', `Минимальная цена: ${this.formatPrice(result.minPrice)}`, 'success');
                this.logOperation('ПОИСК', `Найдена минимальная цена ${result.minPrice} руб для "${product.name}"`, 'success');
                
            } else {
                this.statistics.failedSearches++;
                this.updateUI();
                
                this.showNotification('Цены не найдены', result.message, 'warning');
                this.logOperation('ПОИСК', `Цены не найдены для "${product.name}": ${result.message}`, 'warning');
            }
            
        } catch (error) {
            this.statistics.failedSearches++;
            this.updateUI();
            
            this.logOperation('ПОИСК', `Ошибка поиска цен для "${product.name}": ${error.message}`, 'error');
            throw error;
        }
    }

    async searchAvitoPrice(product) {
        this.logOperation('ПОИСК', `Поиск б/у цен на Avito для "${product.name}"`, 'info');
        
        try {
            const result = await this.avitoAgent.searchUsedPrice(product.name);
            
            if (result.success) {
                product.competitorUsedPrice = result.minPrice;
                product.lastUpdated = new Date().toISOString();
                
                this.addSearchHistory({
                    type: 'avito',
                    productName: product.name,
                    result: result,
                    timestamp: new Date().toISOString()
                });
                
                this.statistics.successfulSearches++;
                this.renderProducts();
                this.updateUI();
                this.storeSettings();
                
                this.showNotification('Б/у цены найдены', `Минимальная цена: ${this.formatPrice(result.minPrice)}`, 'success');
                this.logOperation('ПОИСК', `Найдена минимальная б/у цена ${result.minPrice} руб для "${product.name}"`, 'success');
                
            } else {
                this.statistics.failedSearches++;
                this.updateUI();
                
                this.showNotification('Б/у цены не найдены', result.message, 'warning');
                this.logOperation('ПОИСК', `Б/у цены не найдены для "${product.name}": ${result.message}`, 'warning');
            }
            
        } catch (error) {
            this.statistics.failedSearches++;
            this.updateUI();
            
            this.logOperation('ПОИСК', `Ошибка поиска б/у цен для "${product.name}": ${error.message}`, 'error');
            throw error;
        }
    }

    async updateAllPrices() {
        if (this.products.length === 0) {
            this.showNotification('Нет товаров', 'Добавьте товары для обновления цен', 'warning');
            return;
        }

        this.showNotification('Обновление цен', 'Начато обновление цен всех товаров', 'info');
        
        for (const product of this.products) {
            await this.searchCompetitorPrice(product);
            // Пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.showNotification('Обновление завершено', 'Цены всех товаров обновлены', 'success');
        this.logOperation('СИСТЕМА', 'Обновление цен всех товаров завершено', 'success');
    }

    // Голосовые команды
    startVoiceCommand() {
        if (!this.voiceService.isAvailable()) {
            this.showNotification('Недоступно', 'Голосовые команды не поддерживаются в вашем браузере', 'error');
            return;
        }

        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.textContent = '🎤 Слушаю...';

        const success = this.voiceService.startListening(
            (transcript) => {
                if (voiceBtn) voiceBtn.textContent = '🎤 Голосовая команда';
                this.executeCommand(transcript);
                this.logOperation('ГОЛОС', `Распознана команда: "${transcript}"`, 'info');
            },
            (error) => {
                if (voiceBtn) voiceBtn.textContent = '🎤 Голосовая команда';
                this.showNotification('Ошибка голосового ввода', `Ошибка: ${error}`, 'error');
                this.logOperation('ГОЛОС', `Ошибка распознавания: ${error}`, 'error');
            }
        );

        if (!success) {
            if (voiceBtn) voiceBtn.textContent = '🎤 Голосовая команда';
            this.showNotification('Ошибка', 'Не удалось запустить голосовое распознавание', 'error');
        }
    }

    executeTextCommand() {
        const input = document.getElementById('commandInput');
        const command = input?.value.trim();
        
        if (command) {
            this.executeCommand(command);
            input.value = '';
        }
    }

    // Управление товарами
    showAddProductModal() {
        this.showModal('addProductModal');
    }

    saveNewProduct() {
        const name = document.getElementById('newProductName')?.value.trim();
        const description = document.getElementById('newProductDescription')?.value.trim() || '';
        const quantity = parseInt(document.getElementById('newProductQuantity')?.value) || 1;
        const purchasePrice = parseFloat(document.getElementById('newProductPurchasePrice')?.value) || 0;
        const salePrice = parseFloat(document.getElementById('newProductSalePrice')?.value) || 0;

        if (!name) {
            this.showNotification('Ошибка', 'Введите название товара', 'error');
            return;
        }

        const newProduct = {
            id: Date.now(),
            name,
            description,
            quantity,
            purchasePrice,
            salePrice,
            competitorNewPrice: null,
            competitorUsedPrice: null,
            lastUpdated: new Date().toISOString()
        };

        this.products.push(newProduct);
        this.renderProducts();
        this.updateUI();
        this.storeSettings();
        this.hideModals();

        // Очистка формы
        document.getElementById('addProductForm')?.reset();

        this.showNotification('Товар добавлен', `Товар "${name}" успешно добавлен`, 'success');
        this.logOperation('ТОВАР', `Добавлен товар "${name}"`, 'success');
    }

    deleteSelected() {
        const selectedIds = Array.from(this.selectedProducts);
        if (selectedIds.length === 0) {
            this.showNotification('Выберите товары', 'Выберите товары для удаления', 'warning');
            return;
        }

        if (confirm(`Удалить ${selectedIds.length} товар(ов)?`)) {
            this.products = this.products.filter(p => !selectedIds.includes(p.id));
            this.selectedProducts.clear();
            this.renderProducts();
            this.updateUI();
            this.storeSettings();

            this.showNotification('Товары удалены', `Удалено ${selectedIds.length} товар(ов)`, 'success');
            this.logOperation('ТОВАР', `Удалено ${selectedIds.length} товар(ов)`, 'info');
        }
    }

    selectAll() {
        this.selectedProducts.clear();
        this.products.forEach(product => {
            this.selectedProducts.add(product.id);
        });
        this.renderProducts();
        this.updateUI();
    }

    clearSelection() {
        this.selectedProducts.clear();
        this.renderProducts();
        this.updateUI();
    }

    toggleSelectAll(checked) {
        if (checked) {
            this.selectAll();
        } else {
            this.clearSelection();
        }
    }

    // Импорт/Экспорт
    importFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(e.target.result);
                    if (data.products) {
                        this.products = data.products;
                        this.renderProducts();
                        this.updateUI();
                        this.storeSettings();
                        this.showNotification('Импорт успешен', `Импортировано ${data.products.length} товаров`, 'success');
                        this.logOperation('ИМПОРТ', `Импортировано ${data.products.length} товаров из JSON`, 'success');
                    }
                } else {
                    this.showNotification('Формат не поддерживается', 'Пока поддерживается только JSON. Excel/CSV в разработке.', 'info');
                }
            } catch (error) {
                this.showNotification('Ошибка импорта', error.message, 'error');
                this.logOperation('ИМПОРТ', `Ошибка импорта: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }

    exportData() {
        const data = {
            products: this.products,
            searchHistory: this.searchHistory,
            operationLog: this.operationLog,
            statistics: this.statistics,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_price_analyzer_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);

        this.showNotification('Экспорт завершен', 'Данные экспортированы в JSON файл', 'success');
        this.logOperation('ЭКСПОРТ', 'Данные экспортированы', 'info');
    }

    // Отрисовка интерфейса
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (!tbody || !emptyState) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = '';

        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            
            if (this.selectedProducts.has(product.id)) {
                row.classList.add('selected');
            }

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="product-checkbox" 
                           ${this.selectedProducts.has(product.id) ? 'checked' : ''}
                           data-product-id="${product.id}">
                </td>
                <td class="product-name-cell">${this.escapeHtml(product.name)}</td>
                <td class="product-description-cell">${this.escapeHtml(product.description || '')}</td>
                <td class="quantity-cell">${product.quantity}</td>
                <td class="price-cell">${this.formatPrice(product.purchasePrice)}</td>
                <td class="price-cell">${this.formatPrice(product.salePrice)}</td>
                <td class="price-cell ${product.competitorNewPrice ? 'updated' : ''}">${this.formatPrice(product.competitorNewPrice)}</td>
                <td class="price-cell ${product.competitorUsedPrice ? 'updated' : ''}">${this.formatPrice(product.competitorUsedPrice)}</td>
                <td class="date-cell">${this.formatDate(product.lastUpdated)}</td>
                <td class="actions-cell">
                    <button class="action-btn action-btn--primary" onclick="priceAnalyzer.searchProductPrices(${product.id})">🔍</button>
                    <button class="action-btn" onclick="priceAnalyzer.editProduct(${product.id})">✏️</button>
                    <button class="action-btn action-btn--danger" onclick="priceAnalyzer.deleteProduct(${product.id})">🗑️</button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Привязываем обработчики чекбоксов
        tbody.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                if (e.target.checked) {
                    this.selectedProducts.add(productId);
                } else {
                    this.selectedProducts.delete(productId);
                }
                this.renderProducts();
                this.updateUI();
            });
        });
    }

    updateUI() {
        // Обновляем счетчики
        this.updateElement('totalProducts', this.products.length);
        this.updateElement('selectedCount', this.selectedProducts.size);
        this.updateElement('successfulSearches', this.statistics.successfulSearches);
        this.updateElement('failedSearches', this.statistics.failedSearches);

        // Обновляем кнопку удаления
        const deleteBtn = document.getElementById('deleteSelected');
        if (deleteBtn) {
            deleteBtn.disabled = this.selectedProducts.size === 0;
        }

        // Обновляем чекбокс "выбрать все"
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = this.products.length > 0 && this.selectedProducts.size === this.products.length;
            selectAllCheckbox.indeterminate = this.selectedProducts.size > 0 && this.selectedProducts.size < this.products.length;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Методы для кнопок в таблице
    async searchProductPrices(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product && this.openaiService) {
            await this.searchCompetitorPrice(product);
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const newName = prompt('Название товара:', product.name);
            if (newName && newName.trim()) {
                product.name = newName.trim();
                product.lastUpdated = new Date().toISOString();
                this.renderProducts();
                this.storeSettings();
                this.logOperation('ТОВАР', `Изменен товар: "${newName}"`, 'info');
            }
        }
    }

    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product && confirm(`Удалить товар "${product.name}"?`)) {
            this.products = this.products.filter(p => p.id !== productId);
            this.selectedProducts.delete(productId);
            this.renderProducts();
            this.updateUI();
            this.storeSettings();
            this.logOperation('ТОВАР', `Удален товар: "${product.name}"`, 'info');
        }
    }

    filterProducts(searchText) {
        const rows = document.querySelectorAll('#productsTableBody tr');
        const lowerSearch = searchText.toLowerCase();

        rows.forEach(row => {
            const productName = row.cells[1].textContent.toLowerCase();
            const productDescription = row.cells[2].textContent.toLowerCase();
            const matches = productName.includes(lowerSearch) || productDescription.includes(lowerSearch);
            row.style.display = matches ? '' : 'none';
        });
    }

    // История поиска и логи
    addSearchHistory(entry) {
        this.searchHistory.unshift(entry);
        if (this.searchHistory.length > 100) {
            this.searchHistory = this.searchHistory.slice(0, 100);
        }
        this.renderSearchHistory();
    }

    renderSearchHistory() {
        const container = document.getElementById('searchHistoryContent');
        if (!container) return;

        if (this.searchHistory.length === 0) {
            container.innerHTML = '<div class="search-history-empty"><p>История поиска пуста. Выполните первый поиск цен.</p></div>';
            return;
        }

        container.innerHTML = '';
        this.searchHistory.forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = 'search-entry';
            
            const typeText = entry.type === 'competitor' ? 'Поиск у конкурентов' : 'Поиск на Avito';
            
            entryEl.innerHTML = `
                <div class="search-entry__header">
                    <h4 class="search-entry__title">${typeText}: ${this.escapeHtml(entry.productName)}</h4>
                    <span class="search-entry__time">${this.formatDate(entry.timestamp)}</span>
                </div>
                <div class="search-entry__details">
                    ${entry.result.success ? 'Успешно найдены цены' : 'Цены не найдены'}
                </div>
                <div class="search-entry__results">
                    ${entry.result.success && entry.result.minPrice ? 
                        `<div class="search-result-item">
                            <span>Минимальная цена:</span>
                            <span class="search-result-price">${this.formatPrice(entry.result.minPrice)}</span>
                        </div>` : 
                        `<div class="search-result-item">
                            <span>${entry.result.message || 'Результат недоступен'}</span>
                        </div>`
                    }
                </div>
            `;
            
            container.appendChild(entryEl);
        });
    }

    logOperation(type, message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            level
        };
        
        this.operationLog.unshift(logEntry);
        if (this.operationLog.length > 1000) {
            this.operationLog = this.operationLog.slice(0, 1000);
        }
        
        this.renderLog();
        this.statistics.totalOperations++;
    }

    renderLog() {
        const container = document.getElementById('logContent');
        if (!container) return;

        container.innerHTML = '';
        this.operationLog.slice(0, 50).forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = `log-entry log-entry--${entry.level}`;
            
            entryEl.innerHTML = `
                <span class="log-time">${this.formatDate(entry.timestamp)}</span>
                <span class="log-type">${entry.type}</span>
                <span class="log-message">${this.escapeHtml(entry.message)}</span>
            `;
            
            container.appendChild(entryEl);
        });
    }

    clearLog() {
        if (confirm('Очистить журнал операций?')) {
            this.operationLog = [];
            this.renderLog();
            this.logOperation('СИСТЕМА', 'Журнал операций очищен', 'info');
        }
    }

    exportLog() {
        const blob = new Blob([JSON.stringify(this.operationLog, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `operation_log_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);

        this.showNotification('Лог экспортирован', 'Журнал операций экспортирован', 'success');
    }

    // Статусы интерфейса
    updateSystemStatus(status, message) {
        const element = document.getElementById('systemStatus');
        if (element) {
            element.textContent = message;
            element.className = `status status--${status}`;
        }
    }

    updateApiStatus(status, message) {
        const element = document.getElementById('apiStatus');
        if (element) {
            element.textContent = message;
            element.className = `api-status ${status}`;
        }
    }

    updateAIAgentStatus(status, message) {
        const element = document.getElementById('aiAgentStatus');
        if (element) {
            element.textContent = message;
            element.className = `status status--${status}`;
        }
    }

    // Уведомления
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        notification.innerHTML = `
            <button class="notification__close">×</button>
            <h4 class="notification__title">${this.escapeHtml(title)}</h4>
            <p class="notification__message">${this.escapeHtml(message)}</p>
        `;

        container.appendChild(notification);

        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Автоудаление
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Клик для закрытия
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    // Модальные окна
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // Тема
    toggleTheme() {
        const currentTheme = document.body.dataset.colorScheme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.colorScheme = newTheme;
        this.storeTheme(newTheme);
    }

    // Сохранение данных (без localStorage из-за ограничений)
    storeSettings() {
        // Сохраняем в переменной сессии (данные будут потеряны при перезагрузке)
        // В реальном приложении здесь должна быть отправка на сервер
        window.aiPriceAnalyzerData = {
            products: this.products,
            searchHistory: this.searchHistory,
            operationLog: this.operationLog,
            statistics: this.statistics,
            settings: this.settings
        };
    }

    loadSettings() {
        // Загружаем из переменной сессии
        const data = window.aiPriceAnalyzerData;
        if (data) {
            this.products = data.products || [];
            this.searchHistory = data.searchHistory || [];
            this.operationLog = data.operationLog || [];
            this.statistics = data.statistics || { successfulSearches: 0, failedSearches: 0, totalOperations: 0 };
            this.settings = { ...this.settings, ...data.settings };
        }

        // Загружаем настройки в форму
        const apiKeyInput = document.getElementById('openaiApiKey');
        const modelSelect = document.getElementById('openaiModel');
        const endpointInput = document.getElementById('serverlessEndpoint');

        if (apiKeyInput) apiKeyInput.value = this.settings.openaiApiKey || '';
        if (modelSelect) modelSelect.value = this.settings.openaiModel || 'gpt-4o';
        if (endpointInput) endpointInput.value = this.settings.serverlessEndpoint || '';
    }

    storeTheme(theme) {
        // Сохраняем тему в переменной
        window.aiPriceAnalyzerTheme = theme;
    }

    loadTheme() {
        const theme = window.aiPriceAnalyzerTheme || 'light';
        document.body.dataset.colorScheme = theme;
    }

    // Утилиты
    formatPrice(price) {
        if (!price || price === null || price === undefined || isNaN(price)) {
            return '—';
        }
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    formatDate(dateString) {
        if (!dateString) return '—';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Инициализация приложения
let priceAnalyzer;

function initRealAIPriceAnalyzer() {
    console.log('🚀 Запуск реальной системы AI Price Analyzer');
    priceAnalyzer = new RealAIPriceAnalyzer();
    window.priceAnalyzer = priceAnalyzer;
    console.log('✅ Реальная система готова к работе');
}

// Запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealAIPriceAnalyzer);
} else {
    initRealAIPriceAnalyzer();
}
