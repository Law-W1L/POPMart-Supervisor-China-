// Configuration
const CONFIG = {
    checkInterval: 5000, // Check interval (milliseconds)
    popmartBaseUrl: 'http://localhost:9999', // Points to our local proxy server
    apiEndpoints: {
        // All API requests will be forwarded through our local proxy server
        loginQrcode: '/api/wx-login/qrcode', // Get WeChat login QR code
        loginStatus: '/api/wx-login/status', // Check login status
        newProducts: '/proxy/api/goods/list', // Product list
        productDetail: '/proxy/api/goods/detail', // Product details
        purchase: '/proxy/api/order/create', // Create order
        wechatPay: '/proxy/api/payment/wechat' // WeChat payment
    },
    emailjs: {
        serviceID: 'service_uicejdr',
        templateID: 'template_gegvzf2',
        userID: '5Y6NeYiv1iO0CSCoO'
    }
};

// State management
let state = {
    isMonitoring: false,
    monitoredProducts: new Set(),
    userCredentials: null,
    notificationEnabled: true,
    autoPurchase: true,
    emailEnabled: true,
    emailAddress: '992557645@qq.com',
    lastCheckTime: null,
    token: null,
    loginCheckInterval: null,
    productCheckInterval: null,
    sessionId: null
};

// DOM elements - 使用函数获取，避免页面加载顺序问题
function getElements() {
    return {
        startMonitor: document.getElementById('startMonitor'),
        stopMonitor: document.getElementById('stopMonitor'),
        status: document.getElementById('status'),
        monitoredProducts: document.getElementById('monitoredProducts'),
        loginArea: document.getElementById('login-area'),
        emailForm: document.getElementById('emailForm'),
        enableNotification: document.getElementById('enableNotification'),
        enableEmail: document.getElementById('enableEmail'),
        autoPurchase: document.getElementById('autoPurchase'),
        notification: document.getElementById('notification'),
        monitorStatus: document.getElementById('monitor-status'),
        monitoringStatus: document.getElementById('monitoring-status')
    };
}

// Initialization
function init() {
    console.log('🚀 初始化泡泡马特系统...');
    
    // 等待DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM加载完成，开始初始化...');
            startInit();
        });
    } else {
        console.log('📄 DOM已准备好，立即初始化...');
        startInit();
    }
}

function startInit() {
    loadSavedSettings();
    setupEventListeners();
    checkNotificationPermission();
    initEmailJS();
    
    // 延迟一下确保所有元素都已加载
    setTimeout(() => {
        console.log('🔄 自动获取登录二维码...');
        getLoginQRCode();
    }, 500);
}

// Get Login QR Code
async function getLoginQRCode() {
    try {
        const elements = getElements();
        showLoginLoading();
        
        const response = await fetch(`${CONFIG.popmartBaseUrl}${CONFIG.apiEndpoints.loginQrcode}`);
        const result = await response.json();

        console.log('二维码API响应:', result); // 调试日志

        if (result.code === 200) {
            const qrcodeUrl = result.data.qrcode;
            state.sessionId = result.data.sessionId;
            
            console.log('生成的二维码URL:', qrcodeUrl); // 调试日志
            
            // 创建二维码图片URL
            const qrcodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrcodeUrl)}`;
            
            console.log('二维码图片URL:', qrcodeImageUrl); // 调试日志
            
            if (elements.loginArea) {
                elements.loginArea.innerHTML = `
                    <div class="qrcode-container">
                        <img id="qrcode-image" src="${qrcodeImageUrl}" alt="微信登录二维码" 
                             style="width: 220px; height: 220px; border-radius: 12px; box-shadow: 0 0 8px #ccc;" 
                             onerror="console.error('二维码图片加载失败'); this.style.display='none'; this.nextElementSibling.innerHTML='二维码加载失败，请刷新重试';" />
                        <p id="qrcode-text">请使用手机微信扫描二维码登录</p>
                        <p style="font-size: 12px; color: #999; margin-top: 10px;">
                            会话ID: ${state.sessionId}
                        </p>
                    </div>
                `;
            } else {
                console.error('loginArea元素未找到');
            }

            // 开始轮询登录状态
            startLoginStatusCheck();
            updateStatus("请扫描二维码登录");
        } else {
            console.error('获取二维码失败:', result.message);
            updateStatus("获取二维码失败，请重试");
            
            // 显示错误信息
            if (elements.loginArea) {
                elements.loginArea.innerHTML = `
                    <div class="qrcode-container">
                        <div style="padding: 60px 20px; color: #e74c3c; text-align: center;">
                            <p>❌ 获取二维码失败</p>
                            <p style="font-size: 14px; color: #666;">${result.message || '请重试'}</p>
                            <button onclick="getLoginQRCode()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                🔄 重新获取
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('获取二维码出错:', error);
        updateStatus("网络错误，请检查服务器");
        
        const elements = getElements();
        if (elements.loginArea) {
            elements.loginArea.innerHTML = `
                <div class="qrcode-container">
                    <div style="padding: 60px 20px; color: #e74c3c; text-align: center;">
                        <p>❌ 网络连接错误</p>
                        <p style="font-size: 14px; color: #666;">请检查服务器是否运行</p>
                        <button onclick="getLoginQRCode()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            🔄 重新连接
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// 显示登录加载状态
function showLoginLoading() {
    const elements = getElements();
    if (elements.loginArea) {
        elements.loginArea.innerHTML = `
            <div class="qrcode-container">
                <div style="padding: 80px 0; color: #666;">
                    正在生成登录二维码...
                </div>
            </div>
        `;
    }
}

// 开始登录状态检查
function startLoginStatusCheck() {
    if (state.loginCheckInterval) {
        clearInterval(state.loginCheckInterval);
    }
    
    state.loginCheckInterval = setInterval(async () => {
        try {
            if (!state.sessionId) return;
            
            const response = await fetch(`${CONFIG.popmartBaseUrl}${CONFIG.apiEndpoints.loginStatus}/${state.sessionId}`);
            const result = await response.json();
            
            if (result.code === 200) {
                if (result.data.status === 'success') {
                    // 登录成功
                    state.token = result.data.token;
                    onLoginSuccess(result.data.userInfo);
                    clearInterval(state.loginCheckInterval);
                }
            } else if (result.code === 408) {
                // Session 过期，重新生成二维码
                updateStatus("二维码已过期，正在重新生成...");
                getLoginQRCode();
            }
        } catch (error) {
            console.error('检查登录状态错误:', error);
        }
    }, 2000); // 每2秒检查一次
}

// 登录成功处理
function onLoginSuccess(userInfo) {
    const elements = getElements();
    
    if (elements.loginArea) {
        elements.loginArea.innerHTML = `
            <div style="padding: 20px; background-color: #d4edda; border-radius: 8px; color: #155724;">
                <h3>✅ 登录成功</h3>
                <p>欢迎，${userInfo.nickname || '用户'}</p>
            </div>
        `;
    }
    
    updateStatus("登录成功，可以开始监控");
    
    // 保存登录状态
    saveSettings();
    
    // 显示监控状态区域
    if (elements.monitorStatus) {
        elements.monitorStatus.style.display = 'block';
        elements.monitorStatus.textContent = "准备监控新品...";
    }
    
    // 自动开始监控
    setTimeout(() => {
        if (state.token) {
            startMonitoring();
        }
    }, 1000);
}

// 更新状态显示
function updateStatus(message) {
    const elements = getElements();
    if (elements.status) {
        elements.status.textContent = message;
    }
}

// 更新监控状态
function updateMonitoringStatus(message, type = 'warning') {
    const elements = getElements();
    if (elements.monitoringStatus) {
        elements.monitoringStatus.textContent = message;
    }
    
    // 更新状态指示器
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
        indicator.className = `status-indicator status-${type}`;
    }
}

// 显示通知
function showNotification(message, isError = false) {
    // 浏览器通知
    if (state.notificationEnabled && Notification.permission === "granted") {
        new Notification("泡泡马特监控", {
            body: message,
            icon: "/favicon.ico"
        });
    }
    
    // 页面通知
    console.log(isError ? `❌ ${message}` : `✅ ${message}`);
    updateStatus(message);
}

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(CONFIG.emailjs.userID);
    }
}

// Load saved settings
function loadSavedSettings() {
    const savedSettings = localStorage.getItem('popmartSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        state.token = settings.token;
        state.notificationEnabled = settings.notificationEnabled !== false;
        state.autoPurchase = settings.autoPurchase !== false;
        state.emailEnabled = settings.emailEnabled !== false;
        state.emailAddress = settings.emailAddress || '992557645@qq.com';

        // Update UI if elements exist
        setTimeout(() => {
            const elements = getElements();
            if (elements.enableNotification) elements.enableNotification.checked = state.notificationEnabled;
            if (elements.autoPurchase) elements.autoPurchase.checked = state.autoPurchase;
            if (elements.enableEmail) elements.enableEmail.checked = state.emailEnabled;
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.value = state.emailAddress;
        }, 100);
    }
}

// Save settings
function saveSettings() {
    const settings = {
        token: state.token,
        notificationEnabled: state.notificationEnabled,
        autoPurchase: state.autoPurchase,
        emailEnabled: state.emailEnabled,
        emailAddress: state.emailAddress
    };
    localStorage.setItem('popmartSettings', JSON.stringify(settings));
}

// Set event listeners
function setupEventListeners() {
    setTimeout(() => {
        const elements = getElements();
        if (elements.startMonitor) elements.startMonitor.addEventListener('click', startMonitoring);
        if (elements.stopMonitor) elements.stopMonitor.addEventListener('click', stopMonitoring);
        if (elements.emailForm) elements.emailForm.addEventListener('submit', saveEmailSettings);
        if (elements.enableNotification) elements.enableNotification.addEventListener('change', toggleNotification);
        if (elements.enableEmail) elements.enableEmail.addEventListener('change', toggleEmail);
        if (elements.autoPurchase) elements.autoPurchase.addEventListener('change', toggleAutoPurchase);
        if (elements.loginArea) elements.loginArea.addEventListener('click', getLoginQRCode);
    }, 100);
}

// Check notification permission
async function checkNotificationPermission() {
    if (!("Notification" in window)) {
        showNotification("Your browser does not support notifications", true);
        state.notificationEnabled = false;
        return;
    }

    if (Notification.permission === "granted") {
        return;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            showNotification("Please allow notifications to receive product update alerts", true);
            state.notificationEnabled = false;
        }
    }
}

// Start monitoring
function startMonitoring() {
    if (!state.token) {
        showNotification("Please login first", true);
        return;
    }

    const elements = getElements();
    state.isMonitoring = true;
    
    if (elements.startMonitor) elements.startMonitor.disabled = true;
    if (elements.stopMonitor) elements.stopMonitor.disabled = false;
    
    updateStatus("监控中...");
    updateMonitoringStatus("监控中...", "success");

    // Start periodic product checks
    startProductMonitoring();
}

// Stop monitoring
function stopMonitoring() {
    const elements = getElements();
    state.isMonitoring = false;
    
    if (elements.startMonitor) elements.startMonitor.disabled = false;
    if (elements.stopMonitor) elements.stopMonitor.disabled = true;
    
    updateStatus("已停止监控");
    updateMonitoringStatus("已停止", "warning");
    
    if (state.productCheckInterval) {
        clearInterval(state.productCheckInterval);
    }
}

// Start product monitoring
function startProductMonitoring() {
    if (state.productCheckInterval) {
        clearInterval(state.productCheckInterval);
    }

    state.isMonitoring = true;
    const elements = getElements();
    if (elements.monitorStatus) {
        elements.monitorStatus.textContent = "正在监控新品...";
    }

    state.productCheckInterval = setInterval(async () => {
        try {
            // 1. 检查新品
            const response = await fetch(`${CONFIG.popmartBaseUrl}${CONFIG.apiEndpoints.newProducts}`, {
                headers: {
                    'Authorization': `Bearer ${state.token}`
                }
            });
            const result = await response.json();

            if (result.code === 200) {
                const products = result.data.list || [];

                // Get products from the last 24 hours
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const newProducts = products.filter(product =>
                    new Date(product.releaseTime) > oneDayAgo &&
                    !state.monitoredProducts.has(product.id)
                );

                if (newProducts.length > 0) {
                    // Found new products, handle them
                    newProducts.forEach(handleNewProduct);
                }
            }

            // 2. 获取已发现的产品列表
            const discoveredResponse = await fetch(`${CONFIG.popmartBaseUrl}/api/discovered-products`, {
                headers: {
                    'Authorization': `Bearer ${state.token}`
                }
            });
            
            if (discoveredResponse.ok) {
                const discoveredResult = await discoveredResponse.json();
                if (discoveredResult.code === 200) {
                    updateDiscoveredProductsList(discoveredResult.data.products);
                }
            }

            // Update status display
            const currentTime = new Date().toLocaleTimeString();
            updateMonitoringStatus(`监控中... (上次检查: ${currentTime})`, "success");
            if (elements.monitorStatus) {
                elements.monitorStatus.textContent = `监控中... (上次检查: ${currentTime})`;
            }
        } catch (error) {
            console.error('检查新品错误:', error);
            updateMonitoringStatus("监控出错，正在重试...", "error");
            if (elements.monitorStatus) {
                elements.monitorStatus.textContent = "监控出错，正在重试...";
            }
        }
    }, CONFIG.checkInterval);
}

// Handle new product
async function handleNewProduct(product) {
    state.monitoredProducts.add(product.id);
    updateProductList();

    if (state.notificationEnabled) {
        showNotification(`发现新品: ${product.name} - ¥${product.price}`);
    }

    if (state.emailEnabled) {
        await sendEmailNotification(product);
    }

    if (state.autoPurchase) {
        await attemptPurchase(product);
    }
}

// Attempt purchase
async function attemptPurchase(product) {
    try {
        showNotification(`正在尝试购买: ${product.name}`, false);

        // Create order (via proxy)
        const orderResponse = await fetch(`${CONFIG.popmartBaseUrl}${CONFIG.apiEndpoints.purchase}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                goodsId: product.id,
                quantity: 1,
                paymentMethod: 'wechat'
            })
        });

        const orderResult = await orderResponse.json();

        if (orderResult.code === 200) {
            const orderId = orderResult.data.orderId;
            showNotification(`✅ 订单创建成功！正在跳转微信支付...`);

            // 立即调用微信支付API获取支付URL
            const paymentResponse = await fetch(`${CONFIG.popmartBaseUrl}${CONFIG.apiEndpoints.wechatPay}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    orderId: orderId
                })
            });

            const paymentResult = await paymentResponse.json();

            if (paymentResult.code === 200 && paymentResult.data.wechatPayUrl) {
                // 🚀 直接跳转到微信支付页面
                showNotification(`🚀 正在跳转微信支付页面...`);
                
                // 在新窗口中打开微信支付页面
                const paymentWindow = window.open(paymentResult.data.wechatPayUrl, '_blank', 'width=375,height=667');
                
                // 如果是手机端，尝试直接跳转
                if (isMobileDevice()) {
                    window.location.href = paymentResult.data.wechatPayUrl;
                } else {
                    // PC端显示二维码和跳转选项
                    showPaymentOptions(paymentResult.data, orderId);
                }
                
                showNotification(`💳 微信支付页面已打开，请完成支付`);
            } else {
                // 备选方案：跳转到我们的支付页面
                window.open(`${CONFIG.popmartBaseUrl}/payment.html?orderId=${orderId}`, '_blank');
                showNotification(`💳 跳转到支付页面...`);
            }
        } else {
            throw new Error(orderResult.message || 'Failed to create order');
        }
    } catch (error) {
        console.error('Error purchasing product:', error);
        showNotification("购买失败: " + error.message, true);
    }
}

// 检测是否为移动设备
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 显示支付选项（PC端使用）
function showPaymentOptions(paymentData, orderId) {
    const elements = getElements();
    
    // 创建支付选项弹窗
    const paymentModal = document.createElement('div');
    paymentModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    paymentModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px;">
            <h3>🎉 抢购成功！</h3>
            <p>订单号：${orderId}</p>
            <div style="margin: 20px 0;">
                <img src="${paymentData.payQrcode}" style="width: 200px; height: 200px; border-radius: 8px;">
                <p>扫描二维码支付</p>
            </div>
            <div style="margin: 20px 0;">
                <button onclick="window.open('${paymentData.wechatPayUrl}', '_blank')" 
                        style="background: #07c160; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 5px; cursor: pointer;">
                    🚀 跳转微信支付
                </button>
                <button onclick="window.open('${CONFIG.popmartBaseUrl}/payment.html?orderId=${orderId}', '_blank')" 
                        style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 5px; cursor: pointer;">
                    📱 打开支付页面
                </button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                关闭
            </button>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
    
    // 5秒后自动关闭
    setTimeout(() => {
        if (paymentModal.parentElement) {
            paymentModal.remove();
        }
    }, 30000);
}

// Update product list
function updateProductList() {
    const elements = getElements();
    if (!elements.monitoredProducts) return;
    
    if (state.monitoredProducts.size === 0) {
        elements.monitoredProducts.innerHTML = '<p style="color: #666; text-align: center;">暂无发现新品</p>';
        return;
    }
    
    elements.monitoredProducts.innerHTML = Array.from(state.monitoredProducts)
        .map(productId => {
            const product = { id: productId, name: '新品', price: 'N/A' }; // 简化版本
            return `
                <div class="product-item">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price}</div>
                    <div class="product-time">发现时间: ${new Date().toLocaleString()}</div>
                    <a href="#" onclick="event.preventDefault(); attemptPurchase({ id: '${product.id}', name: '${product.name}', price: '${product.price}' })" class="purchase-link">立即购买</a>
                </div>
            `;
        })
        .join('');
}

// Save email settings
function saveEmailSettings(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    state.emailAddress = email;
    saveSettings();
    showNotification("邮箱设置已保存");
}

// Toggle notification
function toggleNotification(event) {
    state.notificationEnabled = event.target.checked;
    saveSettings();
}

// Toggle email notification
function toggleEmail(event) {
    state.emailEnabled = event.target.checked;
    saveSettings();
}

// Toggle automatic purchase
function toggleAutoPurchase(event) {
    state.autoPurchase = event.target.checked;
    saveSettings();
}

// Send email notification
async function sendEmailNotification(product) {
    if (!state.emailEnabled) return;

    try {
        const templateParams = {
            to_email: state.emailAddress,
            product_name: product.name,
            product_price: product.price,
            product_time: new Date().toLocaleString(),
            product_url: `${CONFIG.popmartBaseUrl}/product/${product.id}`
        };

        if (typeof emailjs !== 'undefined') {
            await emailjs.send(
                CONFIG.emailjs.serviceID,
                CONFIG.emailjs.templateID,
                templateParams
            );
            console.log('邮件通知发送成功');
        }
    } catch (error) {
        console.error('邮件通知发送失败:', error);
        showNotification("邮件通知发送失败: " + error.message, true);
    }
}

// Update discovered products list
function updateDiscoveredProductsList(products) {
    const elements = getElements();
    if (!elements.monitoredProducts) return;
    
    if (!products || products.length === 0) {
        elements.monitoredProducts.innerHTML = '<p style="color: #666; text-align: center;">暂无发现新品</p>';
        return;
    }
    
    elements.monitoredProducts.innerHTML = products.map(product => `
        <div class="product-item">
            <div class="product-name">${product.name}</div>
            <div class="product-price">¥${product.price}</div>
            <div class="product-time">发现时间: ${new Date(product.discoveredAt).toLocaleString()}</div>
            <a href="#" onclick="event.preventDefault(); attemptPurchase({ id: '${product.id}', name: '${product.name}', price: '${product.price}' })" class="purchase-link">立即购买</a>
        </div>
    `).join('');
}

// Test push notification function
async function testPushNotification() {
    try {
        const response = await fetch(`${CONFIG.popmartBaseUrl}/api/trigger-discovery`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            showNotification('📱 测试推送已发送到微信！');
        }
    } catch (error) {
        console.error('测试推送失败:', error);
        showNotification('测试推送失败', true);
    }
}