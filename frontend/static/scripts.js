// YCM 學術知識蒐集系統腳本

// 全局變量
let websocket = null;
let researchInProgress = false;
let searchHistory = [];
let typingTimer = null;
let currentResearchData = null;

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const researchResults = document.getElementById('research-results');
const researchStatus = document.getElementById('research-status');
const researchContent = document.getElementById('research-content');
const summaryContent = document.getElementById('summary-content');
const sourcesList = document.getElementById('sources-list');
const chatSection = document.getElementById('chat-section');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatButton = document.getElementById('chat-button');
const historyList = document.getElementById('history-list');
const websocketStatus = document.getElementById('websocket-status');
const statusIndicator = websocketStatus.querySelector('.status-indicator');
const statusText = websocketStatus.querySelector('.status-text');
const resultContainer = document.getElementById('result-container'); // 新增的 DOM 元素

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加載搜尋歷史
    loadSearchHistory();
    
    // 初始化 WebSocket 連接
    initWebSocket();
    
    // 添加事件監聽器
    searchButton.addEventListener('click', startResearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startResearch();
        }
    });
    
    // 添加輸入提示功能
    searchInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        if (searchInput.value) {
            typingTimer = setTimeout(showSearchSuggestions, 500);
        }
    });
    
    chatButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // 側邊欄鏈接事件
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const action = e.currentTarget.textContent.trim();
            if (action.includes('新研究')) {
                // 聚焦到搜索框
                searchInput.focus();
                // 平滑滾動到搜索區域
                document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
            } else if (action.includes('已保存研究')) {
                alert('此功能正在開發中，敬請期待！');
            } else if (action.includes('設定')) {
                alert('此功能正在開發中，敬請期待！');
            }
        });
    });
    
    // 添加頁面載入動畫
    animatePageLoad();
    
    // 檢查是否支持語音合成
    if ('speechSynthesis' in window) {
        console.log('此瀏覽器支持語音合成');
        
        // 載入用戶自動朗讀偏好
        const autoSpeechEnabled = localStorage.getItem('autoSpeechEnabled');
        if (autoSpeechEnabled === null) {
            // 如果用戶未設置偏好，默認啟用
            localStorage.setItem('autoSpeechEnabled', 'true');
        }
    } else {
        console.warn('此瀏覽器不支持語音合成');
    }
});

// 頁面載入動畫
function animatePageLoad() {
    document.querySelectorAll('.fade-in').forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// 顯示搜索建議
function showSearchSuggestions() {
    const query = searchInput.value.trim();
    if (!query || query.length < 3) return;
    
    // 這裡可以實現搜索建議功能，例如從歷史記錄中提取或從API獲取
    // 目前僅作為示例，實際功能需要後端支持
    console.log('搜索建議功能觸發:', query);
}

// 初始化 WebSocket 連接
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    websocket = new WebSocket(wsUrl);
    
    updateWebSocketStatus('connecting');
    
    websocket.onopen = () => {
        console.log('WebSocket 連接已建立');
        updateWebSocketStatus('online');
    };
    
    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    websocket.onclose = () => {
        console.log('WebSocket 連接已關閉');
        updateWebSocketStatus('offline');
        
        // 嘗試重新連接
        setTimeout(() => {
            initWebSocket();
        }, 3000);
    };
    
    websocket.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        updateWebSocketStatus('offline');
    };
}

// 更新 WebSocket 狀態
function updateWebSocketStatus(status) {
    statusIndicator.className = 'status-indicator ' + status;
    
    switch (status) {
        case 'online':
            statusText.textContent = '已連接';
            break;
        case 'offline':
            statusText.textContent = '離線';
            break;
        case 'connecting':
            statusText.textContent = '連接中...';
            break;
    }
}

// 處理 WebSocket 消息
function handleWebSocketMessage(data) {
    if (data.type === 'research_update') {
        updateResearchStatus(data);
    } else if (data.type === 'research_complete') {
        completeResearch(data.data);
    } else if (data.type === 'research_error') {
        showResearchError(data.message);
    } else if (data.type === 'chat_message') {
        addChatMessage(data.sender, data.message);
    }
}

// 顯示研究錯誤
function showResearchError(message) {
    researchInProgress = false;
    researchStatus.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i> ${message}
        </div>
    `;
    researchStatus.style.display = 'block';
    
    // 添加錯誤動畫
    const errorAlert = researchStatus.querySelector('.alert');
    errorAlert.classList.add('fade-in');
    
    // 顯示重試按鈕
    setTimeout(() => {
        errorAlert.innerHTML += `
            <div class="mt-3">
                <button class="btn btn-outline-danger btn-sm retry-button">
                    <i class="fas fa-redo me-1"></i> 重試
                </button>
            </div>
        `;
        
        // 添加重試按鈕事件
        const retryButton = errorAlert.querySelector('.retry-button');
        retryButton.addEventListener('click', startResearch);
    }, 1000);
}

// 開始研究
function startResearch() {
    const query = searchInput.value.trim();
    if (!query) {
        // 使用更友好的提示而不是彈窗
        searchInput.classList.add('is-invalid');
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'invalid-feedback';
        feedbackElement.textContent = '請輸入研究主題或問題';
        searchInput.parentNode.appendChild(feedbackElement);
        
        // 3秒後移除提示
        setTimeout(() => {
            searchInput.classList.remove('is-invalid');
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
        }, 3000);
        return;
    }
    
    // 獲取選中的報告類型
    const reportType = document.querySelector('input[name="reportType"]:checked').value;
    
    // 顯示研究結果區域並添加動畫
    researchResults.style.display = 'block';
    researchResults.classList.add('fade-in');
    
    // 顯示加載動畫
    researchStatus.style.display = 'block';
    researchContent.style.display = 'none';
    resultContainer.style.display = 'none';
    
    // 清空之前的研究結果
    summaryContent.innerHTML = '';
    sourcesList.innerHTML = '';
    
    // 標記研究進行中
    researchInProgress = true;
    
    // 禁用搜索按鈕並顯示加載狀態
    searchButton.disabled = true;
    const originalButtonText = searchButton.innerHTML;
    searchButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span>處理中...</span>
    `;
    
    // 平滑滾動到研究結果區域
    setTimeout(() => {
        researchResults.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    
    // 發送研究請求
    fetch('/api/research', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            report_type: reportType
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('伺服器回應錯誤: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        // 研究完成
        completeResearch(data);
        
        // 添加到搜尋歷史
        addToSearchHistory(query);
        
        // 顯示聊天區域並添加動畫
        chatSection.style.display = 'block';
        chatSection.classList.add('fade-in');
        
        // 恢復搜索按鈕狀態
        searchButton.disabled = false;
        searchButton.innerHTML = originalButtonText;
    })
    .catch(error => {
        console.error('研究請求錯誤:', error);
        
        // 顯示錯誤信息
        showResearchError('研究過程中出錯: ' + error.message);
        
        // 恢復搜索按鈕狀態
        searchButton.disabled = false;
        searchButton.innerHTML = originalButtonText;
        
        researchInProgress = false;
    });
}

// 顯示研究結果
function displayResearchResult(result) {
    const resultContainer = document.getElementById('research-result');
    resultContainer.innerHTML = '';
    
    // 保存當前研究結果
    window.currentResearchResult = result;
    currentResearchData = result;
    
    // 創建標題
    const title = document.createElement('h2');
    title.textContent = result.title || '研究結果';
    title.className = 'mb-4';
    resultContainer.appendChild(title);
    
    // 創建按鈕容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mb-4 d-flex flex-wrap gap-2';
    
    // 添加保存按鈕
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.innerHTML = '<i class="fas fa-save me-1"></i> 保存到向量數據庫';
    saveButton.onclick = () => saveResearchToVectorDB(result);
    buttonContainer.appendChild(saveButton);
    
    // 添加生成音頻按鈕
    const audioButton = document.createElement('button');
    audioButton.className = 'btn btn-success';
    audioButton.innerHTML = '<i class="fas fa-headphones me-1"></i> 生成音頻摘要';
    audioButton.onclick = () => generateAudioSummary();
    buttonContainer.appendChild(audioButton);
    
    // 添加生成濃縮音頻按鈕
    const condensedAudioButton = document.createElement('button');
    condensedAudioButton.className = 'btn btn-info';
    condensedAudioButton.id = 'generate-condensed-audio';
    condensedAudioButton.innerHTML = '<i class="fas fa-microphone-alt me-1"></i> 生成濃縮音頻';
    condensedAudioButton.onclick = () => generateCondensedAudio();
    buttonContainer.appendChild(condensedAudioButton);
    
    // 添加生成 PDF 並轉換為音頻按鈕
    const pdfAudioButton = document.createElement('button');
    pdfAudioButton.className = 'btn btn-warning';
    pdfAudioButton.id = 'generate-pdf-audio';
    pdfAudioButton.innerHTML = '<i class="fas fa-file-pdf me-1"></i> 生成 PDF 和音頻';
    pdfAudioButton.onclick = () => generatePDFAudio();
    buttonContainer.appendChild(pdfAudioButton);
    
    // 添加轉錄摘要按鈕
    const summaryButton = document.createElement('button');
    summaryButton.className = 'btn btn-outline-info';
    summaryButton.id = 'generate-summary';
    summaryButton.innerHTML = '<i class="fas fa-file-audio me-1"></i> 轉錄摘要';
    summaryButton.onclick = () => generateSummaryAudio();
    buttonContainer.appendChild(summaryButton);
    
    resultContainer.appendChild(buttonContainer);
    
    // 創建摘要部分
    if (result.summary) {
        const summarySection = document.createElement('div');
        summarySection.className = 'mb-4';
        
        const summaryTitle = document.createElement('h3');
        summaryTitle.textContent = '摘要';
        summaryTitle.className = 'mb-3';
        summarySection.appendChild(summaryTitle);
        
        const summaryContent = document.createElement('div');
        summaryContent.className = 'summary-content';
        summaryContent.innerHTML = marked.parse(result.summary);
        summarySection.appendChild(summaryContent);
        
        resultContainer.appendChild(summarySection);
    }
    
    // 創建來源部分
    if (result.sources && result.sources.length > 0) {
        const sourcesSection = document.createElement('div');
        sourcesSection.className = 'mb-4';
        
        const sourcesTitle = document.createElement('h3');
        sourcesTitle.textContent = '來源';
        sourcesTitle.className = 'mb-3';
        sourcesSection.appendChild(sourcesTitle);
        
        // 創建來源列表
        const sourcesList = document.createElement('div');
        sourcesList.className = 'sources-list';
        
        result.sources.forEach((source, index) => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item card mb-3';
            
            const sourceHeader = document.createElement('div');
            sourceHeader.className = 'card-header d-flex justify-content-between align-items-center';
            
            const sourceTitle = document.createElement('h5');
            sourceTitle.className = 'mb-0';
            sourceTitle.textContent = source.title || `來源 ${index + 1}`;
            sourceHeader.appendChild(sourceTitle);
            
            // 添加來源音頻按鈕
            const sourceAudioButton = document.createElement('button');
            sourceAudioButton.className = 'btn btn-sm btn-outline-primary';
            sourceAudioButton.innerHTML = '<i class="fas fa-headphones"></i>';
            sourceAudioButton.title = '生成此來源的音頻';
            sourceAudioButton.onclick = (e) => {
                e.stopPropagation();
                generateSourceAudio(index);
            };
            sourceHeader.appendChild(sourceAudioButton);
            
            sourceItem.appendChild(sourceHeader);
            
            // 來源內容
            const sourceContent = document.createElement('div');
            sourceContent.className = 'card-body source-content collapse';
            sourceContent.id = `source-content-${index}`;
            
            // 添加 URL 如果有的話
            if (source.url) {
                const sourceUrl = document.createElement('p');
                sourceUrl.className = 'source-url mb-3';
                const urlLink = document.createElement('a');
                urlLink.href = source.url;
                urlLink.target = '_blank';
                urlLink.textContent = source.url;
                sourceUrl.appendChild(document.createTextNode('URL: '));
                sourceUrl.appendChild(urlLink);
                sourceContent.appendChild(sourceUrl);
            }
            
            // 添加內容
            const contentText = document.createElement('div');
            contentText.innerHTML = marked.parse(source.content || '無內容');
            sourceContent.appendChild(contentText);
            
            sourceItem.appendChild(sourceContent);
            
            // 點擊標題展開/收起內容
            sourceHeader.style.cursor = 'pointer';
            sourceHeader.onclick = () => {
                const content = document.getElementById(`source-content-${index}`);
                content.classList.toggle('show');
            };
            
            sourcesList.appendChild(sourceItem);
        });
        
        sourcesSection.appendChild(sourcesList);
        resultContainer.appendChild(sourcesSection);
    }
    
    // 顯示結果容器
    resultContainer.style.display = 'block';
}

// 更新研究狀態
function updateResearchStatus(data) {
    if (data.status === 'in_progress') {
        // 確保研究狀態區域可見
        researchStatus.style.display = 'block';
        
        // 如果是第一條消息，清空之前的加載動畫
        if (researchStatus.querySelector('.text-center')) {
            researchStatus.innerHTML = '';
        }
        
        // 添加新的狀態更新
        const statusUpdate = document.createElement('div');
        statusUpdate.className = 'research-status-update fade-in';
        
        // 根據消息類型設置不同的圖標和樣式
        let icon = 'info-circle';
        let colorClass = 'text-info';
        
        if (data.message.includes('使用工具')) {
            icon = 'tools';
            colorClass = 'text-primary';
        } else if (data.message.includes('執行動作')) {
            icon = 'cogs';
            colorClass = 'text-success';
        } else if (data.message.includes('研究步驟')) {
            icon = 'search';
            colorClass = 'text-warning';
        }
        
        // 添加時間戳
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        statusUpdate.innerHTML = `
            <div class="${colorClass}">
                <i class="fas fa-${icon} me-2"></i>
                <span>${data.message}</span>
            </div>
            <div class="status-timestamp">${timestamp}</div>
        `;
        
        researchStatus.appendChild(statusUpdate);
        
        // 滾動到最新的更新
        researchStatus.scrollTop = researchStatus.scrollHeight;
    }
}

// 完成研究
function completeResearch(result) {
    researchInProgress = false;
    
    // 檢查結果是否有效
    if (!result || (typeof result !== 'object' && typeof result !== 'string')) {
        showResearchError('研究結果無效');
        return;
    }
    
    // 處理結果可能是字符串的情況
    let formattedResult = result;
    if (typeof result === 'string') {
        try {
            formattedResult = JSON.parse(result);
        } catch (e) {
            // 如果不是有效的 JSON，則保持原樣
            formattedResult = { 
                success: true, 
                summary: result,
                sources: []
            };
        }
    }
    
    // 顯示研究結果
    if (formattedResult.success) {
        // 隱藏研究狀態區域，顯示結果容器
        researchStatus.style.display = 'none';
        resultContainer.style.display = 'block';
        
        // 使用 marked.js 渲染 Markdown
        if (formattedResult.formatted_report) {
            resultContainer.innerHTML = marked.parse(formattedResult.formatted_report);
        } else if (formattedResult.summary) {
            resultContainer.innerHTML = marked.parse(formattedResult.summary);
        } else {
            resultContainer.innerHTML = '<p>沒有可用的研究結果</p>';
        }
        
        // 添加結果動畫
        resultContainer.classList.add('fade-in');
        
        // 處理舊版本結果格式（兼容性）
        if (formattedResult.summary) {
            summaryContent.innerHTML = marked.parse(formattedResult.summary);
        }
        
        // 提取參考資料標題
        const sourceTitles = extractSourceTitles(formattedResult);
        
        if (formattedResult.sources && Array.isArray(formattedResult.sources)) {
            sourcesList.innerHTML = '';
            formattedResult.sources.forEach((source, index) => {
                const sourceItem = document.createElement('li');
                sourceItem.className = 'list-group-item source-item fade-in';
                sourceItem.style.animationDelay = `${index * 0.1}s`;
                sourceItem.dataset.index = index;
                
                // 格式化來源
                let sourceText = '';
                if (typeof source === 'string') {
                    sourceText = source;
                } else if (source.title && source.url) {
                    sourceText = `<a href="${source.url}" target="_blank">${source.title}</a>`;
                    if (source.description) {
                        sourceText += `<p class="small text-muted mt-1">${source.description}</p>`;
                    }
                } else if (source.url) {
                    sourceText = `<a href="${source.url}" target="_blank">${source.url}</a>`;
                }
                
                sourceItem.innerHTML = sourceText;
                
                // 添加點擊事件，點擊時朗讀該標題
                sourceItem.addEventListener('click', () => {
                    if (sourceTitles[index]) {
                        speakText(sourceTitles[index]);
                        
                        // 高亮當前朗讀的標題
                        document.querySelectorAll('.source-item.speaking').forEach(item => {
                            item.classList.remove('speaking');
                        });
                        sourceItem.classList.add('speaking');
                    }
                });
                
                sourcesList.appendChild(sourceItem);
            });
        }
        
        // 添加分享按鈕
        const shareButtonContainer = document.createElement('div');
        shareButtonContainer.className = 'share-buttons mt-4 text-center fade-in';
        shareButtonContainer.innerHTML = `
            <hr>
            <h6><i class="fas fa-share-alt me-2"></i>分享研究結果</h6>
            <div class="btn-group mt-2">
                <button class="btn btn-outline-primary btn-sm" onclick="copyToClipboard()">
                    <i class="fas fa-clipboard me-1"></i> 複製
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="exportAsPDF()">
                    <i class="fas fa-file-pdf me-1"></i> PDF
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="saveToDatabase()">
                    <i class="fas fa-database me-1"></i> 保存
                </button>
            </div>
        `;
        resultContainer.appendChild(shareButtonContainer);
        
        // 顯示聊天區域
        chatSection.style.display = 'block';
        chatSection.classList.add('fade-in');
        
        // 提取標題並使用 TTS 朗讀
        setTimeout(() => {
            const title = extractTitle(formattedResult);
            if (title) {
                // 添加語音控制按鈕
                addSpeechControls(title, sourceTitles);
                
                // 檢查用戶是否啟用了自動朗讀
                const autoSpeechEnabled = localStorage.getItem('autoSpeechEnabled');
                if (autoSpeechEnabled !== 'false') {
                    // 朗讀研究標題
                    speakText(title);
                }
            }
        }, 1000);
    } else {
        // 顯示錯誤信息
        showResearchError(formattedResult.message || '研究過程中出錯');
    }
    
    // 添加保存為 txt 按鈕
    addSaveToTxtButton();
}

// 提取研究報告標題
function extractTitle(result) {
    let title = '';
    
    // 嘗試從不同的來源提取標題
    if (result.title) {
        title = result.title;
    } else if (result.formatted_report) {
        // 嘗試從格式化報告中提取標題（通常是第一個 # 標記）
        const match = result.formatted_report.match(/^#\s+(.+)$/m);
        if (match && match[1]) {
            title = match[1];
        }
    } else if (result.summary) {
        // 嘗試從摘要中提取標題
        const match = result.summary.match(/^#\s+(.+)$/m);
        if (match && match[1]) {
            title = match[1];
        }
    }
    
    // 如果找不到標題，使用查詢作為標題
    if (!title && searchInput.value) {
        title = `研究主題: ${searchInput.value}`;
    }
    
    return title;
}

// 提取參考資料標題
function extractSourceTitles(result) {
    const titles = [];
    
    // 檢查是否有來源資料
    if (result.sources && Array.isArray(result.sources)) {
        result.sources.forEach(source => {
            let sourceTitle = '';
            
            // 提取標題
            if (typeof source === 'string') {
                // 嘗試從字符串中提取標題
                const titleMatch = source.match(/Title:\s*([^|]+)/);
                if (titleMatch && titleMatch[1]) {
                    sourceTitle = titleMatch[1].trim();
                } else {
                    sourceTitle = source.substring(0, 100); // 取前100個字符作為標題
                }
            } else if (source.title) {
                sourceTitle = source.title;
            } else if (source.url) {
                sourceTitle = `來源: ${source.url}`;
            }
            
            if (sourceTitle) {
                titles.push(sourceTitle);
            }
        });
    }
    
    return titles;
}

// 使用 Web Speech API 朗讀文本
function speakText(text) {
    // 檢查瀏覽器是否支持語音合成
    if ('speechSynthesis' in window) {
        // 停止當前正在朗讀的內容
        window.speechSynthesis.cancel();
        
        // 創建語音合成實例
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 設置語音參數
        utterance.lang = 'zh-TW'; // 設置為繁體中文
        utterance.rate = 1.0;     // 語速 (0.1 到 10)
        utterance.pitch = 1.0;    // 音調 (0 到 2)
        utterance.volume = 1.0;   // 音量 (0 到 1)
        
        // 開始朗讀
        window.speechSynthesis.speak(utterance);
        
        // 儲存當前朗讀的文本
        window.currentSpeechText = text;
    } else {
        console.warn('此瀏覽器不支持語音合成');
    }
}

// 朗讀所有參考資料標題
function speakAllSourceTitles(titles) {
    if (!titles || titles.length === 0) return;
    
    // 檢查瀏覽器是否支持語音合成
    if (!('speechSynthesis' in window)) {
        console.warn('此瀏覽器不支持語音合成');
        return;
    }
    
    // 停止當前正在朗讀的內容
    window.speechSynthesis.cancel();
    
    // 創建朗讀隊列
    window.speechQueue = [...titles];
    window.currentSpeechIndex = 0;
    
    // 開始朗讀第一個標題
    speakNextTitle();
}

// 朗讀隊列中的下一個標題
function speakNextTitle() {
    if (!window.speechQueue || window.currentSpeechIndex >= window.speechQueue.length) {
        return;
    }
    
    const title = window.speechQueue[window.currentSpeechIndex];
    
    // 創建語音合成實例
    const utterance = new SpeechSynthesisUtterance(title);
    
    // 設置語音參數
    utterance.lang = 'zh-TW';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // 設置結束事件，朗讀完一個標題後繼續下一個
    utterance.onend = function() {
        window.currentSpeechIndex++;
        
        // 在標題之間添加短暫停頓
        setTimeout(speakNextTitle, 1000);
    };
    
    // 開始朗讀
    window.speechSynthesis.speak(utterance);
    
    // 高亮當前正在朗讀的標題
    highlightCurrentTitle(window.currentSpeechIndex);
}

// 高亮當前正在朗讀的標題
function highlightCurrentTitle(index) {
    // 移除之前的高亮
    document.querySelectorAll('.source-item.speaking').forEach(item => {
        item.classList.remove('speaking');
    });
    
    // 添加新的高亮
    const sourceItems = document.querySelectorAll('.source-item');
    if (sourceItems[index]) {
        sourceItems[index].classList.add('speaking');
        
        // 滾動到當前朗讀的標題
        sourceItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 添加語音控制按鈕
function addSpeechControls(title, sourceTitles) {
    // 創建語音控制容器
    const speechControls = document.createElement('div');
    speechControls.className = 'speech-controls mt-3 fade-in';
    
    // 構建 HTML
    let controlsHtml = `
        <div class="d-flex align-items-center justify-content-center flex-wrap">
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2" id="replay-title">
                <i class="fas fa-volume-up me-1"></i> 朗讀研究標題
            </button>
    `;
    
    // 如果有參考資料標題，添加朗讀參考資料按鈕
    if (sourceTitles && sourceTitles.length > 0) {
        controlsHtml += `
            <button class="btn btn-sm btn-outline-primary me-2 mb-2" id="read-sources">
                <i class="fas fa-list-ul me-1"></i> 朗讀參考資料標題 (${sourceTitles.length})
            </button>
        `;
    }
    
    // 添加停止朗讀按鈕和自動朗讀開關
    controlsHtml += `
            <button class="btn btn-sm btn-outline-danger me-2 mb-2" id="stop-speech">
                <i class="fas fa-stop me-1"></i> 停止朗讀
            </button>
            <button class="btn btn-sm btn-outline-success me-2 mb-2" id="generate-audio">
                <i class="fas fa-file-audio me-1"></i> 生成音頻摘要
            </button>
            <button class="btn btn-sm btn-outline-info me-2 mb-2" id="generate-condensed-audio">
                <i class="fas fa-compress-alt me-1"></i> 生成濃縮音頻 (60秒)
            </button>
            <div class="form-check form-switch ms-2">
                <input class="form-check-input" type="checkbox" id="auto-speech-toggle" checked>
                <label class="form-check-label" for="auto-speech-toggle">自動朗讀</label>
            </div>
        </div>
    `;
    
    speechControls.innerHTML = controlsHtml;
    
    // 將控制按鈕添加到結果容器頂部
    const speechControlsContainer = document.querySelector('.speech-controls');
    if (speechControlsContainer) {
        speechControlsContainer.parentNode.replaceChild(speechControls, speechControlsContainer);
    } else {
        resultContainer.insertBefore(speechControls, resultContainer.firstChild);
    }
    
    // 添加朗讀研究標題按鈕事件
    document.getElementById('replay-title').addEventListener('click', () => {
        speakText(title);
    });
    
    // 如果有參考資料標題，添加朗讀參考資料按鈕事件
    if (sourceTitles && sourceTitles.length > 0) {
        document.getElementById('read-sources').addEventListener('click', () => {
            speakAllSourceTitles(sourceTitles);
        });
    }
    
    // 添加停止朗讀按鈕事件
    document.getElementById('stop-speech').addEventListener('click', () => {
        window.speechSynthesis.cancel();
        
        // 移除所有高亮
        document.querySelectorAll('.source-item.speaking').forEach(item => {
            item.classList.remove('speaking');
        });
    });
    
    // 添加生成音頻摘要按鈕事件
    document.getElementById('generate-audio').addEventListener('click', () => {
        generateAudioSummary();
    });
    
    // 添加生成濃縮音頻按鈕事件
    document.getElementById('generate-condensed-audio').addEventListener('click', () => {
        generateCondensedAudio();
    });
    
    // 保存用戶自動朗讀偏好
    document.getElementById('auto-speech-toggle').addEventListener('change', (e) => {
        localStorage.setItem('autoSpeechEnabled', e.target.checked);
    });
}

// 生成研究報告音頻摘要
async function generateAudioSummary() {
    // 顯示加載狀態
    const generateAudioBtn = document.getElementById('generate-audio');
    const originalText = generateAudioBtn.innerHTML;
    generateAudioBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> 生成中...';
    generateAudioBtn.disabled = true;
    
    try {
        // 獲取當前研究結果
        const currentResearch = window.currentResearchResult;
        if (!currentResearch) {
            showToast('錯誤', '沒有可用的研究結果', 'error');
            return;
        }
        
        // 發送請求到後端生成音頻
        const response = await fetch('/api/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentResearch)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 創建音頻播放器和下載按鈕
            addAudioPlayer(result.audio_file, result.title);
            showToast('成功', '音頻摘要已生成', 'success');
        } else {
            showToast('錯誤', result.message || '生成音頻摘要失敗', 'error');
        }
    } catch (error) {
        console.error('生成音頻摘要時出錯:', error);
        showToast('錯誤', '生成音頻摘要時出錯', 'error');
    } finally {
        // 恢復按鈕狀態
        generateAudioBtn.innerHTML = originalText;
        generateAudioBtn.disabled = false;
    }
}

// 生成研究報告濃縮音頻
async function generateCondensedAudio() {
    // 顯示加載狀態
    const generateBtn = document.getElementById('generate-condensed-audio');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> 生成中...';
    generateBtn.disabled = true;
    
    try {
        // 獲取當前研究結果
        const currentResearch = window.currentResearchResult;
        if (!currentResearch) {
            showToast('錯誤', '沒有可用的研究結果', 'error');
            return;
        }
        
        // 顯示目標時長選擇對話框
        const duration = await showDurationDialog();
        if (!duration) {
            // 用戶取消了操作
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
            return;
        }
        
        console.log('開始生成濃縮音頻，目標時長:', duration);
        console.log('研究數據:', currentResearch);
        
        // 添加目標時長到請求數據
        const requestData = { ...currentResearch, target_duration: duration };
        
        // 發送請求到後端生成濃縮音頻
        const response = await fetch('/api/generate_condensed_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 錯誤:', response.status, errorText);
            throw new Error(`API 錯誤 ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('API 返回結果:', result);
        
        if (result.success) {
            // 創建濃縮音頻播放器和下載按鈕
            addCondensedAudioPlayer(result);
            showToast('成功', `濃縮音頻已生成 (${result.compression_ratio}% 的原始長度)`, 'success');
        } else {
            showToast('錯誤', result.message || '生成濃縮音頻失敗', 'error');
        }
    } catch (error) {
        console.error('生成濃縮音頻時出錯:', error);
        showToast('錯誤', '生成濃縮音頻時出錯: ' + error.message, 'error');
    } finally {
        // 恢復按鈕狀態
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

// 顯示目標時長選擇對話框
function showDurationDialog() {
    return new Promise((resolve) => {
        // 創建對話框元素
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog-container';
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <h5>選擇濃縮音頻時長</h5>
                <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="dialog-body">
                <p>請選擇生成的濃縮音頻目標時長：</p>
                <div class="form-group">
                    <select class="form-select" id="duration-select">
                        <option value="30">30 秒</option>
                        <option value="60" selected>1 分鐘</option>
                        <option value="120">2 分鐘</option>
                        <option value="180">3 分鐘</option>
                        <option value="300">5 分鐘</option>
                    </select>
                </div>
            </div>
            <div class="dialog-footer">
                <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
                <button type="button" class="btn btn-primary" id="confirm-btn">確認</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // 添加事件監聽器
        const closeBtn = dialog.querySelector('.btn-close');
        const cancelBtn = document.getElementById('cancel-btn');
        const confirmBtn = document.getElementById('confirm-btn');
        const durationSelect = document.getElementById('duration-select');
        
        // 關閉對話框函數
        const closeDialog = () => {
            document.body.removeChild(dialogOverlay);
        };
        
        // 取消按鈕事件
        closeBtn.addEventListener('click', () => {
            closeDialog();
            resolve(null);
        });
        
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            resolve(null);
        });
        
        // 確認按鈕事件
        confirmBtn.addEventListener('click', () => {
            const duration = parseInt(durationSelect.value);
            closeDialog();
            resolve(duration);
        });
    });
}

// 添加音頻播放器
function addAudioPlayer(audioFile, title) {
    // 檢查是否已存在音頻播放器
    const existingPlayer = document.getElementById('research-audio-player-container');
    if (existingPlayer) {
        existingPlayer.remove();
    }
    
    // 創建音頻播放器容器
    const audioPlayerContainer = document.createElement('div');
    audioPlayerContainer.id = 'research-audio-player-container';
    audioPlayerContainer.className = 'audio-player-container mt-3 fade-in';
    
    // 構建 HTML
    audioPlayerContainer.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title"><i class="fas fa-file-audio me-2"></i>研究報告音頻摘要</h6>
                <div class="audio-player">
                    <audio id="research-audio-player" controls>
                        <source src="${audioFile}" type="audio/mpeg">
                        您的瀏覽器不支持音頻播放
                    </audio>
                </div>
                <div class="mt-2">
                    <a href="${audioFile}" download="研究報告_${title.replace(/[^\w\s]/gi, '')}.mp3" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-download me-1"></i> 下載音頻
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // 將音頻播放器添加到結果容器
    const speechControls = document.querySelector('.speech-controls');
    if (speechControls) {
        speechControls.after(audioPlayerContainer);
    } else {
        resultContainer.insertBefore(audioPlayerContainer, resultContainer.firstChild);
    }
}

// 添加濃縮音頻播放器
function addCondensedAudioPlayer(result) {
    // 檢查是否已存在濃縮音頻播放器
    const existingPlayer = document.getElementById('condensed-audio-player-container');
    if (existingPlayer) {
        existingPlayer.remove();
    }
    
    // 創建音頻播放器容器
    const audioPlayerContainer = document.createElement('div');
    audioPlayerContainer.id = 'condensed-audio-player-container';
    audioPlayerContainer.className = 'audio-player-container mt-3 fade-in condensed-audio';
    
    // 構建 HTML
    audioPlayerContainer.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title">
                    <i class="fas fa-compress-alt me-2"></i>濃縮音頻摘要 
                    <span class="badge bg-info">${result.target_duration || 60}秒</span>
                    <span class="badge bg-success">${result.compression_ratio}%</span>
                </h6>
                <div class="audio-player">
                    <audio id="condensed-audio-player" controls>
                        <source src="${result.audio_file}" type="audio/mpeg">
                        您的瀏覽器不支持音頻播放
                    </audio>
                </div>
                <div class="mt-2 d-flex justify-content-between">
                    <a href="${result.audio_file}" download="濃縮研究報告.mp3" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-download me-1"></i> 下載音頻
                    </a>
                    <a href="${result.text_file}" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-file-alt me-1"></i> 查看文本
                    </a>
                </div>
                <div class="mt-2 small text-muted">
                    原始長度: ${result.original_length} 字符 → 濃縮長度: ${result.condensed_length} 字符
                </div>
            </div>
        </div>
    `;
    
    // 將音頻播放器添加到結果容器
    const audioPlayer = document.getElementById('research-audio-player-container');
    if (audioPlayer) {
        audioPlayer.after(audioPlayerContainer);
    } else {
        const speechControls = document.querySelector('.speech-controls');
        if (speechControls) {
            speechControls.after(audioPlayerContainer);
        } else {
            resultContainer.insertBefore(audioPlayerContainer, resultContainer.firstChild);
        }
    }
}

// 複製到剪貼板功能
window.copyToClipboard = function() {
    const content = resultContainer.innerText;
    navigator.clipboard.writeText(content).then(() => {
        showToast('已複製到剪貼板');
    }).catch(err => {
        console.error('複製失敗:', err);
        showToast('複製失敗，請手動選擇並複製', 'error');
    });
};

// 導出為PDF功能（示例）
window.exportAsPDF = function() {
    showToast('PDF導出功能正在開發中');
};

// 保存到數據庫功能（示例）
window.saveToDatabase = function() {
    showToast('保存功能正在開發中');
};

// 顯示提示消息
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}`;
    document.body.appendChild(toast);
    
    // 顯示動畫
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 3秒後隱藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 發送聊天消息
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // 添加用戶消息到聊天區域
    addChatMessage('user', message);
    
    // 清空輸入框
    chatInput.value = '';
    
    // 顯示助手正在輸入的指示器
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'assistant-message typing-message fade-in';
    typingIndicator.innerHTML = `
        <div class="message-sender">研究助手</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 發送消息到服務器
    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        // 移除打字指示器
        chatMessages.removeChild(typingIndicator);
        
        // 添加助手回覆
        addChatMessage('assistant', data.response);
    })
    .catch(error => {
        console.error('聊天請求錯誤:', error);
        
        // 移除打字指示器
        chatMessages.removeChild(typingIndicator);
        
        // 添加錯誤消息
        const errorMessage = document.createElement('div');
        errorMessage.className = 'assistant-message error-message fade-in';
        errorMessage.innerHTML = `
            <div class="message-sender">系統</div>
            <div class="message-content text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                無法連接到服務器，請稍後再試。
            </div>
        `;
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// 添加聊天消息
function addChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `${sender}-message fade-in`;
    
    // 設置發送者名稱
    const senderName = sender === 'user' ? '您' : '研究助手';
    
    // 使用 marked.js 渲染 Markdown（僅對助手消息）
    const messageContent = sender === 'assistant' ? marked.parse(message) : message;
    
    messageElement.innerHTML = `
        <div class="message-sender">${senderName}</div>
        <div class="message-content">${messageContent}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    
    // 滾動到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加到搜尋歷史
function addToSearchHistory(query) {
    // 檢查是否已存在相同的查詢
    const existingIndex = searchHistory.findIndex(item => item.query === query);
    if (existingIndex !== -1) {
        // 如果存在，則移除舊的
        searchHistory.splice(existingIndex, 1);
    }
    
    // 添加到歷史記錄的開頭
    const timestamp = new Date().toISOString();
    searchHistory.unshift({
        query: query,
        timestamp: timestamp
    });
    
    // 限制歷史記錄數量
    if (searchHistory.length > 10) {
        searchHistory.pop();
    }
    
    // 保存到本地存儲
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // 更新顯示
    updateSearchHistoryDisplay();
}

// 加載搜尋歷史
function loadSearchHistory() {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateSearchHistoryDisplay();
    }
}

// 更新搜尋歷史顯示
function updateSearchHistoryDisplay() {
    historyList.innerHTML = '';
    
    if (searchHistory.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'text-muted small';
        emptyItem.innerHTML = '<i class="fas fa-info-circle me-1"></i>尚無搜尋記錄';
        historyList.appendChild(emptyItem);
        return;
    }
    
    searchHistory.forEach((item, index) => {
        const historyItem = document.createElement('li');
        historyItem.className = 'history-item fade-in';
        historyItem.style.animationDelay = `${index * 0.05}s`;
        
        // 格式化日期
        const date = new Date(item.timestamp);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        
        historyItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="history-query">${item.query}</span>
                <small class="text-muted">${formattedDate}</small>
            </div>
        `;
        
        // 添加點擊事件
        historyItem.addEventListener('click', () => {
            searchInput.value = item.query;
            searchInput.focus();
        });
        
        historyList.appendChild(historyItem);
    });
    
    // 添加清空歷史按鈕
    const clearButton = document.createElement('li');
    clearButton.className = 'text-center mt-2';
    clearButton.innerHTML = `
        <button class="btn btn-sm btn-outline-light">
            <i class="fas fa-trash-alt me-1"></i>清空歷史
        </button>
    `;
    clearButton.querySelector('button').addEventListener('click', clearSearchHistory);
    historyList.appendChild(clearButton);
}

// 清空搜尋歷史
function clearSearchHistory() {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    updateSearchHistoryDisplay();
}

// 添加CSS樣式
const styleElement = document.createElement('style');
styleElement.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }
    
    .toast-notification {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background-color: white;
        color: #333;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        z-index: 1100;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .toast-notification.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .toast-notification.success {
        border-left: 4px solid var(--success-color);
    }
    
    .toast-notification.error {
        border-left: 4px solid var(--danger-color);
    }
    
    .typing-message {
        opacity: 0.7;
    }
    
    .history-item {
        padding: 8px 10px;
        border-radius: 5px;
        margin-bottom: 5px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    
    .history-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .history-query {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
        display: inline-block;
    }
    
    .sidebar-link {
        display: block;
        padding: 8px 10px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        border-radius: 5px;
        transition: all 0.2s ease;
        margin-bottom: 5px;
    }
    
    .sidebar-link:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        transform: translateX(5px);
    }
    
    .speech-controls {
        background-color: rgba(0, 0, 0, 0.03);
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
        border-left: 4px solid var(--primary-color);
    }
    
    .source-item {
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    
    .source-item:hover {
        background-color: rgba(0, 123, 255, 0.05);
    }
    
    .source-item.speaking {
        background-color: rgba(0, 123, 255, 0.1);
        border-left: 3px solid var(--primary-color);
    }
    
    .audio-player-container {
        background-color: rgba(0, 0, 0, 0.02);
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
        border-left: 4px solid var(--success-color);
    }
    
    .audio-player {
        width: 100%;
        margin: 10px 0;
    }
    
    .audio-player audio {
        width: 100%;
    }
    
    .condensed-audio {
        border-left: 4px solid var(--info-color) !important;
    }
    
    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1100;
    }
    
    .dialog-container {
        background-color: white;
        border-radius: 5px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .dialog-header {
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .dialog-body {
        padding: 1rem;
    }
    
    .dialog-footer {
        padding: 1rem;
        border-top: 1px solid #dee2e6;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
    }
`;
document.head.appendChild(styleElement);

// 生成轉錄摘要
function generateSummaryAudio() {
    if (!currentResearchData) {
        showNotification('沒有研究數據可以生成摘要', 'error');
        return;
    }

    showNotification('正在生成摘要音頻...這可能需要幾分鐘時間', 'info');

    // 添加目標時長到研究數據
    const requestData = {
        ...currentResearchData,
        voice: "alloy" // 使用默認語音
    };

    fetch('/api/generate_summary_audio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('摘要音頻生成成功', 'success');
            
            // 創建音頻播放器和下載按鈕
            const audioPlayer = document.createElement('div');
            audioPlayer.className = 'mt-3 mb-3';
            audioPlayer.innerHTML = `
                <h5>研究報告摘要（約一分鐘）</h5>
                <audio controls class="w-100">
                    <source src="/${data.audio_file}" type="audio/mpeg">
                    您的瀏覽器不支持音頻播放
                </audio>
                <div class="mt-2">
                    <a href="/${data.audio_file}" class="btn btn-primary btn-sm" download>
                        <i class="fas fa-download"></i> 下載摘要音頻
                    </a>
                    <a href="/${data.text_file}" class="btn btn-secondary btn-sm ml-2" download>
                        <i class="fas fa-download"></i> 下載摘要文本
                    </a>
                </div>
                <div class="mt-2 small text-muted">
                    原始文本長度：${data.original_length} 字符<br>
                    摘要文本長度：${data.condensed_length} 字符<br>
                    壓縮比例：${Math.round((data.condensed_length / data.original_length) * 100)}%
                </div>
            `;
            
            // 添加到研究結果區域
            const resultArea = document.getElementById('research-result');
            
            // 檢查是否已經有音頻播放器
            const existingAudioPlayer = resultArea.querySelector('.mt-3.mb-3');
            if (existingAudioPlayer) {
                resultArea.replaceChild(audioPlayer, existingAudioPlayer);
            } else {
                resultArea.appendChild(audioPlayer);
            }
        } else {
            showNotification('摘要音頻生成失敗: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('生成摘要音頻時出錯:', error);
        showNotification('生成摘要音頻時出錯', 'error');
    });
}

// 添加生成摘要按鈕到工具欄
function addGenerateButtons() {
    const toolbarRight = document.querySelector('.toolbar-right');
    if (!toolbarRight) {
        console.error('未找到工具欄');
        return;
    }
    
    // 創建生成摘要按鈕
    const generateSummaryBtn = document.createElement('button');
    generateSummaryBtn.id = 'generate-summary-btn';
    generateSummaryBtn.className = 'btn btn-outline-info btn-sm';
    generateSummaryBtn.innerHTML = '<i class="fas fa-microphone-alt"></i> 轉錄摘要';
    generateSummaryBtn.addEventListener('click', generateSummaryAudio);
    
    // 添加按鈕到工具欄
    toolbarRight.insertBefore(generateSummaryBtn, toolbarRight.firstChild);
}

// 在頁面加載完成後添加按鈕
document.addEventListener('DOMContentLoaded', function() {
    // 等待工具欄加載完成
    setTimeout(addGenerateButtons, 1000);
});

// 添加保存濃縮報告為 txt 文件的功能
function addSaveToTxtButton() {
    // 檢查是否已經添加了按鈕
    if (document.getElementById('save-to-txt-btn')) {
        return;
    }
    
    // 創建保存為 txt 按鈕
    const saveToTxtBtn = document.createElement('button');
    saveToTxtBtn.id = 'save-to-txt-btn';
    saveToTxtBtn.className = 'btn btn-outline-secondary btn-sm';
    saveToTxtBtn.innerHTML = '<i class="fas fa-file-alt"></i> 保存為 TXT';
    saveToTxtBtn.addEventListener('click', saveReportToTxt);
    
    // 添加到工具欄
    const toolbarRight = document.querySelector('.toolbar-right');
    if (toolbarRight) {
        toolbarRight.insertBefore(saveToTxtBtn, toolbarRight.firstChild);
    }
}

// 保存報告為 txt 文件
function saveReportToTxt() {
    if (!currentResearchData) {
        showNotification('沒有研究數據可以保存', 'error');
        return;
    }
    
    showNotification('正在保存報告為 TXT 文件...', 'info');
    
    fetch('/api/save_condensed_report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            research_data: currentResearchData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('報告已保存為 TXT 文件', 'success');
            
            // 創建下載按鈕
            const downloadButton = document.createElement('a');
            downloadButton.href = '/' + data.relative_path;
            downloadButton.className = 'btn btn-primary btn-sm';
            downloadButton.innerHTML = '<i class="fas fa-download"></i> 下載 TXT 文件';
            downloadButton.download = '';
            downloadButton.target = '_blank';
            
            // 添加到研究結果區域
            const resultArea = document.getElementById('research-result');
            const downloadContainer = document.createElement('div');
            downloadContainer.className = 'mt-3 mb-3 text-center';
            downloadContainer.appendChild(downloadButton);
            
            // 檢查是否已經有下載按鈕
            const existingDownloadContainer = resultArea.querySelector('.text-center');
            if (existingDownloadContainer) {
                resultArea.replaceChild(downloadContainer, existingDownloadContainer);
            } else {
                resultArea.appendChild(downloadContainer);
            }
        } else {
            showNotification('保存報告失敗: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('保存報告時出錯:', error);
        showNotification('保存報告時出錯', 'error');
    });
}

// 顯示已保存研究報告摘要
function displaySavedResearchSummaries(summaries) {
    const savedResearchContainer = document.getElementById('saved-research-container');
    if (!savedResearchContainer) {
        return;
    }
    
    // 清空容器
    savedResearchContainer.innerHTML = '';
    
    if (summaries.length === 0) {
        savedResearchContainer.innerHTML = '<div class="alert alert-info">沒有保存的研究報告</div>';
        return;
    }
    
    // 創建摘要列表
    const summaryList = document.createElement('div');
    summaryList.className = 'list-group';
    
    summaries.forEach(summary => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'list-group-item list-group-item-action';
        summaryItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${summary.title}</h5>
                <small>${formatTimestamp(summary.timestamp)}</small>
            </div>
            <p class="mb-1">${summary.summary}</p>
            <small>查詢: ${summary.query}</small>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary view-research-btn" data-id="${summary.id}">
                    <i class="fas fa-eye"></i> 查看完整報告
                </button>
                <button class="btn btn-sm btn-outline-secondary save-txt-btn" data-id="${summary.id}">
                    <i class="fas fa-file-alt"></i> 保存為 TXT
                </button>
            </div>
        `;
        summaryList.appendChild(summaryItem);
    });
    
    savedResearchContainer.appendChild(summaryList);
    
    // 添加查看報告事件
    document.querySelectorAll('.view-research-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const researchId = this.getAttribute('data-id');
            viewSavedResearch(researchId);
        });
    });
    
    // 添加保存為 TXT 事件
    document.querySelectorAll('.save-txt-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const researchId = this.getAttribute('data-id');
            saveSavedResearchToTxt(researchId);
        });
    });
}

// 格式化時間戳
function formatTimestamp(timestamp) {
    if (!timestamp) return '未知時間';
    
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 查看保存的研究報告
function viewSavedResearch(researchId) {
    fetch(`/api/get_research/${researchId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 顯示研究報告
                currentResearchData = data.research;
                displayResearchResult(data.research);
                
                // 切換到研究結果頁面
                document.getElementById('saved-research-container').style.display = 'none';
                document.getElementById('result-container').style.display = 'block';
                
                // 添加返回按鈕
                addBackToSavedResearchButton();
            } else {
                showNotification('獲取研究報告失敗: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('獲取研究報告時出錯:', error);
            showNotification('獲取研究報告時出錯', 'error');
        });
}

// 添加返回到已保存研究的按鈕
function addBackToSavedResearchButton() {
    // 檢查是否已經添加了按鈕
    if (document.getElementById('back-to-saved-btn')) {
        return;
    }
    
    // 創建返回按鈕
    const backBtn = document.createElement('button');
    backBtn.id = 'back-to-saved-btn';
    backBtn.className = 'btn btn-outline-secondary btn-sm mb-3';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> 返回已保存研究';
    backBtn.addEventListener('click', function() {
        // 切換回已保存研究頁面
        document.getElementById('result-container').style.display = 'none';
        document.getElementById('saved-research-container').style.display = 'block';
    });
    
    // 添加到研究結果區域
    const resultArea = document.getElementById('research-result');
    resultArea.insertBefore(backBtn, resultArea.firstChild);
}

// 將保存的研究報告保存為 TXT
function saveSavedResearchToTxt(researchId) {
    fetch(`/api/get_research/${researchId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 保存為 TXT
                fetch('/api/save_condensed_report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        research_data: data.research
                    })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        showNotification('報告已保存為 TXT 文件', 'success');
                        
                        // 創建下載鏈接
                        const downloadLink = document.createElement('a');
                        downloadLink.href = '/' + result.relative_path;
                        downloadLink.download = '';
                        downloadLink.style.display = 'none';
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    } else {
                        showNotification('保存報告失敗: ' + result.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('保存報告時出錯:', error);
                    showNotification('保存報告時出錯', 'error');
                });
            } else {
                showNotification('獲取研究報告失敗: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('獲取研究報告時出錯:', error);
            showNotification('獲取研究報告時出錯', 'error');
        });
}

// 在頁面加載時加載已保存的研究報告摘要
document.addEventListener('DOMContentLoaded', function() {
    // 獲取已保存研究按鈕
    const savedResearchBtn = document.querySelector('a[href="#saved-research"]');
    if (savedResearchBtn) {
        savedResearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 隱藏其他內容，顯示已保存研究容器
            document.getElementById('research-form').style.display = 'none';
            document.getElementById('result-container').style.display = 'none';
            
            // 確保已保存研究容器存在
            let savedResearchContainer = document.getElementById('saved-research-container');
            if (!savedResearchContainer) {
                savedResearchContainer = document.createElement('div');
                savedResearchContainer.id = 'saved-research-container';
                savedResearchContainer.className = 'container mt-4';
                document.querySelector('main').appendChild(savedResearchContainer);
            }
            
            savedResearchContainer.style.display = 'block';
            
            // 加載已保存的研究報告摘要
            loadSavedResearchSummaries();
        });
    }
    
    // 獲取新研究按鈕
    const newResearchBtn = document.querySelector('a[href="#new-research"]');
    if (newResearchBtn) {
        newResearchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 顯示研究表單，隱藏其他內容
            document.getElementById('research-form').style.display = 'block';
            document.getElementById('result-container').style.display = 'none';
            
            const savedResearchContainer = document.getElementById('saved-research-container');
            if (savedResearchContainer) {
                savedResearchContainer.style.display = 'none';
            }
        });
    }
});

// 加載已保存的研究報告摘要
function loadSavedResearchSummaries() {
    fetch('/api/get_saved_research_summaries')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displaySavedResearchSummaries(data.summaries);
            } else {
                console.error('獲取研究報告摘要失敗:', data.message);
            }
        })
        .catch(error => {
            console.error('獲取研究報告摘要時出錯:', error);
        });
}
