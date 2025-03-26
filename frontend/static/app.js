/**
 * YCM Researcher Enhanced - 前端互動腳本
 * 整合了 gpt-researcher-clean 的功能與 YCM 的前端界面
 */

// WebSocket 連接
let socket = null;
let isConnected = false;
let isResearching = false;
let currentResearchId = null;

// 初始化函數
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 WebSocket
    initWebSocket();
    
    // 綁定搜索按鈕事件
    document.getElementById('search-button').addEventListener('click', startResearch);
    
    // 綁定聊天按鈕事件
    document.getElementById('chat-button').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // 綁定報告操作按鈕事件
    document.getElementById('copy-markdown').addEventListener('click', copyMarkdown);
    document.getElementById('download-markdown').addEventListener('click', downloadMarkdown);
    document.getElementById('download-pdf').addEventListener('click', downloadPDF);
    document.getElementById('download-docx').addEventListener('click', downloadDocx);
    document.getElementById('download-json').addEventListener('click', downloadJson);
    
    // 加載保存的研究列表
    loadSavedResearch();
});

// 初始化 WebSocket 連接
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function() {
        console.log('WebSocket 連接已建立');
        isConnected = true;
        updateWebSocketStatus(true);
    };
    
    socket.onclose = function() {
        console.log('WebSocket 連接已關閉');
        isConnected = false;
        updateWebSocketStatus(false);
        
        // 嘗試重新連接
        setTimeout(initWebSocket, 3000);
    };
    
    socket.onerror = function(error) {
        console.error('WebSocket 錯誤:', error);
        isConnected = false;
        updateWebSocketStatus(false);
    };
    
    socket.onmessage = function(event) {
        handleWebSocketMessage(event);
    };
}

// 處理 WebSocket 消息
function handleWebSocketMessage(event) {
    try {
        const message = JSON.parse(event.data);
        console.log('收到 WebSocket 消息:', message);
        
        switch (message.type) {
            case 'progress':
                updateProgress(message.data);
                break;
            case 'research_complete':
                completeResearch(message.data);
                break;
            case 'error':
                showErrorMessage(message.data.message);
                break;
            case 'images':
                handleImages(message.data);
                break;
            default:
                console.log('未處理的消息類型:', message.type);
        }
    } catch (error) {
        console.error('處理 WebSocket 消息時出錯:', error);
    }
}

// 更新 WebSocket 連接狀態
function updateWebSocketStatus(connected) {
    const statusElement = document.getElementById('websocket-status');
    const indicatorElement = statusElement.querySelector('.status-indicator');
    const textElement = statusElement.querySelector('.status-text');
    
    if (connected) {
        indicatorElement.classList.remove('offline');
        indicatorElement.classList.add('online');
        textElement.textContent = '已連接';
    } else {
        indicatorElement.classList.remove('online');
        indicatorElement.classList.add('offline');
        textElement.textContent = '離線';
    }
}

// 完成研究並顯示結果
function completeResearch(data) {
    // 隱藏進度條
    hideProgressBar();
    
    // 顯示研究結果
    if (data.status === "success" && data.report) {
        // 使用結構化的報告數據
        const reportData = data.report;
        
        // 顯示報告內容
        displayResearchReport({
            content: reportData.content,
            sources: reportData.sources || [],
            title: reportData.title || `研究報告: ${reportData.query}`,
            timestamp: reportData.timestamp || new Date().toLocaleString()
        });
        
        // 保存研究 ID 以便後續操作
        currentResearchId = data.research_id;
        
        // 添加到搜索歷史
        addToSearchHistory(reportData.query, currentResearchId);
        
        // 標記研究完成
        isResearching = false;
    } else {
        // 顯示錯誤消息
        showErrorMessage("無法獲取研究報告");
    }
}

// 顯示錯誤消息
function showErrorMessage(message) {
    // 隱藏進度條
    hideProgressBar();
    
    // 顯示錯誤消息
    const statusElement = document.getElementById('research-status');
    statusElement.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i> ${message}
        </div>
    `;
    statusElement.style.display = 'block';
    
    // 標記研究已完成（出錯）
    isResearching = false;
}

// 更新研究進度
function updateProgress(progressData) {
    const statusElement = document.getElementById('research-status');
    
    // 確保進度區域可見
    statusElement.style.display = 'block';
    
    // 如果是第一條進度消息，清空之前的內容
    if (!isResearching) {
        statusElement.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">正在研究中...</span>
                </div>
                <p class="mt-2">正在進行研究，請稍候...</p>
            </div>
            <div class="progress-updates"></div>
        `;
        isResearching = true;
    }
    
    // 添加新的進度更新
    const progressUpdatesElement = statusElement.querySelector('.progress-updates');
    if (progressUpdatesElement) {
        const updateElement = document.createElement('div');
        updateElement.className = 'progress-update';
        updateElement.innerHTML = `
            <p class="mb-1">
                <i class="fas fa-info-circle me-1"></i> ${progressData.message}
            </p>
        `;
        progressUpdatesElement.appendChild(updateElement);
        
        // 自動滾動到最新進度
        updateElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

// 隱藏進度條
function hideProgressBar() {
    const statusElement = document.getElementById('research-status');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// 顯示研究報告
function displayResearchReport(report) {
    // 確保研究結果區域可見
    document.getElementById('research-results').style.display = 'block';
    
    // 隱藏研究狀態區域
    const statusElement = document.getElementById('research-status');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
    
    // 設置報告標題
    const titleElement = document.getElementById('report-title');
    if (titleElement) {
        titleElement.textContent = report.title;
    }
    
    // 設置時間戳
    const timestampElement = document.getElementById('report-timestamp');
    if (timestampElement) {
        timestampElement.textContent = `生成時間: ${report.timestamp}`;
    }
    
    // 設置報告內容
    const contentElement = document.getElementById('report-content');
    if (contentElement) {
        // 確保內容元素可見
        contentElement.style.display = 'block';
        
        // 使用 markdown-it 渲染 Markdown
        const md = window.markdownit();
        contentElement.innerHTML = md.render(report.content || '');
    }
    
    // 設置資料來源
    const sourcesElement = document.getElementById('report-sources');
    if (sourcesElement && report.sources && report.sources.length > 0) {
        sourcesElement.innerHTML = '';
        report.sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.innerHTML = `<a href="${source}" target="_blank" class="source-link">${source}</a>`;
            sourcesElement.appendChild(sourceItem);
        });
    }
    
    // 設置研究日誌
    const logsContainer = document.getElementById('research-logs-container');
    const logsElement = document.getElementById('research-logs');
    if (logsContainer && logsElement && report.research_logs && report.research_logs.length > 0) {
        logsContainer.style.display = 'block';
        logsElement.innerHTML = report.research_logs.join('\n');
    } else if (logsContainer) {
        logsContainer.style.display = 'none';
    }
}

// 開始研究
async function startResearch() {
    // 獲取研究查詢
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        alert('請輸入研究主題或問題');
        return;
    }
    
    // 獲取報告類型
    const reportType = document.getElementById('report-type').value;
    
    // 獲取報告來源
    const reportSource = document.getElementById('report-source').value;
    
    // 獲取報告語調
    const tone = document.getElementById('tone').value;
    
    // 獲取查詢域名（可選）
    const queryDomains = document.getElementById('query-domains').value.trim();
    const domains = queryDomains ? queryDomains.split(',').map(d => d.trim()) : [];
    
    // 準備研究請求數據
    const requestData = {
        query: query,
        report_type: reportType,
        report_source: reportSource,
        tone: tone,
        agent: 'researcher',
        query_domains: domains
    };
    
    try {
        // 顯示研究結果區域
        document.getElementById('research-results').style.display = 'block';
        
        // 顯示研究狀態區域
        const statusElement = document.getElementById('research-status');
        if (!statusElement) {
            // 如果狀態元素不存在，創建一個
            const resultsCard = document.querySelector('#research-results .card-body');
            const statusDiv = document.createElement('div');
            statusDiv.id = 'research-status';
            resultsCard.prepend(statusDiv);
        }
        
        document.getElementById('research-status').style.display = 'block';
        document.getElementById('research-status').innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">正在研究中...</span>
                </div>
                <p class="mt-2">正在開始研究: ${query}</p>
            </div>
        `;
        
        // 隱藏報告容器
        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            reportContent.style.display = 'none';
        }
        
        // 滾動到研究結果區域
        document.getElementById('research-results').scrollIntoView({ behavior: 'smooth' });
        
        // 設置研究狀態
        isResearching = true;
        
        // 發送研究請求
        const response = await fetch('/api/research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // 保存當前研究 ID
            currentResearchId = result.research_id;
            
            // 顯示研究報告
            if (result.report) {
                displayResearchReport(result.report);
            }
            
            // 添加到搜索歷史
            addToSearchHistory(query, currentResearchId);
        } else {
            // 顯示錯誤信息
            document.getElementById('research-status').innerHTML += `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> ${result.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('研究請求出錯:', error);
        document.getElementById('research-status').innerHTML += `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> 研究請求出錯: ${error.message}
            </div>
        `;
        
        // 標記研究已完成（出錯）
        isResearching = false;
    }
}

// 發送聊天消息
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // 添加用戶消息到聊天區域
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `
        <div class="user-message">
            <div class="message-sender">您</div>
            <div class="message-content">${message}</div>
        </div>
    `;
    
    // 清空輸入框
    chatInput.value = '';
    
    // 自動滾動到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // TODO: 發送消息到服務器並獲取回覆
    // 這裡可以實現與研究報告相關的聊天功能
    
    // 模擬助手回覆
    setTimeout(() => {
        chatMessages.innerHTML += `
            <div class="assistant-message">
                <div class="message-sender">研究助手</div>
                <div class="message-content">我已收到您的消息: "${message}"。目前聊天功能正在開發中，敬請期待。</div>
            </div>
        `;
        
        // 自動滾動到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// 加載保存的研究列表
async function loadSavedResearch() {
    try {
        const response = await fetch('/api/research');
        const result = await response.json();
        
        if (result.status === 'success' && result.summaries && result.summaries.length > 0) {
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            
            result.summaries.slice(0, 5).forEach(summary => {
                const historyItem = document.createElement('li');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <a href="#" class="history-link" data-id="${summary.id}">
                        <div class="history-title">${summary.title}</div>
                        <div class="history-date small text-muted">${summary.date}</div>
                    </a>
                `;
                historyList.appendChild(historyItem);
                
                // 綁定點擊事件
                historyItem.querySelector('.history-link').addEventListener('click', function(e) {
                    e.preventDefault();
                    loadResearchById(summary.id);
                });
            });
        }
    } catch (error) {
        console.error('加載保存的研究列表出錯:', error);
    }
}

// 通過 ID 加載研究
async function loadResearchById(researchId) {
    try {
        const response = await fetch(`/api/research/${researchId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            // 顯示研究結果區域
            document.getElementById('research-results').style.display = 'block';
            
            // 隱藏研究狀態區域，顯示結果容器
            document.getElementById('research-status').style.display = 'none';
            document.getElementById('result-container').style.display = 'block';
            
            // 顯示研究報告
            displayResearchReport(result.report);
            
            // 滾動到研究結果區域
            document.getElementById('research-results').scrollIntoView({ behavior: 'smooth' });
            
            // 保存當前研究 ID
            currentResearchId = researchId;
        } else {
            alert(`加載研究失敗: ${result.message}`);
        }
    } catch (error) {
        console.error('加載研究出錯:', error);
        alert(`加載研究出錯: ${error.message}`);
    }
}

// 添加到搜索歷史
function addToSearchHistory(query, researchId) {
    const historyList = document.getElementById('history-list');
    
    // 創建新的歷史項
    const historyItem = document.createElement('li');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <a href="#" class="history-link" data-id="${researchId}">
            <div class="history-title">${query}</div>
            <div class="history-date small text-muted">${new Date().toLocaleString()}</div>
        </a>
    `;
    
    // 添加到歷史列表的頂部
    if (historyList.firstChild) {
        historyList.insertBefore(historyItem, historyList.firstChild);
    } else {
        historyList.appendChild(historyItem);
    }
    
    // 綁定點擊事件
    historyItem.querySelector('.history-link').addEventListener('click', function(e) {
        e.preventDefault();
        loadResearchById(researchId);
    });
    
    // 限制歷史列表的長度
    while (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
    }
}

// 複製 Markdown
function copyMarkdown() {
    if (!currentResearchId) {
        alert('沒有可複製的研究報告');
        return;
    }
    
    fetch(`/api/research/${currentResearchId}`)
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                const report = result.report;
                const markdown = report.content || '';
                
                navigator.clipboard.writeText(markdown)
                    .then(() => {
                        alert('已複製到剪貼板');
                    })
                    .catch(err => {
                        console.error('複製失敗:', err);
                        alert('複製失敗');
                    });
            } else {
                alert(`獲取報告失敗: ${result.message}`);
            }
        })
        .catch(error => {
            console.error('獲取報告出錯:', error);
            alert(`獲取報告出錯: ${error.message}`);
        });
}

// 下載 Markdown
function downloadMarkdown() {
    if (!currentResearchId) {
        alert('沒有可下載的研究報告');
        return;
    }
    
    window.location.href = `/api/research/${currentResearchId}/download?format=markdown`;
}

// 下載 PDF
function downloadPDF() {
    if (!currentResearchId) {
        alert('沒有可下載的研究報告');
        return;
    }
    
    window.location.href = `/api/research/${currentResearchId}/download?format=pdf`;
}

// 下載 Word
function downloadDocx() {
    if (!currentResearchId) {
        alert('沒有可下載的研究報告');
        return;
    }
    
    window.location.href = `/api/research/${currentResearchId}/download?format=docx`;
}

// 下載 JSON
function downloadJson() {
    if (!currentResearchId) {
        alert('沒有可下載的研究報告');
        return;
    }
    
    window.location.href = `/api/research/${currentResearchId}/download?format=json`;
}
