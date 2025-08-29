/**
 * AI Price Analyzer - ПОЛНОСТЬЮ ПРОЗРАЧНАЯ СИСТЕМА
 * Показывает ВСЁ: промпты, запросы, ответы, обработку
 */

// Конфигурация системы
const CONFIG = {
    OPENAI_API: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4o',
    MAX_TOKENS: 3000,
    TEMPERATURE: 0.1,
    TEST_PRODUCTS: [
        { name: 'iPhone 15 Pro 128GB', description: 'Новый iPhone 15 Pro 128GB черный', quantity: 5, purchasePrice: 85000, salePrice: 95000 },
        { name: 'Samsung Galaxy S24 Ultra', description: 'Samsung Galaxy S24 Ultra 256GB', quantity: 3, purchasePrice: 75000, salePrice: 85000 },
        { name: 'MacBook Air M2', description: 'MacBook Air 13" M2 256GB', quantity: 2, purchasePrice: 95000, salePrice: 110000 },
        { name: 'AirPods Pro 2', description: 'Apple AirPods Pro 2 поколение', quantity: 10, purchasePrice: 18000, salePrice: 22000 }
    ]
};

// Класс для максимально прозрачного логирования
class TransparencyLogger {
    constructor() {
        this.logs = [];
        this.currentOperation = null;
        
        // Инициализируем базовые записи
        this.log('СИСТЕМА', 'Система прозрачности инициализирована', 'info');
        this.showInitialTransparencyInfo();
    }

    showInitialTransparencyInfo() {
        // Показываем начальную информацию в панели прозрачности
        this.updatePromptDisplay('Система готова. Промпт будет показан здесь перед отправкой в OpenAI API.\n\nПример того, что вы увидите:\n- Системный промпт для поиска цен\n- Пользовательский запрос\n- Параметры запроса');
        
        this.updateAPIRequestDisplay({
            "info": "JSON запрос появится здесь",
            "example": {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "системный промпт..."},
                    {"role": "user", "content": "пользовательский запрос..."}
                ],
                "temperature": 0.1,
                "max_tokens": 3000
            }
        });
        
        this.updateAPIResponseDisplay('Полный ответ от OpenAI API будет показан здесь БЕЗ ОБРАБОТКИ\n\nВы увидите:\n- Полный JSON ответ\n- Использованные токены\n- Время обработки\n- Все метаданные');
        
        this.updateProcessedResultDisplay({
            "info": "Обработанный результат появится здесь",
            "example": {
                "operation": "поиск цен",
                "success": true,
                "extractedData": "данные из ответа AI",
                "appliedToTable": "как данные применились к таблице"
            }
        });
    }

    updatePromptDisplay(content) {
        const display = document.getElementById('currentPromptDisplay');
        if (display) {
            display.value = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        }
    }

    updateAPIRequestDisplay(data) {
        const display = document.getElementById('apiRequestDisplay');
        if (display) {
            display.textContent = JSON.stringify(data, null, 2);
        }
    }

    updateAPIResponseDisplay(content) {
        const display = document.getElementById('apiResponseDisplay');
        if (display) {
            display.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        }
    }

    updateProcessedResultDisplay(data) {
        const display = document.getElementById('processedResultDisplay');
        if (display) {
            display.textContent = JSON.stringify(data, null, 2);
        }
    }

    startOperation(operationName, details = '') {
        this.currentOperation = {
            name: operationName,
            startTime: new Date().toISOString(),
            steps: [],
            details
        };
        
        this.log('ОПЕРАЦИЯ', `🚀 НАЧАЛО: ${operationName}${details ? ' - ' + details : ''}`, 'ai');
        this.updateTransparencyStatus(`Выполняется: ${operationName}`);
    }

    addStep(stepName, data, stepType = 'info') {
        if (!this.currentOperation) return;
        
        const step = {
            name: stepName,
            timestamp: new Date().toISOString(),
            data: data,
            type: stepType
        };
        
        this.currentOperation.steps.push(step);
        this.log('ШАГ', `${stepName}`, stepType);
        
        // Показываем данные если они есть
        if (data && typeof data === 'object') {
            this.log('ДАННЫЕ', JSON.stringify(data, null, 2), stepType);
        } else if (data) {
            this.log('ДАННЫЕ', String(data), stepType);
        }
    }

    endOperation(result = null, error = null) {
        if (!this.currentOperation) return;
        
        this.currentOperation.endTime = new Date().toISOString();
        this.currentOperation.duration = new Date(this.currentOperation.endTime) - new Date(this.currentOperation.startTime);
        this.currentOperation.result = result;
        this.currentOperation.error = error;
        
        if (error) {
            this.log('ОПЕРАЦИЯ', `❌ ОШИБКА: ${this.currentOperation.name} - ${error}`, 'error');
        } else {
            this.log('ОПЕРАЦИЯ', `✅ ЗАВЕРШЕНО: ${this.currentOperation.name} (${this.currentOperation.duration}ms)`, 'success');
        }
        
        this.currentOperation = null;
        this.updateTransparencyStatus('Готово к отслеживанию');
    }

    log(type, message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            level
        };
        
        this.logs.unshift(logEntry);
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }
        
        this.renderLogs();
        console.log(`[${type}] ${message}`);
    }

    renderLogs() {
        const container = document.getElementById('logContent');
        const filter = document.getElementById('logFilter')?.value || 'all';
        
        if (!container) return;

        let filteredLogs = this.logs;
        if (filter !== 'all') {
            filteredLogs = this.logs.filter(log => {
                switch (filter) {
                    case 'ai': return ['ОПЕРАЦИЯ', 'ШАГ', 'ПРОМПТ', 'API', 'ОТВЕТ'].includes(log.type);
                    case 'api': return ['API', 'ОТВЕТ', 'ЗАПРОС'].includes(log.type);
                    case 'error': return log.level === 'error';
                    default: return true;
                }
            });
        }

        container.innerHTML = '';
        filteredLogs.slice(0, 100).forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = `log-entry log-entry--${entry.level}`;
            
            entryEl.innerHTML = `
                <span class="log-time">${this.formatTime(entry.timestamp)}</span>
                <span class="log-type">${entry.type}</span>
                <span class="log-message">${this.escapeHtml(entry.message)}</span>
            `;
            
            container.appendChild(entryEl);
        });
    }

    updateTransparencyStatus(status) {
        const element = document.getElementById('transparencyStatus');
        if (element) {
            element.textContent = status;
            element.className = 'status status--info';
        }
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
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

// Класс для работы с OpenAI API с полной прозрачностью
class TransparentOpenAIService {
    constructor(apiKey, model = CONFIG.DEFAULT_MODEL) {
        this.apiKey = apiKey;
        this.model = model;
        this.logger = null;
    }

    setLogger(logger) {
        this.logger = logger;
    }

    async makeRequest(messages, operationName = 'OpenAI запрос') {
        if (!this.apiKey) {
            throw new Error('OpenAI API ключ не настроен');
        }

        if (this.logger) {
            this.logger.startOperation(operationName);
            this.logger.addStep('Подготовка запроса', { model: this.model, messagesCount: messages.length });
        }

        // 1. ПОКАЗЫВАЕМ ПРОМПТ
        this.displayPrompt(messages);
        if (this.logger) {
            this.logger.addStep('Промпт отображен пользователю', messages[0]?.content?.substring(0, 200) + '...');
        }

        // 2. ПОКАЗЫВАЕМ JSON ЗАПРОС
        const requestData = {
            model: this.model,
            messages: messages,
            temperature: CONFIG.TEMPERATURE,
            max_tokens: CONFIG.MAX_TOKENS
        };
        
        this.displayAPIRequest(requestData);
        if (this.logger) {
            this.logger.addStep('JSON запрос подготовлен', requestData);
        }

        // 3. ОТПРАВЛЯЕМ ЗАПРОС
        if (this.logger) {
            this.logger.addStep('Отправка запроса к OpenAI API', CONFIG.OPENAI_API);
        }

        try {
            const response = await fetch(CONFIG.OPENAI_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                const error = `HTTP ${response.status}: ${errorText}`;
                if (this.logger) {
                    this.logger.endOperation(null, error);
                }
                throw new Error(error);
            }

            const data = await response.json();
            
            // 4. ПОКАЗЫВАЕМ ПОЛНЫЙ ОТВЕТ
            this.displayAPIResponse(data);
            if (this.logger) {
                this.logger.addStep('Получен ответ от OpenAI', {
                    tokensUsed: data.usage?.total_tokens,
                    model: data.model,
                    responseLength: data.choices[0]?.message?.content?.length
                });
            }

            const content = data.choices[0].message.content;

            // 5. ПОКАЗЫВАЕМ ОБРАБОТКУ
            const processedResult = this.processResponse(content, operationName);
            this.displayProcessedResult(processedResult, operationName);
            
            if (this.logger) {
                this.logger.addStep('Результат обработан', processedResult);
                this.logger.endOperation(processedResult);
            }

            return processedResult;

        } catch (error) {
            if (this.logger) {
                this.logger.endOperation(null, error.message);
            }
            
            this.displayError(error);
            throw error;
        }
    }

    displayPrompt(messages) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessage = messages.find(m => m.role === 'user');
        
        let promptText = '';
        if (systemMessage) {
            promptText += `СИСТЕМНЫЙ ПРОМПТ:\n${systemMessage.content}\n\n`;
        }
        if (userMessage) {
            promptText += `ПОЛЬЗОВАТЕЛЬСКИЙ ЗАПРОС:\n${userMessage.content}`;
        }
        
        this.logger?.updatePromptDisplay(promptText);
        this.activateTransparencySection('prompt');
    }

    displayAPIRequest(requestData) {
        this.logger?.updateAPIRequestDisplay(requestData);

        const stats = document.getElementById('responseStats');
        if (stats) {
            stats.textContent = `Модель: ${requestData.model} | Токены: ${requestData.max_tokens} | Температура: ${requestData.temperature}`;
        }

        this.activateTransparencySection('request');
    }

    displayAPIResponse(data) {
        this.logger?.updateAPIResponseDisplay(data);

        const stats = document.getElementById('responseStats');
        if (stats) {
            const usage = data.usage || {};
            stats.textContent = `Использовано токенов: ${usage.total_tokens || 'н/д'} | Входных: ${usage.prompt_tokens || 'н/д'} | Выходных: ${usage.completion_tokens || 'н/д'}`;
        }

        this.activateTransparencySection('response');
    }

    displayProcessedResult(result, operationName) {
        const processInfo = {
            operation: operationName,
            timestamp: new Date().toISOString(),
            resultType: typeof result,
            processedData: result
        };
        
        this.logger?.updateProcessedResultDisplay(processInfo);
        this.activateTransparencySection('result');
    }

    processResponse(content, operationName) {
        try {
            let cleanContent = content.trim();
            
            cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    operation: operationName,
                    rawContent: content,
                    parsedData: parsed,
                    processingMethod: 'JSON extraction'
                };
            }
            
            return {
                success: false,
                operation: operationName,
                rawContent: content,
                parsedData: null,
                processingMethod: 'raw text',
                error: 'JSON не найден в ответе'
            };
            
        } catch (error) {
            return {
                success: false,
                operation: operationName,
                rawContent: content,
                parsedData: null,
                processingMethod: 'error',
                error: error.message
            };
        }
    }

    displayError(error) {
        const errorInfo = `ОШИБКА: ${error.message}\nВремя: ${new Date().toISOString()}`;
        
        this.logger?.updatePromptDisplay(errorInfo);
        this.logger?.updateAPIRequestDisplay({ error: error.message, timestamp: new Date().toISOString() });
        this.logger?.updateAPIResponseDisplay(errorInfo);
        this.logger?.updateProcessedResultDisplay({ error: error.message, timestamp: new Date().toISOString() });
    }

    activateTransparencySection(section) {
        document.querySelectorAll('.transparency-section').forEach(el => {
            el.classList.remove('active');
        });

        const sectionMap = { 'prompt': 0, 'request': 1, 'response': 2, 'result': 3 };
        const sections = document.querySelectorAll('.transparency-section');
        const targetSection = sections[sectionMap[section]];
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// AI Агент для поиска цен конкурентов
class CompetitorPriceAgent {
    constructor(openaiService, logger) {
        this.openaiService = openaiService;
        this.logger = logger;
        this.customPrompt = null;
    }

    getSystemPrompt(productName) {
        if (this.customPrompt) {
            return this.customPrompt.replace('{PRODUCT_NAME}', productName);
        }

        return `СИСТЕМА: Специалист по поиску цен товаров в российских интернет-магазинах

ЗАДАЧА: Найти РЕАЛЬНУЮ минимальную цену на товар "${productName}" у российских конкурентов

АЛГОРИТМ ПОИСКА:
1. Анализировать актуальную информацию о российских интернет-магазинах
2. Проверить основные площадки: Wildberries, Ozon, Яндекс.Маркет, DNS, М.Видео, Ситилинк, Эльдорадо
3. Найти РЕАЛЬНЫЕ цены с АКТУАЛЬНЫМИ данными
4. Выбрать МИНИМАЛЬНУЮ цену среди найденных

СТРОГИЙ ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
  "success": true,
  "productName": "${productName}",
  "searchTimestamp": "${new Date().toISOString()}",
  "minPrice": 89990,
  "currency": "RUB",
  "bestOffer": {
    "siteName": "Wildberries",
    "price": 89990,
    "productUrl": "https://wildberries.ru/catalog/12345/detail.aspx",
    "productTitle": "Точное название товара на сайте",
    "availability": "в наличии",
    "deliveryInfo": "доставка завтра"
  },
  "allOffers": [
    {
      "siteName": "Wildberries",
      "price": 89990,
      "productUrl": "https://wildberries.ru/catalog/12345/detail.aspx",
      "availability": "в наличии"
    },
    {
      "siteName": "Ozon", 
      "price": 92000,
      "productUrl": "https://ozon.ru/product/iphone-15-pro-123456",
      "availability": "в наличии"
    }
  ],
  "searchSummary": {
    "totalSitesChecked": 7,
    "sitesWithProduct": 5,
    "priceRange": "89990 - 95000 руб",
    "averagePrice": 91995,
    "searchMethod": "актуальный поиск по сайтам"
  }
}

ЕСЛИ товар НЕ НАЙДЕН:
{
  "success": false,
  "productName": "${productName}",
  "message": "Товар не найден у конкурентов или недоступен для поиска",
  "searchDetails": "Подробное описание попыток поиска",
  "searchSummary": {
    "totalSitesChecked": 7,
    "sitesWithProduct": 0,
    "searchMethod": "поиск по основным площадкам"
  }
}

ВАЖНО: 
- Используй ТОЛЬКО актуальную информацию о ценах
- НЕ выдумывай цены или ссылки
- Если не можешь найти реальные цены - верни success: false
- ВСЕ URL должны быть РЕАЛЬНЫМИ`;
    }

    async searchPrice(productName) {
        const systemPrompt = this.getSystemPrompt(productName);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Найди минимальную цену товара "${productName}" у российских конкурентов. Используй актуальную информацию.` }
        ];

        const result = await this.openaiService.makeRequest(messages, `Поиск цен конкурентов: ${productName}`);
        return result;
    }

    setCustomPrompt(prompt) {
        this.customPrompt = prompt;
        this.logger.log('ПРОМПТ', 'Установлен кастомный промпт для поиска цен', 'info');
    }

    resetPrompt() {
        this.customPrompt = null;
        this.logger.log('ПРОМПТ', 'Сброс к стандартному промпту для поиска цен', 'info');
    }
}

// AI Агент для поиска б/у товаров на Avito
class AvitoSearchAgent {
    constructor(openaiService, logger) {
        this.openaiService = openaiService;
        this.logger = logger;
    }

    getSystemPrompt(productName) {
        return `СИСТЕМА: Специалист по поиску б/у товаров на Avito.ru

ЗАДАЧА: Найти минимальную цену б/у товара "${productName}" на Avito.ru

АЛГОРИТМ:
1. Поиск ТОЛЬКО на avito.ru по всей России
2. Сортировка по цене от минимальной
3. Анализ ТОЛЬКО б/у товаров (не новых)
4. Выбор лучших предложений

СТРОГИЙ ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
  "success": true,
  "productName": "${productName}",
  "searchUrl": "https://www.avito.ru/rossiya?q=${encodeURIComponent(productName)}&s=104",
  "searchTimestamp": "${new Date().toISOString()}",
  "minPrice": 45000,
  "currency": "RUB",
  "bestOffer": {
    "title": "Название объявления",
    "price": 45000,
    "location": "Москва",
    "url": "https://avito.ru/moskva/...",
    "seller": "частное лицо",
    "condition": "б/у",
    "description": "Краткое описание"
  },
  "allOffers": [
    {
      "title": "Название объявления 1",
      "price": 45000,
      "location": "Москва",
      "url": "https://avito.ru/link1",
      "condition": "б/у"
    },
    {
      "title": "Название объявления 2",
      "price": 47000,
      "location": "СПб",
      "url": "https://avito.ru/link2", 
      "condition": "б/у"
    }
  ],
  "searchSummary": {
    "totalOffersFound": 25,
    "priceRange": "45000 - 65000 руб",
    "averagePrice": 52000,
    "topCities": ["Москва", "СПб", "Екатеринбург"]
  }
}

ЕСЛИ товар НЕ НАЙДЕН:
{
  "success": false,
  "productName": "${productName}",
  "message": "Б/у товар не найден на Avito",
  "searchUrl": "https://www.avito.ru/rossiya?q=${encodeURIComponent(productName)}",
  "searchDetails": "Подробности неудачного поиска"
}`;
    }

    async searchUsedPrice(productName) {
        const systemPrompt = this.getSystemPrompt(productName);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Найди минимальную цену б/у товара "${productName}" на Avito.ru по всей России.` }
        ];

        const result = await this.openaiService.makeRequest(messages, `Поиск б/у цен на Avito: ${productName}`);
        return result;
    }
}

// Основной класс приложения
class TransparentAIPriceAnalyzer {
    constructor() {
        this.logger = new TransparencyLogger();
        this.products = [];
        this.selectedProducts = new Set();
        this.settings = {
            openaiApiKey: '',
            openaiModel: CONFIG.DEFAULT_MODEL
        };
        this.openaiService = null;
        this.competitorAgent = null;
        this.avitoAgent = null;
        this.isProcessing = false;
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
        console.log('🚀 Запуск полностью прозрачной системы AI Price Analyzer');
        
        this.loadSettings();
        this.setupEventListeners();
        this.renderProducts();
        this.updateUI();
        this.logger.log('СИСТЕМА', 'AI Price Analyzer запущен с полной прозрачностью', 'info');
        
        if (this.settings.openaiApiKey) {
            this.initializeAIServices();
        }

        console.log('✅ Прозрачная система готова к работе');
    }

    setupEventListeners() {
        console.log('🔧 Настройка обработчиков событий');
        
        // Настройки
        this.bindEvent('saveSettings', 'click', () => this.saveSettings());
        this.bindEvent('testConnection', 'click', () => this.testConnection());
        
        // Товары - ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ
        this.bindEvent('addProductBtn', 'click', () => {
            console.log('Клик по кнопке добавления товара');
            this.logger.log('UI', 'Клик по кнопке добавления товара', 'info');
            this.showAddProductModal();
        });
        
        this.bindEvent('addTestData', 'click', () => {
            console.log('Клик по кнопке добавления тестовых данных');
            this.logger.log('UI', 'Клик по кнопке добавления тестовых данных', 'info');
            this.addTestProducts();
        });
        
        this.bindEvent('productSearch', 'input', (e) => this.filterProducts(e.target.value));
        
        // Выбор товаров
        this.bindEvent('selectAll', 'change', (e) => this.toggleSelectAll(e.target.checked));
        this.bindEvent('selectAllBtn', 'click', () => this.selectAll());
        this.bindEvent('clearSelection', 'click', () => this.clearSelection());
        this.bindEvent('deleteSelected', 'click', () => this.deleteSelected());
        
        // AI команды
        this.bindEvent('executeCommand', 'click', () => this.executeTextCommand());
        this.bindEvent('commandInput', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeTextCommand();
            }
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
        
        // Закрытие модальных окон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });
        
        // Backdrop clicks
        document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => this.hideModals());
        });
        
        // Прозрачность
        this.bindEvent('editPromptBtn', 'click', () => this.showEditPromptModal());
        this.bindEvent('resetPromptBtn', 'click', () => this.resetPrompt());
        this.bindEvent('copyRequestBtn', 'click', () => this.copyToClipboard('apiRequestDisplay'));
        this.bindEvent('copyResponseBtn', 'click', () => this.copyToClipboard('apiResponseDisplay'));
        this.bindEvent('copyResultBtn', 'click', () => this.copyToClipboard('processedResultDisplay'));
        
        // Редактирование промпта
        this.bindEvent('saveCustomPrompt', 'click', () => this.saveCustomPrompt());
        this.bindEvent('resetCustomPrompt', 'click', () => this.resetCustomPrompt());
        
        // Лог
        this.bindEvent('clearLog', 'click', () => this.clearLog());
        this.bindEvent('exportLog', 'click', () => this.exportLog());
        this.bindEvent('logFilter', 'change', () => this.logger.renderLogs());
        
        // Тема
        this.bindEvent('themeToggle', 'click', () => this.toggleTheme());
        
        console.log('✅ Обработчики событий настроены');
        this.logger.log('СИСТЕМА', 'Обработчики событий настроены', 'success');
    }

    bindEvent(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`✅ Обработчик для ${id} добавлен`);
        } else {
            console.warn(`❌ Element ${id} not found`);
        }
    }

    initializeAIServices() {
        this.openaiService = new TransparentOpenAIService(
            this.settings.openaiApiKey,
            this.settings.openaiModel
        );
        
        this.openaiService.setLogger(this.logger);
        
        this.competitorAgent = new CompetitorPriceAgent(this.openaiService, this.logger);
        this.avitoAgent = new AvitoSearchAgent(this.openaiService, this.logger);

        this.updateSystemStatus('success', 'AI сервисы активированы с полной прозрачностью');
        this.enableAIControls();
        
        this.logger.log('СИСТЕМА', 'AI сервисы инициализированы с логгером прозрачности', 'success');
    }

    enableAIControls() {
        const executeBtn = document.getElementById('executeCommand');
        if (executeBtn) {
            executeBtn.removeAttribute('disabled');
            executeBtn.classList.remove('btn--loading');
        }
        
        document.querySelectorAll('.command-btn').forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('btn--loading');
        });
        
        const editPromptBtn = document.getElementById('editPromptBtn');
        const resetPromptBtn = document.getElementById('resetPromptBtn');
        if (editPromptBtn) editPromptBtn.removeAttribute('disabled');
        if (resetPromptBtn) resetPromptBtn.removeAttribute('disabled');
        
        this.updateAIAgentStatus('success', 'Агенты активны с прозрачностью');
    }

    async saveSettings() {
        const apiKey = document.getElementById('openaiApiKey')?.value.trim();
        const model = document.getElementById('openaiModel')?.value;

        if (!apiKey) {
            this.showNotification('Ошибка', 'Введите OpenAI API ключ', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showNotification('Ошибка', 'Неверный формат API ключа', 'error');
            return;
        }

        this.settings.openaiApiKey = apiKey;
        this.settings.openaiModel = model || CONFIG.DEFAULT_MODEL;

        this.storeSettings();
        this.initializeAIServices();
        
        this.showNotification('Настройки сохранены', 'API настройки успешно сохранены', 'success');
        this.logger.log('НАСТРОЙКИ', `API настройки обновлены: модель ${model}`, 'info');
    }

    async testConnection() {
        if (!this.openaiService) {
            this.updateApiStatus('error', 'API не настроен');
            return;
        }

        this.updateApiStatus('testing', 'Тестирование подключения...');
        this.logger.log('API', 'Начало теста подключения к OpenAI', 'info');

        try {
            const messages = [
                { role: 'user', content: 'Тест подключения. Ответь просто "OK".' }
            ];
            
            const result = await this.openaiService.makeRequest(messages, 'Тест подключения к OpenAI API');
            
            this.updateApiStatus('success', 'Подключение успешно');
            this.showNotification('Тест успешен', 'Подключение к OpenAI API работает', 'success');
            this.logger.log('API', 'Тест подключения успешен', 'success');
            
        } catch (error) {
            this.updateApiStatus('error', error.message);
            this.showNotification('Тест неудачен', error.message, 'error');
            this.logger.log('API', `Тест подключения неудачен: ${error.message}`, 'error');
        }
    }

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ - Добавление тестовых товаров
    addTestProducts() {
        console.log('🧪 Выполняется добавление тестовых товаров...');
        this.logger.log('ТОВАРЫ', '🧪 Начинаем добавление тестовых товаров', 'info');
        
        try {
            let addedCount = 0;
            CONFIG.TEST_PRODUCTS.forEach((productData, index) => {
                const newProduct = {
                    id: Date.now() + index + Math.random(),
                    name: productData.name,
                    description: productData.description,
                    quantity: productData.quantity,
                    purchasePrice: productData.purchasePrice,
                    salePrice: productData.salePrice,
                    competitorNewPrice: null,
                    competitorUsedPrice: null,
                    lastUpdated: new Date().toISOString()
                };
                
                this.products.push(newProduct);
                addedCount++;
                console.log(`Добавлен товар: ${newProduct.name}`);
            });

            console.log(`Всего добавлено товаров: ${addedCount}`);
            console.log('Текущие товары:', this.products);

            // Обновляем интерфейс
            this.renderProducts();
            this.updateUI();
            this.storeSettings();

            this.showNotification('Тестовые данные добавлены', `Добавлено ${addedCount} тестовых товаров`, 'success');
            this.logger.log('ТОВАРЫ', `✅ Успешно добавлено ${addedCount} тестовых товаров`, 'success');
            
        } catch (error) {
            console.error('Ошибка при добавлении тестовых товаров:', error);
            this.logger.log('ТОВАРЫ', `❌ Ошибка при добавлении тестовых товаров: ${error.message}`, 'error');
            this.showNotification('Ошибка', 'Не удалось добавить тестовые товары', 'error');
        }
    }

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
        this.showExecutionStatus(true, `Выполнение: ${commandText}`);
        this.logger.log('КОМАНДА', `🚀 Выполнение команды: "${commandText}"`, 'ai');

        try {
            const lowerCommand = commandText.toLowerCase();
            
            if (lowerCommand.includes('поиск цен у конкурентов') || lowerCommand.includes('найди цену')) {
                await this.handleCompetitorSearch();
            } else if (lowerCommand.includes('поиск б/у') || lowerCommand.includes('авито')) {
                await this.handleAvitoSearch();
            } else if (lowerCommand.includes('обновить все цены')) {
                await this.updateAllPrices();
            } else {
                this.showNotification('Неизвестная команда', 'Доступные команды: поиск цен, поиск б/у, обновить все', 'warning');
                this.logger.log('КОМАНДА', `❓ Неизвестная команда: "${commandText}"`, 'warning');
            }
            
        } catch (error) {
            this.showNotification('Ошибка выполнения', error.message, 'error');
            this.logger.log('КОМАНДА', `❌ Ошибка выполнения: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.showExecutionStatus(false);
        }
    }

    async handleCompetitorSearch() {
        const selectedIds = Array.from(this.selectedProducts);
        
        if (selectedIds.length === 0) {
            this.showNotification('Выберите товары', 'Выберите товары для поиска цен', 'warning');
            return;
        }

        this.logger.log('ПОИСК', `Начинаем поиск цен для ${selectedIds.length} товар(ов)`, 'ai');

        for (const productId of selectedIds) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                await this.searchCompetitorPrice(product);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.logger.log('ПОИСК', `✅ Завершен поиск цен для всех выбранных товаров`, 'success');
    }

    async handleAvitoSearch() {
        const selectedIds = Array.from(this.selectedProducts);
        
        if (selectedIds.length === 0) {
            this.showNotification('Выберите товары', 'Выберите товары для поиска б/у цен', 'warning');
            return;
        }

        this.logger.log('ПОИСК', `Начинаем поиск б/у цен для ${selectedIds.length} товар(ов)`, 'ai');

        for (const productId of selectedIds) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                await this.searchAvitoPrice(product);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.logger.log('ПОИСК', `✅ Завершен поиск б/у цен для всех выбранных товаров`, 'success');
    }

    async searchCompetitorPrice(product) {
        this.logger.log('ПОИСК', `🔍 Поиск цен конкурентов для "${product.name}"`, 'ai');
        
        try {
            const result = await this.competitorAgent.searchPrice(product.name);
            
            if (result.success && result.parsedData && result.parsedData.success) {
                const priceData = result.parsedData;
                product.competitorNewPrice = priceData.minPrice;
                product.lastUpdated = new Date().toISOString();
                
                this.renderProducts();
                this.storeSettings();
                
                this.showNotification('Цены найдены', `${product.name}: ${this.formatPrice(priceData.minPrice)}`, 'success');
                this.logger.log('ПОИСК', `✅ Найдена цена ${priceData.minPrice} руб для "${product.name}"`, 'success');
                
            } else {
                const errorMsg = result.parsedData?.message || result.error || 'Цены не найдены';
                this.showNotification('Цены не найдены', `${product.name}: ${errorMsg}`, 'warning');
                this.logger.log('ПОИСК', `❌ Цены не найдены для "${product.name}": ${errorMsg}`, 'warning');
            }
            
        } catch (error) {
            this.logger.log('ПОИСК', `❌ Ошибка поиска цен для "${product.name}": ${error.message}`, 'error');
            throw error;
        }
    }

    async searchAvitoPrice(product) {
        this.logger.log('ПОИСК', `🛒 Поиск б/у цен на Avito для "${product.name}"`, 'ai');
        
        try {
            const result = await this.avitoAgent.searchUsedPrice(product.name);
            
            if (result.success && result.parsedData && result.parsedData.success) {
                const priceData = result.parsedData;
                product.competitorUsedPrice = priceData.minPrice;
                product.lastUpdated = new Date().toISOString();
                
                this.renderProducts();
                this.storeSettings();
                
                this.showNotification('Б/у цены найдены', `${product.name}: ${this.formatPrice(priceData.minPrice)}`, 'success');
                this.logger.log('ПОИСК', `✅ Найдена б/у цена ${priceData.minPrice} руб для "${product.name}"`, 'success');
                
            } else {
                const errorMsg = result.parsedData?.message || result.error || 'Б/у цены не найдены';
                this.showNotification('Б/у цены не найдены', `${product.name}: ${errorMsg}`, 'warning');
                this.logger.log('ПОИСК', `❌ Б/у цены не найдены для "${product.name}": ${errorMsg}`, 'warning');
            }
            
        } catch (error) {
            this.logger.log('ПОИСК', `❌ Ошибка поиска б/у цен для "${product.name}": ${error.message}`, 'error');
            throw error;
        }
    }

    async updateAllPrices() {
        if (this.products.length === 0) {
            this.showNotification('Нет товаров', 'Добавьте товары для обновления цен', 'warning');
            return;
        }

        this.logger.log('СИСТЕМА', `🔄 Начинаем обновление цен для ${this.products.length} товаров`, 'ai');
        
        for (const product of this.products) {
            await this.searchCompetitorPrice(product);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        this.showNotification('Обновление завершено', 'Цены всех товаров обновлены', 'success');
        this.logger.log('СИСТЕМА', '✅ Обновление цен всех товаров завершено', 'success');
    }

    executeTextCommand() {
        const input = document.getElementById('commandInput');
        const command = input?.value.trim();
        
        if (command) {
            this.executeCommand(command);
            input.value = '';
        }
    }

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ - Модальные окна
    showAddProductModal() {
        console.log('📝 Открытие модального окна добавления товара');
        this.logger.log('UI', 'Открытие модального окна добавления товара', 'info');
        
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.classList.remove('hidden');
            console.log('✅ Модальное окно открыто');
            this.logger.log('UI', '✅ Модальное окно добавления товара открыто', 'success');
        } else {
            console.error('❌ Модальное окно не найдено');
            this.logger.log('UI', '❌ Модальное окно добавления товара не найдено', 'error');
        }
    }

    saveNewProduct() {
        console.log('💾 Сохранение нового товара');
        
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
        const form = document.getElementById('addProductForm');
        if (form) form.reset();

        this.showNotification('Товар добавлен', `Товар "${name}" успешно добавлен`, 'success');
        this.logger.log('ТОВАРЫ', `Добавлен товар "${name}"`, 'success');
        
        console.log('✅ Товар сохранен');
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
            this.logger.log('ТОВАРЫ', `Удалено ${selectedIds.length} товар(ов)`, 'info');
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

    // Прозрачность промптов
    showEditPromptModal() {
        const currentPrompt = this.competitorAgent ? this.competitorAgent.customPrompt || this.competitorAgent.getSystemPrompt('{PRODUCT_NAME}') : '';
        const editablePrompt = document.getElementById('editablePrompt');
        if (editablePrompt) editablePrompt.value = currentPrompt;
        this.showModal('editPromptModal');
    }

    saveCustomPrompt() {
        const customPrompt = document.getElementById('editablePrompt')?.value.trim();
        if (customPrompt && this.competitorAgent) {
            this.competitorAgent.setCustomPrompt(customPrompt);
            this.hideModals();
            this.showNotification('Промпт сохранен', 'Кастомный промпт будет использоваться для поиска цен', 'success');
        }
    }

    resetCustomPrompt() {
        if (this.competitorAgent) {
            this.competitorAgent.resetPrompt();
            this.hideModals();
            this.showNotification('Промпт сброшен', 'Восстановлен стандартный промпт', 'info');
        }
    }

    resetPrompt() {
        this.resetCustomPrompt();
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const text = element.textContent || element.value;
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Скопировано', 'Данные скопированы в буфер обмена', 'success');
            }).catch(() => {
                this.showNotification('Ошибка', 'Не удалось скопировать в буфер обмена', 'error');
            });
        }
    }

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ - Отрисовка интерфейса
    renderProducts() {
        console.log(`🎨 Отрисовка товаров. Всего товаров: ${this.products.length}`);
        
        const tbody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (!tbody || !emptyState) {
            console.error('❌ Элементы таблицы не найдены');
            return;
        }

        if (this.products.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            console.log('📋 Показан пустой стейт');
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = '';

        this.products.forEach((product, index) => {
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
            console.log(`✅ Добавлена строка для товара: ${product.name}`);
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
        
        console.log('✅ Товары отрисованы');
        this.logger.log('UI', `Отрисовано ${this.products.length} товаров в таблице`, 'success');
    }

    updateUI() {
        this.updateElement('totalProducts', this.products.length);
        this.updateElement('selectedCount', this.selectedProducts.size);

        const deleteBtn = document.getElementById('deleteSelected');
        if (deleteBtn) {
            deleteBtn.disabled = this.selectedProducts.size === 0;
        }

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
            this.selectedProducts.clear();
            this.selectedProducts.add(productId);
            await this.handleCompetitorSearch();
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
                this.logger.log('ТОВАРЫ', `Изменен товар: "${newName}"`, 'info');
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
            this.logger.log('ТОВАРЫ', `Удален товар: "${product.name}"`, 'info');
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

    showExecutionStatus(show, message = '') {
        const element = document.getElementById('executionStatus');
        const textElement = document.getElementById('executionStatusText');
        
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
        
        if (textElement && message) {
            textElement.textContent = message;
        }
    }

    // Лог операций
    clearLog() {
        if (confirm('Очистить журнал операций?')) {
            this.logger.logs = [];
            this.logger.renderLogs();
            this.logger.log('СИСТЕМА', 'Журнал операций очищен', 'info');
        }
    }

    exportLog() {
        const blob = new Blob([JSON.stringify(this.logger.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `transparent_ai_log_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);

        this.showNotification('Лог экспортирован', 'Детальный журнал операций экспортирован', 'success');
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

        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    // Модальные окна
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.logger.log('UI', `Открыто модальное окно: ${modalId}`, 'info');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.logger.log('UI', 'Закрыты модальные окна', 'info');
    }

    // Тема
    toggleTheme() {
        const currentTheme = document.body.dataset.colorScheme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.colorScheme = newTheme;
        this.storeTheme(newTheme);
        this.logger.log('UI', `Тема изменена на ${newTheme}`, 'info');
    }

    // Сохранение данных
    storeSettings() {
        window.transparentAIPriceAnalyzerData = {
            products: this.products,
            settings: this.settings,
            logs: this.logger.logs
        };
    }

    loadSettings() {
        const data = window.transparentAIPriceAnalyzerData;
        if (data) {
            this.products = data.products || [];
            this.settings = { ...this.settings, ...data.settings };
            if (data.logs) {
                this.logger.logs = data.logs;
                this.logger.renderLogs();
            }
        }

        const apiKeyInput = document.getElementById('openaiApiKey');
        const modelSelect = document.getElementById('openaiModel');

        if (apiKeyInput) apiKeyInput.value = this.settings.openaiApiKey || '';
        if (modelSelect) modelSelect.value = this.settings.openaiModel || CONFIG.DEFAULT_MODEL;
    }

    storeTheme(theme) {
        window.transparentAITheme = theme;
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

function initTransparentAIPriceAnalyzer() {
    console.log('🚀 Запуск полностью прозрачной системы AI Price Analyzer');
    priceAnalyzer = new TransparentAIPriceAnalyzer();
    window.priceAnalyzer = priceAnalyzer;
    console.log('✅ Прозрачная система готова к работе');
}

// Запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransparentAIPriceAnalyzer);
} else {
    initTransparentAIPriceAnalyzer();
}
