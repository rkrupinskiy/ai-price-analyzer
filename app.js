// AI Price Analyzer - ИСПРАВЛЕННАЯ ВЕРСИЯ (Полностью функциональное приложение)
// НИКАКИХ ДЕМО ДАННЫХ - только реальная работа с AI

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 500;
    }
    
    log(level, message, data = null) {
        const timestamp = new Date().toLocaleTimeString('ru-RU');
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            id: Date.now() + Math.random()
        };
        
        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        this.updateLogsDisplay();
    }
    
    updateLogsDisplay() {
        const container = document.getElementById('logsContent');
        if (!container) return;
        
        // Проверяем активна ли вкладка логов
        const logsTab = document.getElementById('logs');
        if (!logsTab || !logsTab.classList.contains('tab-content--active')) return;
        
        this.renderLogs();
    }
    
    renderLogs() {
        const container = document.getElementById('logsContent');
        if (!container) return;
        
        const filter = document.getElementById('logLevel')?.value || 'all';
        const filteredLogs = filter === 'all' ? this.logs : this.logs.filter(log => log.level === filter);
        
        if (filteredLogs.length === 0) {
            container.innerHTML = `
                <div class="empty-logs">
                    <div class="empty-logs__icon">📋</div>
                    <p>Логи операций появятся здесь</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        filteredLogs.slice(0, 100).forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry log-entry--${log.level}`;
            
            entry.innerHTML = `
                <span class="log-entry__time">${log.timestamp}</span>
                <span class="log-entry__level">${log.level.toUpperCase()}</span>
                <span class="log-entry__message">${log.message}</span>
            `;
            
            container.appendChild(entry);
        });
        
        container.scrollTop = 0;
    }
    
    clear() {
        this.logs = [];
        this.renderLogs();
    }
}

// Класс для работы с serverless функцией OpenAI
class ServerlessAIClient {
    constructor(apiKey, endpoint = '/api/openai') {
        this.apiKey = apiKey;
        this.endpoint = endpoint;
    }
    
    async callAI(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('OpenAI API ключ не настроен');
        }
        
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: this.apiKey,
                messages,
                model: options.model || 'gpt-4o',
                temperature: options.temperature || 0.1,
                maxTokens: options.maxTokens || 3000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    async testConnection() {
        try {
            const messages = [{
                role: 'user',
                content: 'Тест подключения. Ответь одним словом: "работает"'
            }];
            
            const response = await this.callAI(messages);
            return { success: true, response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// AI агент для редактирования данных
class DataEditingAgent {
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    
    async processEditCommand(command, products) {
        const prompt = `
Ты помощник для редактирования таблицы товаров. Проанализируй команду пользователя и верни JSON с изменениями.

Доступные поля для редактирования:
- name: название товара
- description: краткое описание
- quantity: количество (число)
- purchasePrice: цена закупа (число)
- salePrice: цена продажи (число)

Команда пользователя: "${command}"

Текущие товары: ${JSON.stringify(products.slice(0, 10))}

Верни ТОЛЬКО валидный JSON в формате:
{
  "success": true,
  "productId": "ID найденного товара или null",
  "productName": "название найденного товара",
  "changes": {
    "quantity": 15,
    "salePrice": 25000
  },
  "explanation": "что именно изменено"
}

Если товар не найден или команда неясна, верни:
{
  "success": false,
  "error": "описание проблемы"
}
        `;
        
        const messages = [{
            role: 'user',
            content: prompt
        }];
        
        const response = await this.aiClient.callAI(messages);
        
        try {
            return JSON.parse(response);
        } catch (error) {
            throw new Error('Не удалось обработать ответ AI агента');
        }
    }
}

// AI агент для поиска цен у конкурентов
class CompetitorSearchAgent {
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    
    async searchCompetitorPrices(productName) {
        const prompt = `
Ты аналитик российского рынка с доступом к веб-поиску. Найди минимальную цену на товар "${productName}" у российских конкурентов.

ВАЖНО: Используй реальный веб-поиск по всему интернету без ограничений.

Ищи на основных площадках:
- Wildberries, Ozon, Яндекс.Маркет
- DNS, М.Видео, Эльдорадо
- Официальные дистрибьюторы и магазины
- Специализированные интернет-магазины

Верни ТОЛЬКО валидный JSON:
{
  "success": true,
  "productName": "${productName}",
  "minPrice": 89990,
  "averagePrice": 95000,
  "maxPrice": 120000,
  "currency": "RUB",
  "sitesFound": 6,
  "bestOffer": {
    "site": "Название сайта с минимальной ценой",
    "price": 89990,
    "url": "https://реальная-ссылка.ru/product",
    "availability": "в наличии"
  },
  "allOffers": [
    {
      "site": "Wildberries",
      "price": 92000,
      "url": "https://wb.ru/...",
      "availability": "в наличии"
    }
  ],
  "searchDetails": "Проверено 6 сайтов, найдены актуальные цены",
  "timestamp": "${new Date().toISOString()}"
}

Если товар не найден:
{
  "success": false,
  "error": "Товар не найден в российских интернет-магазинах"
}
        `;
        
        const messages = [{
            role: 'user',
            content: prompt
        }];
        
        const response = await this.aiClient.callAI(messages);
        
        try {
            return JSON.parse(response);
        } catch (error) {
            throw new Error('Не удалось обработать результаты поиска');
        }
    }
}

// AI агент для поиска на Avito
class AvitoSearchAgent {
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    
    async searchAvitoUsed(productName) {
        const prompt = `
Найди минимальную цену на б/у товар "${productName}" на Avito.ru по всей России.

ТРЕБОВАНИЯ:
- Поиск только на avito.ru
- По всей России
- Сортировка по цене от минимальной
- Реальные ссылки на объявления

Верни ТОЛЬКО валидный JSON:
{
  "success": true,
  "productName": "${productName}",
  "minPrice": 45000,
  "averagePrice": 52000,
  "currency": "RUB",
  "totalFound": 25,
  "searchUrl": "https://www.avito.ru/rossiya?q=${encodeURIComponent(productName)}&s=104",
  "bestOffer": {
    "title": "Название объявления с минимальной ценой",
    "price": 45000,
    "location": "Город",
    "url": "https://avito.ru/реальная-ссылка",
    "seller": "тип продавца",
    "condition": "состояние товара"
  },
  "allOffers": [
    {
      "title": "Название объявления",
      "price": 47000,
      "location": "Москва",
      "url": "https://avito.ru/moskva/...",
      "seller": "частное лицо",
      "condition": "хорошее"
    }
  ],
  "timestamp": "${new Date().toISOString()}"
}

Если не найдено:
{
  "success": false,
  "error": "Б/у товары не найдены на Avito"
}
        `;
        
        const messages = [{
            role: 'user',
            content: prompt
        }];
        
        const response = await this.aiClient.callAI(messages);
        
        try {
            return JSON.parse(response);
        } catch (error) {
            throw new Error('Не удалось обработать результаты поиска на Avito');
        }
    }
}

// Класс для голосовых команд
class VoiceController {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.language = 'ru-RU';
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onEnd = null;
    }
    
    init() {
        if (!this.isSupported) {
            throw new Error('Голосовые команды не поддерживаются в этом браузере');
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = this.language;
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStart) this.onStart();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.onEnd) this.onEnd();
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
                const transcript = result[0].transcript.toLowerCase().trim();
                if (this.onResult) this.onResult(transcript);
            }
        };
        
        this.recognition.onerror = (event) => {
            this.isListening = false;
            if (this.onError) this.onError(event.error);
        };
    }
    
    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Ошибка запуска голосового распознавания:', error);
            }
        }
    }
    
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}

// Основной класс приложения
class AIPriceAnalyzer {
    constructor() {
        this.products = [];
        this.selectedProducts = new Set();
        this.searchHistory = [];
        this.currentSearch = null;
        
        // Настройки
        this.settings = {
            openaiApiKey: '',
            gptModel: 'gpt-4o',
            serverlessEndpoint: '/api/openai',
            voiceEnabled: false,
            voiceLanguage: 'ru-RU',
            competitorSearchPrompt: '',
            avitoSearchPrompt: '',
            editPrompt: ''
        };
        
        // Инициализация компонентов
        this.logger = new Logger();
        this.aiClient = null;
        this.dataEditingAgent = null;
        this.competitorSearchAgent = null;
        this.avitoSearchAgent = null;
        this.voiceController = new VoiceController();
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }
    
    setupApplication() {
        try {
            this.setupEventListeners();
            this.setupTabs();
            this.setupVoiceCommands();
            this.updateUI();
            this.logger.log('success', 'Система AI Price Analyzer готова к работе');
        } catch (error) {
            this.logger.log('error', `Ошибка инициализации: ${error.message}`);
            console.error('Ошибка инициализации:', error);
        }
    }
    
    setupEventListeners() {
        // ИСПРАВЛЕНО: Более надежное связывание событий
        
        // Импорт/экспорт
        this.safeBindEvent('importBtn', 'click', () => {
            const input = document.getElementById('importFile');
            if (input) input.click();
        });
        this.safeBindEvent('importFirstFileBtn', 'click', () => {
            const input = document.getElementById('importFile');
            if (input) input.click();
        });
        this.safeBindEvent('importFile', 'change', (e) => this.handleFileImport(e));
        this.safeBindEvent('exportExcelBtn', 'click', () => this.exportToExcel());
        this.safeBindEvent('exportCsvBtn', 'click', () => this.exportToCSV());
        
        // Управление товарами
        this.safeBindEvent('addProductBtn', 'click', () => this.showAddProductModal());
        this.safeBindEvent('addFirstProductBtn', 'click', () => this.showAddProductModal());
        this.safeBindEvent('saveProductBtn', 'click', () => this.saveNewProduct());
        
        // Выбор товаров
        this.safeBindEvent('selectAllBtn', 'click', () => this.selectAllProducts());
        this.safeBindEvent('deselectAllBtn', 'click', () => this.deselectAllProducts());
        this.safeBindEvent('selectAllCheckbox', 'change', (e) => this.toggleSelectAll(e.target.checked));
        
        // Поиск
        this.safeBindEvent('bulkSearchCompetitorBtn', 'click', () => this.searchCompetitorPrices());
        this.safeBindEvent('bulkSearchUsedBtn', 'click', () => this.searchUsedPrices());
        this.safeBindEvent('clearResultsBtn', 'click', () => this.clearResults());
        this.safeBindEvent('cancelSearchBtn', 'click', () => this.cancelSearch());
        
        // AI диалог
        this.safeBindEvent('sendCommandBtn', 'click', () => this.sendAICommand());
        this.safeBindEvent('userInput', 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAICommand();
            }
        });
        this.safeBindEvent('voiceInputBtn', 'click', () => this.toggleVoiceInput());
        this.safeBindEvent('voiceBtn', 'click', () => this.toggleVoiceInput());
        
        // Настройки
        this.safeBindEvent('saveSettingsBtn', 'click', () => this.saveSettings());
        this.safeBindEvent('resetSettingsBtn', 'click', () => this.resetSettings());
        this.safeBindEvent('testOpenAIBtn', 'click', () => this.testOpenAI());
        this.safeBindEvent('testVoiceBtn', 'click', () => this.testVoice());
        
        // История и логи
        this.safeBindEvent('clearHistoryBtn', 'click', () => this.clearHistory());
        this.safeBindEvent('exportHistoryBtn', 'click', () => this.exportHistory());
        this.safeBindEvent('clearLogsBtn', 'click', () => this.logger.clear());
        this.safeBindEvent('exportLogsBtn', 'click', () => this.exportLogs());
        this.safeBindEvent('logLevel', 'change', () => this.logger.renderLogs());
        this.safeBindEvent('historyFilter', 'change', () => this.renderHistory());
        
        // Модальные окна
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || 
                e.target.classList.contains('modal__backdrop')) {
                this.hideAllModals();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        this.logger.log('success', 'Все обработчики событий подключены');
    }
    
    safeBindEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            this.logger.log('info', `Подключен обработчик ${event} для ${elementId}`);
        } else {
            this.logger.log('warning', `Элемент ${elementId} не найден для подключения ${event}`);
        }
    }
    
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        if (tabButtons.length === 0) {
            this.logger.log('error', 'Кнопки вкладок не найдены');
            return;
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = button.dataset.tab;
                
                this.logger.log('info', `Переключение на вкладку: ${tabId}`);
                
                // Обновляем кнопки
                tabButtons.forEach(btn => btn.classList.remove('tab-btn--active'));
                button.classList.add('tab-btn--active');
                
                // Обновляем контент
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => {
                    content.classList.remove('tab-content--active');
                });
                
                const targetContent = document.getElementById(tabId);
                if (targetContent) {
                    targetContent.classList.add('tab-content--active');
                    this.onTabActivated(tabId);
                } else {
                    this.logger.log('error', `Содержимое вкладки ${tabId} не найдено`);
                }
            });
        });
        
        this.logger.log('success', `Настроена навигация для ${tabButtons.length} вкладок`);
    }
    
    onTabActivated(tabId) {
        this.logger.log('info', `Активирована вкладка: ${tabId}`);
        
        switch (tabId) {
            case 'products':
                this.renderProducts();
                break;
            case 'ai-dialog':
                // AI диалог уже готов
                break;
            case 'search-history':
                this.renderHistory();
                break;
            case 'settings':
                this.renderSettings();
                break;
            case 'logs':
                this.logger.renderLogs();
                break;
        }
    }
    
    setupVoiceCommands() {
        if (!this.voiceController.isSupported) {
            this.logger.log('warning', 'Голосовые команды не поддерживаются в этом браузере');
            return;
        }
        
        try {
            this.voiceController.init();
            
            this.voiceController.onStart = () => {
                this.logger.log('info', 'Начато распознавание голоса');
                const btn = document.getElementById('voiceBtn');
                if (btn) {
                    btn.classList.add('voice-active');
                    btn.textContent = '🎤 Слушаю...';
                }
            };
            
            this.voiceController.onEnd = () => {
                this.logger.log('info', 'Завершено распознавание голоса');
                const btn = document.getElementById('voiceBtn');
                if (btn) {
                    btn.classList.remove('voice-active');
                    btn.textContent = '🎤 Голос';
                }
            };
            
            this.voiceController.onResult = (transcript) => {
                this.logger.log('info', `Распознано: "${transcript}"`);
                this.processVoiceCommand(transcript);
            };
            
            this.voiceController.onError = (error) => {
                this.logger.log('error', `Ошибка голосового распознавания: ${error}`);
            };
            
            this.logger.log('success', 'Голосовые команды инициализированы');
        } catch (error) {
            this.logger.log('error', `Ошибка инициализации голосовых команд: ${error.message}`);
        }
    }
    
    // Обработка файлов
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.logger.log('info', `Импорт файла: ${file.name}`);
        
        try {
            if (file.name.endsWith('.csv')) {
                await this.importCSV(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                await this.importExcel(file);
            } else {
                throw new Error('Неподдерживаемый формат файла');
            }
            
            this.updateUI();
            this.logger.log('success', `Файл успешно импортирован: ${this.products.length} товаров`);
            this.showNotification('Успех', `Импортировано ${this.products.length} товаров`);
            
        } catch (error) {
            this.logger.log('error', `Ошибка импорта: ${error.message}`);
            this.showNotification('Ошибка', `Не удалось импортировать файл: ${error.message}`);
        }
        
        event.target.value = '';
    }
    
    async importCSV(file) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('Файл должен содержать заголовки и хотя бы одну строку данных');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length >= 3) {
                products.push({
                    id: Date.now() + i,
                    name: values[0] || `Товар ${i}`,
                    description: values[1] || '',
                    quantity: parseInt(values[2]) || 1,
                    purchasePrice: parseFloat(values[3]) || 0,
                    salePrice: parseFloat(values[4]) || 0,
                    competitorNewPrice: null,
                    competitorUsedPrice: null,
                    lastUpdated: null
                });
            }
        }
        
        this.products = products;
    }
    
    async importExcel(file) {
        if (!window.XLSX) {
            throw new Error('Библиотека XLSX не загружена');
        }
        
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length === 0) {
            throw new Error('Файл Excel не содержит данных');
        }
        
        const products = [];
        
        jsonData.forEach((row, index) => {
            const keys = Object.keys(row);
            products.push({
                id: Date.now() + index,
                name: row[keys[0]] || `Товар ${index + 1}`,
                description: row[keys[1]] || '',
                quantity: parseInt(row[keys[2]]) || 1,
                purchasePrice: parseFloat(row[keys[3]]) || 0,
                salePrice: parseFloat(row[keys[4]]) || 0,
                competitorNewPrice: null,
                competitorUsedPrice: null,
                lastUpdated: null
            });
        });
        
        this.products = products;
    }
    
    exportToCSV() {
        if (this.products.length === 0) {
            this.showNotification('Предупреждение', 'Нет товаров для экспорта');
            return;
        }
        
        const headers = [
            'Название товара',
            'Краткое описание', 
            'Количество',
            'Цена закупа',
            'Цена продажи',
            'Цена конкурентов NEW',
            'Цена конкурентов б/у',
            'Последнее обновление'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.products.map(product => [
                `"${product.name}"`,
                `"${product.description || ''}"`,
                product.quantity,
                product.purchasePrice || 0,
                product.salePrice || 0,
                product.competitorNewPrice || '',
                product.competitorUsedPrice || '',
                `"${product.lastUpdated || ''}"`
            ].join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, 'ai-price-analysis.csv', 'text/csv');
        this.logger.log('success', 'Экспорт в CSV завершен');
    }
    
    exportToExcel() {
        if (this.products.length === 0) {
            this.showNotification('Предупреждение', 'Нет товаров для экспорта');
            return;
        }
        
        if (!window.XLSX) {
            this.showNotification('Ошибка', 'Библиотека XLSX не загружена');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(this.products.map(product => ({
            'Название товара': product.name,
            'Краткое описание': product.description || '',
            'Количество': product.quantity,
            'Цена закупа': product.purchasePrice || 0,
            'Цена продажи': product.salePrice || 0,
            'Цена конкурентов NEW': product.competitorNewPrice || '',
            'Цена конкурентов б/у': product.competitorUsedPrice || '',
            'Последнее обновление': product.lastUpdated || ''
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'AI Price Analysis');
        
        XLSX.writeFile(wb, 'ai-price-analysis.xlsx');
        this.logger.log('success', 'Экспорт в Excel завершен');
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Управление товарами
    showAddProductModal() {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.logger.log('info', 'Показано модальное окно добавления товара');
        }
    }
    
    saveNewProduct() {
        const name = document.getElementById('newProductName')?.value.trim();
        const description = document.getElementById('newProductDescription')?.value.trim();
        const quantity = parseInt(document.getElementById('newProductQuantity')?.value) || 1;
        const purchasePrice = parseFloat(document.getElementById('newProductPurchasePrice')?.value) || 0;
        const salePrice = parseFloat(document.getElementById('newProductSalePrice')?.value) || 0;
        
        if (!name) {
            this.showNotification('Ошибка', 'Введите название товара');
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
            lastUpdated: null
        };
        
        this.products.push(newProduct);
        this.updateUI();
        this.hideAllModals();
        
        // Очистка формы
        const form = document.getElementById('addProductForm');
        if (form) form.reset();
        
        this.logger.log('success', `Добавлен новый товар: ${name}`);
        this.showNotification('Успех', `Товар "${name}" добавлен`);
    }
    
    // Выбор товаров
    selectAllProducts() {
        this.selectedProducts.clear();
        this.products.forEach(product => {
            this.selectedProducts.add(product.id);
        });
        this.updateUI();
        this.logger.log('info', 'Выбраны все товары');
    }
    
    deselectAllProducts() {
        this.selectedProducts.clear();
        this.updateUI();
        this.logger.log('info', 'Снято выделение со всех товаров');
    }
    
    toggleSelectAll(checked) {
        if (checked) {
            this.selectAllProducts();
        } else {
            this.deselectAllProducts();
        }
    }
    
    // AI поиск цен
    async searchCompetitorPrices() {
        if (!this.aiClient) {
            this.showNotification('Ошибка', 'OpenAI API не настроен. Перейдите в настройки.');
            return;
        }
        
        const selectedIds = Array.from(this.selectedProducts);
        if (selectedIds.length === 0) {
            this.showNotification('Предупреждение', 'Выберите товары для поиска');
            return;
        }
        
        await this.performSearch('competitor', selectedIds);
    }
    
    async searchUsedPrices() {
        if (!this.aiClient) {
            this.showNotification('Ошибка', 'OpenAI API не настроен. Перейдите в настройки.');
            return;
        }
        
        const selectedIds = Array.from(this.selectedProducts);
        if (selectedIds.length === 0) {
            this.showNotification('Предупреждение', 'Выберите товары для поиска');
            return;
        }
        
        await this.performSearch('used', selectedIds);
    }
    
    async performSearch(type, productIds) {
        this.currentSearch = { type, productIds, cancelled: false };
        this.showSearchProgress();
        
        const agent = type === 'competitor' ? this.competitorSearchAgent : this.avitoSearchAgent;
        const total = productIds.length;
        let completed = 0;
        let successful = 0;
        
        this.logger.log('info', `Начат поиск ${type} для ${total} товаров`);
        
        try {
            for (const productId of productIds) {
                if (this.currentSearch.cancelled) break;
                
                const product = this.products.find(p => p.id === productId);
                if (!product) continue;
                
                this.updateProgress(
                    (completed / total) * 100,
                    `Поиск ${completed + 1}/${total}: ${product.name}`
                );
                
                try {
                    let result;
                    if (type === 'competitor') {
                        result = await agent.searchCompetitorPrices(product.name);
                    } else {
                        result = await agent.searchAvitoUsed(product.name);
                    }
                    
                    if (result.success) {
                        if (type === 'competitor') {
                            product.competitorNewPrice = result.minPrice;
                        } else {
                            product.competitorUsedPrice = result.minPrice;
                        }
                        product.lastUpdated = new Date().toLocaleString('ru-RU');
                        successful++;
                        
                        // Добавляем в историю
                        this.searchHistory.unshift({
                            id: Date.now() + Math.random(),
                            type,
                            productName: product.name,
                            result,
                            timestamp: new Date().toISOString()
                        });
                        
                        this.logger.log('success', `${type} поиск: найдена цена для ${product.name} - ${result.minPrice} руб.`);
                    } else {
                        this.logger.log('warning', `${type} поиск: не найдено для ${product.name}`);
                    }
                    
                } catch (error) {
                    this.logger.log('error', `Ошибка ${type} поиска для ${product.name}: ${error.message}`);
                }
                
                completed++;
                
                // Обновляем таблицу
                this.renderProducts();
                
                // Пауза между запросами
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            this.logger.log('success', `${type} поиск завершен. Найдено цен: ${successful}/${total}`);
            this.showNotification('Поиск завершен', `Найдено цен: ${successful} из ${total}`);
            
        } finally {
            this.hideSearchProgress();
            this.currentSearch = null;
            this.updateUI();
        }
    }
    
    cancelSearch() {
        if (this.currentSearch) {
            this.currentSearch.cancelled = true;
            this.logger.log('info', 'Поиск отменен пользователем');
        }
    }
    
    clearResults() {
        this.products.forEach(product => {
            product.competitorNewPrice = null;
            product.competitorUsedPrice = null;
            product.lastUpdated = null;
        });
        
        this.searchHistory = [];
        this.updateUI();
        this.logger.log('info', 'Все результаты поиска очищены');
        this.showNotification('Информация', 'Результаты очищены');
    }
    
    // AI диалог
    async sendAICommand() {
        const input = document.getElementById('userInput');
        if (!input) return;
        
        const command = input.value.trim();
        
        if (!command) return;
        
        if (!this.aiClient) {
            this.showNotification('Ошибка', 'OpenAI API не настроен. Перейдите в настройки.');
            return;
        }
        
        // Добавляем сообщение пользователя
        this.addDialogMessage('user', command);
        input.value = '';
        
        // Показываем индикатор загрузки
        const loadingId = this.addDialogMessage('ai', 'Анализирую команду...');
        
        try {
            await this.processAICommand(command, loadingId);
        } catch (error) {
            this.updateDialogMessage(loadingId, `Ошибка: ${error.message}`);
            this.logger.log('error', `Ошибка AI команды: ${error.message}`);
        }
    }
    
    async processAICommand(command, loadingId) {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('найди цену') && lowerCommand.includes('конкурент')) {
            // Поиск цен у конкурентов
            const productName = this.extractProductName(command, 'конкурент');
            if (productName) {
                this.updateDialogMessage(loadingId, `Ищу цены на "${productName}" у конкурентов...`);
                const result = await this.competitorSearchAgent.searchCompetitorPrices(productName);
                
                if (result.success) {
                    this.updateDialogMessage(loadingId, 
                        `Найдена цена на "${productName}": ${result.minPrice} руб. (найдено на ${result.sitesFound} сайтах)`
                    );
                } else {
                    this.updateDialogMessage(loadingId, `Не удалось найти цены на "${productName}"`);
                }
            } else {
                this.updateDialogMessage(loadingId, 'Не удалось определить название товара из команды');
            }
            
        } else if (lowerCommand.includes('найди') && lowerCommand.includes('б/у')) {
            // Поиск б/у цен
            const productName = this.extractProductName(command, 'б/у');
            if (productName) {
                this.updateDialogMessage(loadingId, `Ищу б/у товар "${productName}" на Avito...`);
                const result = await this.avitoSearchAgent.searchAvitoUsed(productName);
                
                if (result.success) {
                    this.updateDialogMessage(loadingId, 
                        `Найден б/у товар "${productName}": от ${result.minPrice} руб. (найдено ${result.totalFound} объявлений)`
                    );
                } else {
                    this.updateDialogMessage(loadingId, `Не найдены б/у объявления для "${productName}"`);
                }
            } else {
                this.updateDialogMessage(loadingId, 'Не удалось определить название товара из команды');
            }
            
        } else if (lowerCommand.includes('измени') || lowerCommand.includes('установи')) {
            // Редактирование данных
            this.updateDialogMessage(loadingId, 'Анализирую команду редактирования...');
            const result = await this.dataEditingAgent.processEditCommand(command, this.products);
            
            if (result.success) {
                const product = this.products.find(p => p.id == result.productId || p.name === result.productName);
                if (product) {
                    Object.assign(product, result.changes);
                    product.lastUpdated = new Date().toLocaleString('ru-RU');
                    this.updateUI();
                    this.updateDialogMessage(loadingId, `Успешно изменено: ${result.explanation}`);
                } else {
                    this.updateDialogMessage(loadingId, 'Товар не найден для редактирования');
                }
            } else {
                this.updateDialogMessage(loadingId, `Ошибка: ${result.error}`);
            }
            
        } else {
            // Общий AI ответ
            const messages = [{
                role: 'user', 
                content: `Ты помощник по анализу цен товаров. Ответь на вопрос: ${command}`
            }];
            
            const response = await this.aiClient.callAI(messages);
            this.updateDialogMessage(loadingId, response);
        }
    }
    
    extractProductName(command, keyword) {
        const regex = new RegExp(`найди.*?цену.*?на\\s+([^\\s].*?)(?:\\s+${keyword}|$)`, 'i');
        const match = command.match(regex);
        return match ? match[1].trim() : null;
    }
    
    addDialogMessage(type, content) {
        const container = document.getElementById('dialogMessages');
        if (!container) return null;
        
        const messageId = Date.now() + Math.random();
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.id = `message-${messageId}`;
        
        const avatar = type === 'user' ? '👤' : '🤖';
        
        messageEl.innerHTML = `
            <div class="message__avatar">${avatar}</div>
            <div class="message__content">${content}</div>
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
        
        return messageId;
    }
    
    updateDialogMessage(messageId, content) {
        const messageEl = document.getElementById(`message-${messageId}`);
        if (messageEl) {
            const contentEl = messageEl.querySelector('.message__content');
            if (contentEl) {
                contentEl.textContent = content;
            }
        }
    }
    
    // Голосовые команды
    toggleVoiceInput() {
        if (!this.settings.voiceEnabled) {
            this.showNotification('Предупреждение', 'Голосовые команды отключены в настройках');
            return;
        }
        
        if (!this.voiceController.isSupported) {
            this.showNotification('Ошибка', 'Голосовые команды не поддерживаются в этом браузере');
            return;
        }
        
        if (this.voiceController.isListening) {
            this.voiceController.stop();
        } else {
            this.voiceController.start();
        }
    }
    
    processVoiceCommand(transcript) {
        // Добавляем команду в диалог
        const input = document.getElementById('userInput');
        if (input) {
            input.value = transcript;
            // Выполняем команду
            this.sendAICommand();
        }
    }
    
    // Настройки
    renderSettings() {
        const elements = {
            openaiApiKey: document.getElementById('openaiApiKey'),
            gptModel: document.getElementById('gptModel'),
            serverlessEndpoint: document.getElementById('serverlessEndpoint'),
            voiceEnabled: document.getElementById('voiceEnabled'),
            voiceLanguage: document.getElementById('voiceLanguage')
        };
        
        if (elements.openaiApiKey) elements.openaiApiKey.value = this.settings.openaiApiKey;
        if (elements.gptModel) elements.gptModel.value = this.settings.gptModel;
        if (elements.serverlessEndpoint) elements.serverlessEndpoint.value = this.settings.serverlessEndpoint;
        if (elements.voiceEnabled) elements.voiceEnabled.checked = this.settings.voiceEnabled;
        if (elements.voiceLanguage) elements.voiceLanguage.value = this.settings.voiceLanguage;
        
        this.updateSettingsStatus();
    }
    
    saveSettings() {
        const elements = {
            openaiApiKey: document.getElementById('openaiApiKey'),
            gptModel: document.getElementById('gptModel'),
            serverlessEndpoint: document.getElementById('serverlessEndpoint'),
            voiceEnabled: document.getElementById('voiceEnabled'),
            voiceLanguage: document.getElementById('voiceLanguage')
        };
        
        this.settings.openaiApiKey = elements.openaiApiKey?.value.trim() || '';
        this.settings.gptModel = elements.gptModel?.value || 'gpt-4o';
        this.settings.serverlessEndpoint = elements.serverlessEndpoint?.value.trim() || '/api/openai';
        this.settings.voiceEnabled = elements.voiceEnabled?.checked || false;
        this.settings.voiceLanguage = elements.voiceLanguage?.value || 'ru-RU';
        
        // Инициализируем AI клиента
        if (this.settings.openaiApiKey) {
            this.aiClient = new ServerlessAIClient(this.settings.openaiApiKey, this.settings.serverlessEndpoint);
            this.dataEditingAgent = new DataEditingAgent(this.aiClient);
            this.competitorSearchAgent = new CompetitorSearchAgent(this.aiClient);
            this.avitoSearchAgent = new AvitoSearchAgent(this.aiClient);
        }
        
        // Обновляем голосовые команды
        if (this.voiceController.isSupported) {
            this.voiceController.language = this.settings.voiceLanguage;
        }
        
        this.updateSettingsStatus();
        this.updateUI();
        
        this.logger.log('success', 'Настройки сохранены');
        this.showNotification('Успех', 'Настройки сохранены');
    }
    
    resetSettings() {
        this.settings = {
            openaiApiKey: '',
            gptModel: 'gpt-4o',
            serverlessEndpoint: '/api/openai',
            voiceEnabled: false,
            voiceLanguage: 'ru-RU',
            competitorSearchPrompt: '',
            avitoSearchPrompt: '',
            editPrompt: ''
        };
        
        this.aiClient = null;
        this.dataEditingAgent = null;
        this.competitorSearchAgent = null;
        this.avitoSearchAgent = null;
        
        this.renderSettings();
        this.updateUI();
        
        this.logger.log('info', 'Настройки сброшены к умолчанию');
        this.showNotification('Информация', 'Настройки сброшены');
    }
    
    async testOpenAI() {
        const apiKeyEl = document.getElementById('openaiApiKey');
        const endpointEl = document.getElementById('serverlessEndpoint');
        
        const apiKey = apiKeyEl?.value.trim();
        const endpoint = endpointEl?.value.trim() || '/api/openai';
        
        if (!apiKey) {
            this.showNotification('Ошибка', 'Введите OpenAI API ключ');
            return;
        }
        
        const statusEl = document.getElementById('openaiStatus');
        if (statusEl) {
            statusEl.textContent = 'Тестирование...';
            statusEl.className = 'status status--info';
        }
        
        try {
            const testClient = new ServerlessAIClient(apiKey, endpoint);
            const result = await testClient.testConnection();
            
            if (statusEl) {
                if (result.success) {
                    statusEl.textContent = 'Подключение работает';
                    statusEl.className = 'status status--success';
                    this.logger.log('success', 'OpenAI API тест прошел успешно');
                } else {
                    statusEl.textContent = `Ошибка: ${result.error}`;
                    statusEl.className = 'status status--error';
                    this.logger.log('error', `OpenAI API тест неудачен: ${result.error}`);
                }
            }
        } catch (error) {
            if (statusEl) {
                statusEl.textContent = `Ошибка: ${error.message}`;
                statusEl.className = 'status status--error';
            }
            this.logger.log('error', `Ошибка тестирования OpenAI: ${error.message}`);
        }
    }
    
    testVoice() {
        if (!this.voiceController.isSupported) {
            this.showNotification('Ошибка', 'Голосовые команды не поддерживаются');
            return;
        }
        
        const statusEl = document.getElementById('voiceStatus');
        if (statusEl) {
            statusEl.textContent = 'Тестирование микрофона...';
            statusEl.className = 'status status--info';
        }
        
        try {
            this.voiceController.start();
            setTimeout(() => {
                if (this.voiceController.isListening) {
                    this.voiceController.stop();
                    if (statusEl) {
                        statusEl.textContent = 'Микрофон работает';
                        statusEl.className = 'status status--success';
                    }
                } else {
                    if (statusEl) {
                        statusEl.textContent = 'Микрофон недоступен';
                        statusEl.className = 'status status--error';
                    }
                }
            }, 2000);
        } catch (error) {
            if (statusEl) {
                statusEl.textContent = `Ошибка: ${error.message}`;
                statusEl.className = 'status status--error';
            }
        }
    }
    
    updateSettingsStatus() {
        const openaiStatus = document.getElementById('openaiStatus');
        const voiceStatus = document.getElementById('voiceStatus');
        const apiStatus = document.getElementById('apiStatus');
        
        if (this.settings.openaiApiKey) {
            if (openaiStatus) {
                openaiStatus.textContent = 'Настроено';
                openaiStatus.className = 'status status--success';
            }
            if (apiStatus) {
                apiStatus.textContent = '🟢 API настроен';
                apiStatus.className = 'status status--success';
            }
        } else {
            if (openaiStatus) {
                openaiStatus.textContent = 'Не настроено';
                openaiStatus.className = 'status status--error';
            }
            if (apiStatus) {
                apiStatus.textContent = '🔴 API не настроен';
                apiStatus.className = 'status status--error';
            }
        }
        
        if (voiceStatus) {
            if (this.settings.voiceEnabled && this.voiceController.isSupported) {
                voiceStatus.textContent = 'Включено';
                voiceStatus.className = 'status status--success';
            } else {
                voiceStatus.textContent = 'Отключено';
                voiceStatus.className = 'status status--warning';
            }
        }
    }
    
    // История поиска
    renderHistory() {
        const container = document.getElementById('historyContent');
        if (!container) return;
        
        const filter = document.getElementById('historyFilter')?.value || 'all';
        const filteredHistory = filter === 'all' ? 
            this.searchHistory : 
            this.searchHistory.filter(item => item.type === filter);
        
        if (filteredHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history__icon">📝</div>
                    <p>История операций AI агента появится здесь</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        filteredHistory.slice(0, 50).forEach(item => {
            const historyEl = document.createElement('div');
            historyEl.className = 'history-item';
            
            const typeLabel = item.type === 'competitor' ? 'Поиск NEW цен' : 'Поиск б/у цен';
            
            historyEl.innerHTML = `
                <div class="history-item__header">
                    <span class="history-item__type">${typeLabel}</span>
                    <span class="history-item__timestamp">${new Date(item.timestamp).toLocaleString('ru-RU')}</span>
                </div>
                <div class="history-item__details">
                    Товар: <strong>${item.productName}</strong><br>
                    ${item.result.success ? 
                        `Найдена цена: <strong>${item.result.minPrice} руб.</strong><br>
                         Сайтов найдено: ${item.result.sitesFound || item.result.totalFound || 'N/A'}` :
                        `Результат: ${item.result.error}`
                    }
                </div>
                ${item.result.success && item.result.bestOffer ? `
                    <div class="history-item__result">
                        Лучшее предложение: ${item.result.bestOffer.site || 'N/A'}<br>
                        Цена: ${item.result.bestOffer.price} руб.<br>
                        ${item.result.bestOffer.url ? `<a href="${item.result.bestOffer.url}" target="_blank">Ссылка</a>` : ''}
                    </div>
                ` : ''}
            `;
            
            container.appendChild(historyEl);
        });
    }
    
    clearHistory() {
        this.searchHistory = [];
        this.renderHistory();
        this.logger.log('info', 'История поиска очищена');
    }
    
    exportHistory() {
        if (this.searchHistory.length === 0) {
            this.showNotification('Предупреждение', 'История пуста');
            return;
        }
        
        const csvContent = [
            'Дата,Тип,Товар,Успех,Цена,Ошибка',
            ...this.searchHistory.map(item => [
                new Date(item.timestamp).toLocaleString('ru-RU'),
                item.type === 'competitor' ? 'NEW цены' : 'б/у цены',
                `"${item.productName}"`,
                item.result.success ? 'Да' : 'Нет',
                item.result.success ? item.result.minPrice : '',
                item.result.success ? '' : `"${item.result.error}"`
            ].join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, 'ai-search-history.csv', 'text/csv');
        this.logger.log('success', 'История экспортирована');
    }
    
    exportLogs() {
        if (this.logger.logs.length === 0) {
            this.showNotification('Предупреждение', 'Логи пусты');
            return;
        }
        
        const csvContent = [
            'Время,Уровень,Сообщение',
            ...this.logger.logs.map(log => [
                log.timestamp,
                log.level,
                `"${log.message}"`
            ].join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, 'ai-system-logs.csv', 'text/csv');
        this.logger.log('success', 'Логи экспортированы');
    }
    
    // UI обновления
    updateUI() {
        this.renderProducts();
        this.updateProductsCount();
        this.updateSelectionInfo();
        this.updateBulkActions();
        this.updateSettingsStatus();
    }
    
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('productsTable');
        
        if (!tbody) return;
        
        if (this.products.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (tableContainer) tableContainer.style.display = 'table';
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            
            if (this.selectedProducts.has(product.id)) {
                row.classList.add('selected');
            }
            
            row.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox" class="product-checkbox" 
                           ${this.selectedProducts.has(product.id) ? 'checked' : ''}
                           data-product-id="${product.id}">
                </td>
                <td class="editable-cell" data-field="name" data-product-id="${product.id}">
                    ${product.name}
                </td>
                <td class="editable-cell" data-field="description" data-product-id="${product.id}">
                    ${product.description || ''}
                </td>
                <td class="editable-cell" data-field="quantity" data-product-id="${product.id}">
                    ${product.quantity}
                </td>
                <td class="editable-cell price-cell" data-field="purchasePrice" data-product-id="${product.id}">
                    ${this.formatPrice(product.purchasePrice)}
                </td>
                <td class="editable-cell price-cell" data-field="salePrice" data-product-id="${product.id}">
                    ${this.formatPrice(product.salePrice)}
                </td>
                <td class="price-cell competitor-price">
                    ${product.competitorNewPrice ? this.formatPrice(product.competitorNewPrice) : '—'}
                </td>
                <td class="price-cell competitor-price">
                    ${product.competitorUsedPrice ? this.formatPrice(product.competitorUsedPrice) : '—'}
                </td>
                <td class="text-muted">
                    ${product.lastUpdated || '—'}
                </td>
                <td>
                    <button class="btn btn--sm btn--outline" data-action="delete" data-product-id="${product.id}">
                        🗑️
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Обработчики событий для новых элементов
        tbody.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                const row = e.target.closest('tr');
                
                if (e.target.checked) {
                    this.selectedProducts.add(productId);
                    row.classList.add('selected');
                } else {
                    this.selectedProducts.delete(productId);
                    row.classList.remove('selected');
                }
                
                this.updateSelectionInfo();
                this.updateBulkActions();
            });
        });
        
        tbody.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', () => this.editCell(cell));
        });
        
        tbody.querySelectorAll('button[data-action="delete"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.deleteProduct(productId);
            });
        });
    }
    
    editCell(cell) {
        if (cell.classList.contains('editable-cell--editing')) return;
        
        const currentValue = cell.textContent.trim();
        const field = cell.dataset.field;
        const productId = parseInt(cell.dataset.productId);
        
        cell.classList.add('editable-cell--editing');
        
        const input = document.createElement('input');
        input.type = field === 'quantity' || field.includes('Price') ? 'number' : 'text';
        input.className = 'editable-input';
        input.value = field.includes('Price') ? 
            currentValue.replace(/[^\d.,]/g, '').replace(',', '.') : 
            currentValue;
        
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newValue = input.value.trim();
            const product = this.products.find(p => p.id === productId);
            
            if (product) {
                if (field === 'quantity') {
                    product[field] = parseInt(newValue) || 0;
                } else if (field.includes('Price')) {
                    product[field] = parseFloat(newValue) || 0;
                } else {
                    product[field] = newValue;
                }
                product.lastUpdated = new Date().toLocaleString('ru-RU');
            }
            
            cell.classList.remove('editable-cell--editing');
            this.renderProducts();
            
            this.logger.log('success', `Отредактировано: ${field} товара "${product.name}"`);
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                cell.classList.remove('editable-cell--editing');
                this.renderProducts();
            }
        });
    }
    
    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        if (confirm(`Удалить товар "${product.name}"?`)) {
            this.products = this.products.filter(p => p.id !== productId);
            this.selectedProducts.delete(productId);
            this.updateUI();
            this.logger.log('info', `Удален товар: ${product.name}`);
        }
    }
    
    updateProductsCount() {
        const el = document.getElementById('productsCount');
        if (el) {
            el.textContent = `Товаров: ${this.products.length}`;
        }
    }
    
    updateSelectionInfo() {
        const el = document.getElementById('selectionInfo');
        if (el) {
            el.textContent = `Выбрано: ${this.selectedProducts.size}`;
        }
        
        const checkbox = document.getElementById('selectAllCheckbox');
        if (checkbox) {
            checkbox.checked = this.selectedProducts.size === this.products.length && this.products.length > 0;
            checkbox.indeterminate = this.selectedProducts.size > 0 && this.selectedProducts.size < this.products.length;
        }
    }
    
    updateBulkActions() {
        const competitorBtn = document.getElementById('bulkSearchCompetitorBtn');
        const usedBtn = document.getElementById('bulkSearchUsedBtn');
        
        const hasSelection = this.selectedProducts.size > 0;
        const hasAPI = !!this.aiClient;
        
        if (competitorBtn) {
            competitorBtn.disabled = !hasSelection || !hasAPI;
        }
        if (usedBtn) {
            usedBtn.disabled = !hasSelection || !hasAPI;
        }
    }
    
    // Прогресс поиска
    showSearchProgress() {
        const el = document.getElementById('searchProgress');
        if (el) {
            el.classList.remove('hidden');
        }
    }
    
    hideSearchProgress() {
        const el = document.getElementById('searchProgress');
        if (el) {
            setTimeout(() => el.classList.add('hidden'), 1000);
        }
    }
    
    updateProgress(percentage, text) {
        const fill = document.getElementById('progressFill');
        const textEl = document.getElementById('progressText');
        
        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        if (textEl) {
            textEl.textContent = text;
        }
    }
    
    // Утилиты
    formatPrice(price) {
        if (!price || price === 0) return '0 ₽';
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }
    
    showNotification(title, message) {
        const titleEl = document.getElementById('notificationTitle');
        const messageEl = document.getElementById('notificationMessage');
        const modal = document.getElementById('notificationModal');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (modal) modal.classList.remove('hidden');
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
}

// Инициализация приложения
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new AIPriceAnalyzer();
        window.app = app; // Для отладки
    });
} else {
    app = new AIPriceAnalyzer();
    window.app = app; // Для отладки
}

// Предотвращение зума на мобильных устройствах
document.addEventListener('touchstart', function() {}, true);