PS:本代码只供代码学术讨论，如有任何商业用途，与本人无关！



# 🎯 Popmart Auto Monitor & Purchase System

An automated Popmart product monitoring and purchasing system that supports 24/7 PC monitoring, mobile quick purchase, WeChat login integration, and real-time cross-device synchronization.

## 📖 Project Overview

This system perfectly combines "PC monitoring + mobile operation", ensuring you never miss your favorite Popmart products. The system automatically monitors new product releases, sends real-time WeChat push notifications, and supports one-click quick purchase on mobile devices.

### ✨ Core Features

- 🖥️ **24/7 PC Auto Monitoring** - Continuous monitoring of Popmart new product releases
- 📱 **Mobile Quick Purchase** - Purchase interface optimized for mobile devices
- 🔔 **Real-time Push Notifications** - WeChat push notifications for new product discoveries
- 🔄 **Cross-device Data Sync** - Real-time data sharing between PC and mobile
- 🚀 **Smart Redirect System** - Automatic device detection and optimal purchase channel redirection
- 🔐 **Multiple Login Options** - Support for WeChat QR code and simple account login

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PC Monitor    │    │   Node.js Server│    │  Mobile Interface│
│   Interface     │    │                 │    │                 │
│                 │    │                 │    │                 │
│ • Live Status    │◄──►│ • API Services   │◄──►│ • Quick Purchase │
│ • WeChat Login   │    │ • Data Management│    │ • Real-time View │
│ • Product History│    │ • Push Service   │    │ • Smart Redirect │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ WeChat Push Svc │
                    │                 │
                    │ • ServerChan API│
                    │ • Real-time Push│
                    └─────────────────┘
```

## 🚀 Quick Start

### 📋 Requirements

- **Node.js** 14.x or higher
- **npm** 6.x or higher
- **Modern Browser** (Chrome, Firefox, Safari, Edge)
- **Network** PC and mobile must be on the same LAN

### 💻 Installation

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/popmart-monitor.git
cd popmart-monitor
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables** (Optional)
```bash
# Copy environment variables example
cp environment_variables_example.txt .env

# Edit environment variables (for WeChat push and other features)
# SERVERCHAN_KEY=your_serverchan_key
# WECHAT_APP_ID=your_wechat_app_id
# WECHAT_APP_SECRET=your_wechat_app_secret
```

4. **Start Server**
```bash
npm start
# or
node server.js
```

5. **Access System**
- **PC Interface**: http://localhost:9999
- **Mobile Interface**: http://[your-ip]:9999/mobile.html
- **Test Page**: http://localhost:9999/test-flow.html

## 📱 Usage Flow

### 🎯 Standard Workflow

1. **PC Setup** (One-time configuration)
   ```
   Start Server → Open PC Interface → WeChat QR Login → Start Monitoring
   ```

2. **Mobile Usage** (Anytime)
   ```
   Connect Same WiFi → Open Mobile Interface → View Products → One-click Purchase
   ```

3. **Automated Workflow**
   ```
   PC Monitors → Discovers New Product → WeChat Push → Mobile Quick Purchase
   ```

### 🔧 Detailed Instructions

#### PC Operations

1. **Start Monitoring System**
   - Open browser and visit `http://localhost:9999`
   - Choose login method:
     - WeChat QR code login (Recommended)
     - Simple account login (Demo: admin/password123)

2. **Monitor Management**
   - View real-time monitoring status
   - Browse discovered product history
   - Manage monitoring settings

#### Mobile Operations

1. **Connect and Access**
   - Ensure mobile is on same WiFi as PC
   - Open browser and visit `http://[PC-IP]:9999/mobile.html`
   - No login required, use directly

2. **Quick Purchase**
   - View real-time product discoveries
   - Click "Buy Now" button
   - Auto-redirect to optimal payment channel

## 🌟 Feature Highlights

### 🖥️ PC Features

- ✅ **Real-time Monitor Panel** - Display monitoring status and statistics
- ✅ **WeChat QR Login** - Secure and convenient authentication
- ✅ **Product Discovery History** - Complete record of found products
- ✅ **System Settings** - Flexible configuration options

### 📱 Mobile Features

- ✅ **Responsive Design** - Perfect adaptation to all mobile devices
- ✅ **Touch-optimized UI** - Interaction experience designed for mobile
- ✅ **No Login Required** - Simplified usage flow
- ✅ **Real-time Data Sync** - Live sync with PC data

### 🔄 Smart Redirect System

- ✅ **Auto Device Detection** - Recognize PC, mobile, WeChat environment
- ✅ **Optimal Channel Selection** - Auto-select best purchase channel
- ✅ **Redirect Strategy Optimization** - Multiple fallback redirect options

## 📂 Project Structure

```
popmart-monitor/
├── server.js                 # Main server file
├── package.json              # Project dependencies
├── package-lock.json         # Version lock file
├── .gitignore                # Git ignore rules
├── README.md                 # Project documentation
├── environment_variables_example.txt  # Environment variables example
├── 使用说明.md               # Usage guide (Chinese)
├── start_server.bat          # Windows startup script
├── 
├── Frontend Files/
│   ├── index.html            # PC main interface
│   ├── mobile.html           # Mobile interface
│   ├── test-flow.html        # Feature test page
│   ├── script.js             # Main JavaScript logic
│   ├── styles.css            # Style files
│   └── payment.html          # Payment related page
├── 
├── Documentation/
│   ├── api_analysis.md       # API interface analysis
│   └── Requirement.md        # Requirements document
└── 
└── Configuration/
    └── tencent15827582190426339016.txt  # WeChat verification file
```

## ⚙️ Configuration

### 🔑 Environment Variables

Create `.env` file and configure the following variables:

```env
# Server Configuration
PORT=9999

# WeChat API Configuration (Optional)
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_REDIRECT_URI=http://localhost:9999/api/wx-login/callback

# Push Service Configuration (Optional)
SERVERCHAN_KEY=your_serverchan_key

# Popmart API Configuration (Optional)
POPMART_API_BASE_URL=https://api.popmart.com
POPMART_API_KEY=your_popmart_api_key

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

### 🔧 Server Configuration

- **Default Port**: 9999
- **Network Access**: 0.0.0.0 (Allow LAN access)
- **Rate Limiting**: 100 requests per 15 minutes
- **Log Level**: info in development, error in production

## 🧪 Feature Testing

### 📋 Test Page

Visit `http://localhost:9999/test-flow.html` for comprehensive feature testing:

1. **Device Detection Test** - Verify device type recognition
2. **Virtual Product Creation** - Test product discovery functionality
3. **Data Sync Test** - Verify cross-device data synchronization
4. **Purchase Flow Test** - Simulate complete purchase process
5. **Redirect Logic Test** - Verify smart redirect functionality

### 🎮 Demo Accounts

```
Username: admin    Password: password123
Username: user     Password: 123456
Username: demo     Password: demo
```

## 🛠️ Tech Stack

### Backend Technologies
- **Node.js** - Server runtime environment
- **Express.js** - Web application framework
- **JWT** - Authentication
- **Winston** - Log management
- **Axios** - HTTP client

### Frontend Technologies
- **Vanilla JavaScript** - Core logic
- **HTML5/CSS3** - Page structure and styling
- **Responsive Design** - Mobile adaptation
- **WebSocket** - Real-time communication

### Integrated Services
- **WeChat Open Platform** - Login and payment
- **ServerChan** - WeChat push notifications
- **QR Code Generation Service** - QR code generation

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Find process using the port
netstat -ano | findstr :9999
# Kill process
taskkill /f /PID [process_id]
```

2. **Mobile Cannot Access**
- Confirm PC and mobile are on same WiFi
- Check firewall settings
- Verify IP address is correct

3. **WeChat QR Code Fails**
- Check network connection
- Try simple login method
- Verify WeChat authentication configuration

4. **Push Notifications Not Working**
- Check ServerChan configuration
- Verify SERVERCHAN_KEY is correct
- Confirm network connection is stable

### 📝 Debug Mode

Enable verbose logging:
```bash
NODE_ENV=development node server.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## 📞 Support & Feedback

- **GitHub Issues**: [Submit Issues](https://github.com/yourusername/popmart-monitor/issues)
- **Feature Requests**: Welcome to submit new feature suggestions in Issues
- **Community**: Join discussions in the Discussions section

## ⚠️ Disclaimer

This project is for educational and research purposes only. Please comply with relevant platform terms of service and legal regulations. The author is not responsible for any consequences arising from the use of this software.

## 🔄 Changelog

### v1.0.0 (2024-06-12)
- ✨ Initial release
- ✅ PC monitoring functionality
- ✅ Mobile purchase interface
- ✅ WeChat login integration
- ✅ Cross-device data synchronization
- ✅ Smart redirect system
- ✅ Push notification service

---

⭐ If this project helps you, please give us a star!

📧 Contact: [992557645@qq.com]

