require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const WechatAPI = require('wechat-api');
const winston = require('winston');
const rateLimit = require("express-rate-limit");

const app = express();
const port = process.env.PORT || 9999;

// 中间件配置（必须在路由之前）
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 提供静态文件服务
app.use(express.static('./', {
  index: 'index.html'
}));

// 速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 每个 IP 限制 100 个请求
});
app.use("/api/", apiLimiter);

// 日志配置
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'popmart-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// 调试日志函数
const debugLog = process.env.NODE_ENV !== 'production'
  ? (...args) => logger.debug(...args)
  : () => {};

// 微信 API 配置
const wechatConfig = {
  appId: process.env.WECHAT_APP_ID || 'demo_app_id',
  appSecret: process.env.WECHAT_APP_SECRET || 'demo_app_secret'
};

// 简化的微信API模拟（用于演示）
const wechatApi = {
  getAuthorizeURL: (redirectUri, state, scope) => {
    // 生成微信授权URL（模拟）
    const baseUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    const params = new URLSearchParams({
      appid: wechatConfig.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope || 'snsapi_userinfo',
      state: state || 'STATE'
    });
    return `${baseUrl}?${params.toString()}#wechat_redirect`;
  },
  
  getAccessToken: async (code) => {
    // 模拟获取access token
    return {
      data: {
        access_token: 'mock_access_token',
        openid: 'mock_openid_' + Date.now()
      }
    };
  },
  
  getUser: async (openid) => {
    // 模拟获取用户信息
    return {
      openid: openid,
      nickname: '测试用户',
      headimgurl: 'https://example.com/avatar.jpg'
    };
  },
  
  getPayParams: async (params) => {
    // 生成微信支付参数（模拟）
    return {
      appId: wechatConfig.appId,
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).substring(2),
      package: `prepay_id=mock_prepay_id_${Date.now()}`,
      signType: 'MD5',
      paySign: 'mock_pay_sign',
      // 添加支付跳转URL
      mweb_url: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=mock_prepay_id_${Date.now()}&package=1234567890`
    };
  }
};

// Popmart API 配置
const popmartApiBaseUrl = process.env.POPMART_API_BASE_URL;
const popmartApiKey = process.env.POPMART_API_KEY;

// 推送通知服务
const pushNotificationService = {
  // 微信推送 (使用Server酱)
  sendWechatPush: async (title, content, key = process.env.SERVERCHAN_KEY) => {
    if (!key) return;
    
    try {
      const response = await axios.post(`https://sctapi.ftqq.com/${key}.send`, {
        title: title,
        desp: content
      });
      logger.info('微信推送发送成功');
      return response.data;
    } catch (error) {
      logger.error('微信推送发送失败:', error);
    }
  },

  // 邮件推送
  sendEmailPush: async (to, subject, content) => {
    // 这里可以集成邮件服务，如 Nodemailer
    logger.info('邮件推送:', { to, subject });
  },

  // 手机浏览器推送
  sendWebPush: async (userId, payload) => {
    // 这里可以集成 Web Push API
    logger.info('Web推送:', { userId, payload });
  }
};

// 新品发现处理函数
async function handleNewProductDiscovered(product, userId) {
  logger.info('发现新品:', { product: product.name, userId });
  
  // 1. 微信推送
  await pushNotificationService.sendWechatPush(
    `🔥 泡泡马特新品上架！`,
    `**${product.name}**\n\n💰 价格：¥${product.price}\n⏰ 时间：${new Date().toLocaleString()}\n\n🛒 [立即购买](http://localhost:9999/mobile.html)`
  );

  // 2. 记录到全局状态
  if (!global.discoveredProducts) {
    global.discoveredProducts = [];
  }
  global.discoveredProducts.unshift({
    ...product,
    discoveredAt: new Date().toISOString(),
    userId: userId
  });

  // 3. 只保留最近50个
  if (global.discoveredProducts.length > 50) {
    global.discoveredProducts = global.discoveredProducts.slice(0, 50);
  }
}

// 获取发现的新品列表 - 移动端无需token验证
app.get('/api/discovered-products', (req, res) => {
  res.json({
    code: 200,
    data: {
      products: global.discoveredProducts || [],
      count: (global.discoveredProducts || []).length
    }
  });
});

// 获取发现的新品列表（需要验证的版本）
app.get('/api/discovered-products-auth', authenticateToken, (req, res) => {
  res.json({
    code: 200,
    data: {
      products: global.discoveredProducts || [],
      count: (global.discoveredProducts || []).length
    }
  });
});

// 手动触发新品发现 (用于测试) - 移动端无需登录
app.post('/api/trigger-discovery', async (req, res) => {
  try {
    const mockProduct = {
      id: 'test_' + Date.now(),
      name: '测试新品 - MOLLY Space',
      price: 69,
      releaseTime: new Date().toISOString(),
      image: 'https://example.com/image.jpg'
    };

    await handleNewProductDiscovered(mockProduct, 'mobile_user');
    
    res.json({
      code: 200,
      message: '测试推送已发送',
      data: mockProduct
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 移动端快速购买 - 无需登录
app.post('/api/mobile/quick-purchase', async (req, res) => {
  try {
    const { productId, productName } = req.body;
    
    // 模拟订单创建
    const orderId = 'mobile_order_' + Date.now();
    const mockOrder = {
      orderId: orderId,
      productId: productId,
      productName: productName,
      quantity: 1,
      price: 59.00,
      status: 'pending',
      createTime: new Date().toISOString()
    };

    // 生成微信支付参数
    const payParams = await wechatApi.getPayParams({
      body: productName || 'Popmart商品',
      out_trade_no: orderId,
      total_fee: 5900, // 总金额（分）
      spbill_create_ip: req.ip,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
      trade_type: 'MWEB', // 手机网页支付
      openid: 'mobile_user'
    });
    
    res.json({ 
      code: 200, 
      data: { 
        orderId: orderId,
        order: mockOrder,
        // 直接跳转到微信支付的URL
        wechatPayUrl: payParams.mweb_url,
        payParams: payParams
      },
      message: '订单创建成功，正在跳转到微信支付...'
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 错误处理函数
function handleError(res, error, statusCode = 500) {
  logger.error('Error occurred:', { error: error.message, stack: error.stack });
  res.status(statusCode).json({
    code: statusCode,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message
  });
}

// 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 存储登录状态的简单内存存储（生产环境应使用Redis）
const loginSessions = new Map();

// API 路由

// 获取微信登录二维码
app.get('/api/wx-login/qrcode', async (req, res) => {
  try {
    // 生成一个session ID用于追踪登录状态
    const sessionId = Math.random().toString(36).substring(2);
    const redirectUri = `${process.env.WECHAT_REDIRECT_URI || 'http://localhost:9999/api/wx-login/callback'}?session=${sessionId}`;
    
    // 不使用真实的微信授权URL，而是生成一个模拟的登录链接
    const loginUrl = `${redirectUri}&code=mock_code_${sessionId}`;
    
    // 使用QR码生成服务创建二维码图片
    const qrcodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(loginUrl)}`;
    
    // 初始化登录session
    loginSessions.set(sessionId, { status: 'pending', timestamp: Date.now() });
    
    logger.info('Generated QR code for session:', { sessionId, qrcodeImageUrl });
    
    res.json({ 
      code: 200, 
      data: { 
        qrcode: qrcodeImageUrl,
        sessionId: sessionId,
        loginUrl: loginUrl // 提供原始URL用于调试
      } 
    });
  } catch (error) {
    logger.error('QR code generation error:', error);
    handleError(res, error);
  }
});

// 检查登录状态
app.get('/api/wx-login/status/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const session = loginSessions.get(sessionId);
    
    if (!session) {
      return res.json({ code: 404, message: 'Session not found' });
    }
    
    // 检查session是否过期（10分钟）
    if (Date.now() - session.timestamp > 10 * 60 * 1000) {
      loginSessions.delete(sessionId);
      return res.json({ code: 408, message: 'Session expired' });
    }
    
    res.json({ 
      code: 200, 
      data: { 
        status: session.status,
        token: session.token,
        userInfo: session.userInfo
      } 
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 微信登录回调
app.get('/api/wx-login/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const sessionId = req.query.session;
    
    if (!sessionId) {
      return res.status(400).send('Missing session parameter');
    }
    
    const result = await wechatApi.getAccessToken(code);
    const userInfo = await wechatApi.getUser(result.data.openid);

    // 创建 JWT token
    const token = jwt.sign({ id: userInfo.openid }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // 更新登录session
    loginSessions.set(sessionId, {
      status: 'success',
      token: token,
      userInfo: userInfo,
      timestamp: Date.now()
    });

    res.send(`
      <html>
        <head><title>登录成功</title></head>
        <body>
          <h2>登录成功！</h2>
          <p>您可以关闭此页面并返回应用</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('WeChat login callback error:', error);
    res.status(500).send('Login failed');
  }
});

// 代理路由 - 添加这些路由来代理泡泡马特API
app.use('/proxy/api', authenticateToken);

// 代理微信登录相关请求（不需要认证）
app.get('/proxy/wx-login/qrcode', (req, res) => {
  res.redirect('/api/wx-login/qrcode');
});

app.get('/proxy/wx-login/status/:sessionId', (req, res) => {
  res.redirect(`/api/wx-login/status/${req.params.sessionId}`);
});

// 代理商品列表（需要认证）
app.get('/proxy/api/goods/list', async (req, res) => {
  try {
    // 这里应该调用真实的泡泡马特API
    // 目前返回模拟数据用于测试
    const mockData = {
      code: 200,
      data: {
        list: [
          {
            id: 'prod_001',
            name: 'SKULLPANDA Urban',
            price: 59,
            releaseTime: new Date().toISOString(),
            image: 'https://example.com/image1.jpg',
            status: 'available'
          },
          {
            id: 'prod_002', 
            name: 'MOLLY Western',
            price: 69,
            releaseTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分钟前
            image: 'https://example.com/image2.jpg',
            status: 'available'
          }
        ]
      }
    };
    
    res.json(mockData);
  } catch (error) {
    handleError(res, error);
  }
});

// 代理订单创建
app.post('/proxy/api/order/create', async (req, res) => {
  try {
    const { goodsId, quantity } = req.body;
    
    // 模拟订单创建
    const orderId = 'order_' + Date.now();
    const mockOrder = {
      orderId: orderId,
      productId: goodsId,
      quantity: quantity,
      price: 59.00,
      status: 'pending',
      createTime: new Date().toISOString()
    };
    
    res.json({ 
      code: 200, 
      data: { 
        orderId: orderId,
        order: mockOrder
      } 
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 代理微信支付
app.post('/proxy/api/payment/wechat', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // 生成微信支付参数
    const payParams = await wechatApi.getPayParams({
      body: 'Popmart商品',
      out_trade_no: orderId,
      total_fee: 5900, // 总金额（分）
      spbill_create_ip: req.ip,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
      trade_type: 'MWEB', // 手机网页支付
      openid: req.user.id
    });
    
    // 模拟支付二维码
    const payQrcode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payParams.mweb_url)}`;
    
    res.json({ 
      code: 200, 
      data: { 
        payQrcode: payQrcode,
        orderId: orderId,
        // 直接跳转到微信支付的URL
        wechatPayUrl: payParams.mweb_url,
        payParams: payParams
      } 
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 获取新品列表
app.get('/api/goods/list', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${popmartApiBaseUrl}/products`, {
      headers: { 'Authorization': `Bearer ${popmartApiKey}` },
      params: req.query // 传递查询参数，如页码、每页数量等
    });
    res.json({ code: 200, data: response.data });
  } catch (error) {
    handleError(res, error);
  }
});

// 获取产品详情
app.get('/api/goods/detail/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const response = await axios.get(`${popmartApiBaseUrl}/products/${productId}`, {
      headers: { 'Authorization': `Bearer ${popmartApiKey}` }
    });
    res.json({ code: 200, data: response.data });
  } catch (error) {
    handleError(res, error);
  }
});

// 创建订单
app.post('/api/order/create', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const response = await axios.post(`${popmartApiBaseUrl}/orders`, {
      productId,
      quantity,
      userId: req.user.id
    }, {
      headers: { 'Authorization': `Bearer ${popmartApiKey}` }
    });
    res.json({ code: 200, data: response.data });
  } catch (error) {
    handleError(res, error);
  }
});

// 获取订单状态
app.get('/api/order/status/:orderId', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const response = await axios.get(`${popmartApiBaseUrl}/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${popmartApiKey}` }
    });
    res.json({ code: 200, data: response.data });
  } catch (error) {
    handleError(res, error);
  }
});

// 获取微信支付参数
app.post('/api/payment/wechat', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    // 这里需要根据微信支付 API 文档实现具体逻辑
    const payParams = await wechatApi.getPayParams({
      body: 'Popmart商品',
      out_trade_no: orderId,
      total_fee: 1, // 总金额（分）
      spbill_create_ip: req.ip,
      notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
      trade_type: 'JSAPI',
      openid: req.user.id
    });
    res.json({ code: 200, data: payParams });
  } catch (error) {
    handleError(res, error);
  }
});

// 微信支付回调
app.post('/api/payment/wechat/notify', (req, res) => {
  // 处理微信支付回调，更新订单状态等
  // 这里需要根据微信支付文档实现具体逻辑
  try {
    // 验证签名等操作...
    // 更新订单状态...
    logger.info('Payment notification received');
    res.send('SUCCESS');
  } catch (error) {
    logger.error('Payment notification error:', error);
    res.status(500).send('FAIL');
  }
});

// 简单的用户名密码登录（演示用）
app.post('/api/simple-login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 简单的演示账号（生产环境应使用数据库和加密）
    const demoAccounts = {
      'admin': 'password123',
      'user': '123456',
      'demo': 'demo'
    };
    
    if (demoAccounts[username] === password) {
      // 创建 JWT token
      const token = jwt.sign({ 
        id: username,
        loginType: 'simple',
        loginTime: new Date().toISOString()
      }, process.env.JWT_SECRET || 'demo_secret', { expiresIn: '24h' });
      
      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token: token,
          userInfo: {
            username: username,
            loginType: 'simple',
            nickname: `用户${username}`
          }
        }
      });
    } else {
      res.status(401).json({
        code: 401,
        message: '用户名或密码错误'
      });
    }
  } catch (error) {
    handleError(res, error);
  }
});

// 获取简单登录页面
app.get('/simple-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>简单登录 - Popmart监控系统</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 50px; background: #f5f5f5; }
            .login-box { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { text-align: center; color: #333; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; color: #555; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
            .demo-accounts { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; font-size: 14px; }
            .demo-accounts h3 { margin-top: 0; color: #666; }
            .account { margin: 5px 0; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h1>🎯 Popmart监控系统</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label>用户名：</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label>密码：</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit">登录</button>
            </form>
            
            <div class="demo-accounts">
                <h3>演示账号：</h3>
                <div class="account">admin / password123</div>
                <div class="account">user / 123456</div>
                <div class="account">demo / demo</div>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/api/simple-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const result = await response.json();
                    
                    if (result.code === 200) {
                        // 保存token到localStorage
                        localStorage.setItem('auth_token', result.data.token);
                        localStorage.setItem('user_info', JSON.stringify(result.data.userInfo));
                        alert('登录成功！');
                        // 跳转到主页面
                        window.location.href = '/';
                    } else {
                        alert('登录失败：' + result.message);
                    }
                } catch (error) {
                    alert('登录出错：' + error.message);
                }
            });
        </script>
    </body>
    </html>
  `);
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  handleError(res, err);
});

// 启动服务器 - 监听所有网络接口
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running at http://0.0.0.0:${port}`);
  logger.info(`Local access: http://localhost:${port}`);
  
  // 获取本机IP地址
  const networkInterfaces = require('os').networkInterfaces();
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(networkInterface => {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        logger.info(`Network access: http://${networkInterface.address}:${port}`);
      }
    });
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
  });
});