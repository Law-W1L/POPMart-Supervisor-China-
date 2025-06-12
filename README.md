# Popmart Product Monitor

This is a web application that helps users monitor Popmart's new product releases and automate the purchase process.

## Features
- Real-time monitoring of new Popmart products
- Automatic form filling for quick purchase
- Direct navigation to payment page
- User-friendly interface

## Setup
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   # Method 1: Using a local server (recommended)
   npx http-server
   # Then open http://localhost:8080 in your browser

   # Method 2: Direct file opening
   # Simply double-click index.html or drag it into your browser
   ```

## Usage
1. When you first open the application, you'll see a QR code for WeChat login to Popmart's official mall
2. Enter your Popmart account information in the settings section:
   - Username
   - Password
3. Configure email notifications (optional):
   - Enter your email address
   - Enable/disable email notifications
4. Set up product monitoring preferences:
   - Click "Start Monitoring" to begin
   - Use "Stop Monitoring" to pause
5. Configure notification settings:
   - Enable/disable browser notifications
   - Enable/disable auto-purchase feature
6. The application will automatically notify you when new products are available
7. Click the purchase button to automatically fill in your information and proceed to payment

## Requirements
- Modern web browser (Chrome, Firefox, Edge recommended)
- Internet connection
- Popmart account
- Node.js and npm (for running with local server) 