<div align="center">

# 🚀 Binance Futures MCP Server

**Powerful Model Context Protocol server for Binance USDⓈ-M Futures trading**

[![npm version](https://img.shields.io/npm/v/binance-futures-mcp?style=flat-square)](https://www.npmjs.com/package/binance-futures-mcp)
[![npm downloads](https://img.shields.io/npm/dt/binance-futures-mcp?style=flat-square)](https://www.npmjs.com/package/binance-futures-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

![Binance Futures Trading](https://via.placeholder.com/800x300/0B1426/FFFFFF?text=Binance+Futures+MCP+Server)
*Connect AI assistants like Claude to Binance Futures trading seamlessly*

[Features](#-features) • [Installation](#-installation) • [Tools](#-available-tools) • [Configuration](#-configuration) • [Documentation](#-documentation)

---

**Developed by [Samer Elhamdo](https://github.com/SamerElhamdo)**

---

</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Available Tools](#-available-tools)
- [Usage Examples](#-usage-examples)
- [Security](#-security-considerations)
- [Development](#-development)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

The **Binance Futures MCP Server** is a comprehensive Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Binance USDⓈ-M Futures API. With 14 powerful trading tools, you can manage your futures trading portfolio directly through conversational AI.

### Key Highlights

- ✨ **14 Trading Tools** - Complete futures trading functionality
- 🔒 **Secure** - HMAC SHA256 signature authentication
- 🚀 **Fast** - Optimized API calls with proper error handling
- 📊 **Comprehensive** - Order management, position tracking, and account monitoring
- 🎨 **Easy to Use** - Simple configuration and intuitive tool names

## ✨ Features

### Core Trading Operations
- 📝 **Order Management**: Create, modify, query, and cancel orders
- 💼 **Account Management**: View balances, margins, and positions
- 📈 **Position Control**: Monitor and manage open positions
- ⚙️ **Risk Management**: Adjust leverage, margin types, and position modes

### Advanced Capabilities
- 🔄 **Order Modification**: Update orders without canceling
- 📊 **Trade History**: View complete trading history
- 🎛️ **Settings Management**: Change leverage, position mode, and margin type
- 📋 **Comprehensive Queries**: Get all orders, open orders, and account details

## 📦 Prerequisites

Before you begin, ensure you have:

| Requirement | Description | Link |
|------------|-------------|------|
| **Binance API Keys** | API Key with Futures trading enabled | [Get API Keys](https://www.binance.com/en/my/settings/api-management) |
| **Claude Desktop** | For desktop AI assistant | [Download Claude](https://claude.ai/download) |
| **Cursor** | Alternative AI-powered IDE | [Download Cursor](https://cursor.sh) |
| **Node.js** | Version 20 or higher | [Download Node.js](https://nodejs.org/) |

### API Key Setup Checklist

- [ ] Create Binance API key
- [ ] Enable Futures trading permissions
- [ ] Copy API Key and Secret Key
- [ ] (Optional) Set IP whitelist restrictions
- [ ] (Recommended) Use read-only keys for testing

## 🚀 Installation

### Quick Start (NPX)

```bash
npx -y binance-futures-mcp@latest
```

### Install via NPM

```bash
npm install -g binance-futures-mcp
```

### Install via Smithery

```bash
npx -y @smithery/cli install @smithery/binance-futures-mcp --client claude
```

## ⚙️ Configuration

### Claude Desktop Configuration

<details>
<summary><b>macOS Instructions</b></summary>

```bash
# Create config file
touch "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Open in editor
open -e "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
# OR using VS Code
code "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```
</details>

<details>
<summary><b>Windows Instructions</b></summary>

```bash
# Open config file in VS Code
code %APPDATA%\Claude\claude_desktop_config.json
```
</details>

### Configuration JSON

Add this configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "binance-futures-mcp": {
      "command": "npx",
      "args": ["-y", "binance-futures-mcp@latest"],
      "env": {
        "BINANCE_API_KEY": "your-api-key-here",
        "BINANCE_SECRET_KEY": "your-secret-key-here"
      }
    }
  }
}
```

### Cline Configuration

```bash
# macOS
code ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json

# Windows
code %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

Then add the same configuration as above.

## 🛠️ Available Tools

### 📊 Complete Tools Table

| Tool Name | Category | Description | Method |
|-----------|----------|-------------|--------|
| **new-order** | Orders | Create new orders (LIMIT, MARKET, STOP, etc.) | `POST` |
| **query-order** | Orders | Query status of a specific order | `GET` |
| **modify-order** | Orders | Modify existing order (price/quantity) | `PUT` |
| **cancel-order** | Orders | Cancel a specific order | `DELETE` |
| **cancel-all-orders** | Orders | Cancel all orders for a symbol | `DELETE` |
| **get-open-orders** | Orders | Get all current open orders | `GET` |
| **get-all-orders** | Orders | Get order history (all statuses) | `GET` |
| **get-account** | Account | Get account info, balances, positions | `GET` |
| **get-position** | Positions | Get position details | `GET` |
| **get-trade-history** | Trading | Get executed trade history | `GET` |
| **change-leverage** | Settings | Change leverage for a symbol | `POST` |
| **change-position-mode** | Settings | Switch One-way/Hedge mode | `POST` |
| **change-margin-type** | Settings | Switch Isolated/Cross margin | `POST` |
| **modify-position-margin** | Positions | Adjust isolated position margin | `POST` |

### 📝 Detailed Tool Descriptions

<details>
<summary><b>Order Management Tools</b></summary>

#### 1. **new-order**
Create new orders with various types and options.

**Order Types:**
- `LIMIT` - Limit order with specified price
- `MARKET` - Market order at current price
- `STOP` - Stop loss limit order
- `STOP_MARKET` - Stop loss market order
- `TAKE_PROFIT` - Take profit limit order
- `TAKE_PROFIT_MARKET` - Take profit market order
- `TRAILING_STOP_MARKET` - Trailing stop order

**Example:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 0.01,
  "price": 50000,
  "timeInForce": "GTC"
}
```

#### 2. **query-order**
Check the status of a specific order.

**Parameters:**
- `symbol` (required)
- `orderId` (optional)
- `origClientOrderId` (optional)

#### 3. **modify-order**
Modify an existing order without canceling it.

**Parameters:**
- `symbol` (required)
- `side` (required) - BUY or SELL
- `orderId` or `origClientOrderId` (required)
- `quantity` (optional) - New quantity
- `price` (optional) - New price

#### 4. **cancel-order**
Cancel a specific pending order.

**Parameters:**
- `symbol` (required)
- `orderId` or `origClientOrderId` (optional)

#### 5. **cancel-all-orders**
Cancel all open orders for a specific symbol.

**Parameters:**
- `symbol` (required)
</details>

<details>
<summary><b>Account & Position Tools</b></summary>

#### 6. **get-account**
Get comprehensive account information including balances, margins, and positions.

**No parameters required.**

#### 7. **get-position**
Get detailed position information.

**Parameters:**
- `symbol` (optional) - If not provided, returns all positions

#### 8. **get-open-orders**
List all current open orders.

**Parameters:**
- `symbol` (optional) - If not provided, returns all open orders

#### 9. **get-all-orders**
Get complete order history (filled, canceled, pending).

**Parameters:**
- `symbol` (required)
- `orderId` (optional) - Returns orders >= orderId
- `startTime` (optional) - Start time in milliseconds
- `endTime` (optional) - End time in milliseconds
- `limit` (optional) - Number of orders (default: 500, max: 1000)

#### 10. **get-trade-history**
Get executed trade history with detailed information.

**Parameters:**
- `symbol` (required)
- `startTime` (optional)
- `endTime` (optional)
- `fromId` (optional) - Trade ID to start from
- `limit` (optional) - Number of trades (default: 500, max: 1000)
</details>

<details>
<summary><b>Settings & Risk Management Tools</b></summary>

#### 11. **change-leverage**
Change the leverage for a specific symbol.

**Parameters:**
- `symbol` (required)
- `leverage` (required) - Leverage level (1-125, depends on symbol)

**Example:**
```json
{
  "symbol": "BTCUSDT",
  "leverage": 10
}
```

#### 12. **change-position-mode**
Switch between One-way Mode and Hedge Mode.

**Parameters:**
- `dualSidePosition` (required) - `"true"` for Hedge Mode, `"false"` for One-way Mode

**Note:** Hedge Mode allows holding both LONG and SHORT positions simultaneously.

#### 13. **change-margin-type**
Switch between Cross Margin and Isolated Margin.

**Parameters:**
- `symbol` (required)
- `marginType` (required) - `"ISOLATED"` or `"CROSSED"`

**Note:** Isolated margin limits risk to the specific position.

#### 14. **modify-position-margin**
Add or reduce margin for isolated positions.

**Parameters:**
- `symbol` (required)
- `amount` (required) - Amount to add (positive) or reduce (negative)
- `type` (required) - `1` to add margin, `2` to reduce margin

**Example:**
```json
{
  "symbol": "BTCUSDT",
  "amount": 100,
  "type": 1
}
```
</details>

## 💡 Usage Examples

Once configured, you can interact with Binance Futures through Claude:

### Conversational Commands

```
"Check my Binance Futures account balance"
"Create a limit buy order for 0.01 BTCUSDT at $50,000"
"Show me all my open positions"
"Cancel all open orders for BTCUSDT"
"What's the status of order ID 12345?"
"Change leverage for BTCUSDT to 10x"
"Get my trade history for the last 24 hours"
"Modify order 12345 to new price $51,000"
```

### Example Workflows

1. **Create and Monitor Order:**
   - Create a LIMIT order
   - Query order status
   - Modify if needed
   - Monitor execution

2. **Risk Management:**
   - Check account balance
   - View open positions
   - Adjust leverage
   - Modify margin if needed

3. **Position Analysis:**
   - Get all positions
   - View trade history
   - Analyze PnL

## 🔒 Security Considerations

<div align="center">

⚠️ **IMPORTANT SECURITY GUIDELINES** ⚠️

</div>

### Best Practices

| Security Measure | Description | Priority |
|----------------|-------------|----------|
| **Never Share Keys** | Keep API keys private and secure | 🔴 Critical |
| **Read-Only Testing** | Use read-only keys for testing | 🟡 High |
| **Restrict Permissions** | Enable only necessary permissions | 🟡 High |
| **IP Whitelist** | Restrict API access by IP address | 🟢 Recommended |
| **No Version Control** | Never commit keys to git | 🔴 Critical |
| **Environment Variables** | Use environment variables only | 🟡 High |
| **Regular Rotation** | Rotate API keys periodically | 🟢 Recommended |

### Security Checklist

- [ ] API keys stored in environment variables only
- [ ] Secret key never exposed in logs or errors
- [ ] Read-only keys used for testing
- [ ] IP whitelist configured (if available)
- [ ] API key permissions minimized
- [ ] `.env` file in `.gitignore`
- [ ] Keys not committed to version control

## 💻 Development

### Installation from Source

```bash
# Clone repository
git clone https://github.com/SamerElhamdo/Binance-Futures-MCP-Server.git
cd Binance-Futures-MCP-Server

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

### Project Structure

```
Binance-Futures-MCP-Server/
├── src/
│   └── index.ts          # Main server implementation
├── build/
│   └── index.js          # Compiled JavaScript
├── package.json           # Project configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | List all available tools |
| `npm run watch` | Watch mode for development |
| `npm run inspector` | Run MCP inspector |

### Environment Variables

Create a `.env` file in the project root:

```env
BINANCE_API_KEY=your-api-key-here
BINANCE_SECRET_KEY=your-secret-key-here
```

## 📚 API Documentation

This MCP server uses the official [Binance USDⓈ-M Futures API](https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api).

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fapi/v1/order` | `POST` | Create new order |
| `/fapi/v1/order` | `PUT` | Modify order |
| `/fapi/v1/order` | `GET` | Query order |
| `/fapi/v1/order` | `DELETE` | Cancel order |
| `/fapi/v1/allOpenOrders` | `DELETE` | Cancel all orders |
| `/fapi/v1/openOrders` | `GET` | Get open orders |
| `/fapi/v1/allOrders` | `GET` | Get all orders |
| `/fapi/v1/userTrades` | `GET` | Get trade history |
| `/fapi/v2/account` | `GET` | Get account info |
| `/fapi/v2/positionRisk` | `GET` | Get position risk |
| `/fapi/v1/leverage` | `POST` | Change leverage |
| `/fapi/v1/positionSide/dual` | `POST` | Change position mode |
| `/fapi/v1/marginType` | `POST` | Change margin type |
| `/fapi/v1/positionMargin` | `POST` | Modify position margin |

### Error Handling

The server provides detailed error messages from Binance API:

| Error Code | Description | Solution |
|------------|-------------|----------|
| `-1022` | Invalid signature | Check API keys and timestamp |
| `-1117` | Invalid side | Ensure side is BUY or SELL |
| `-1102` | Missing parameter | Check required parameters |
| `-2010` | Insufficient balance | Ensure sufficient account balance |
| `-4131` | Invalid order | Check order parameters |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) - For the MCP specification
- [Anthropic](https://anthropic.com) - For Claude Desktop
- [Binance](https://binance.com) - For the Futures API
- All contributors and users of this project

---

<div align="center">

**⭐ If you find this project useful, please consider giving it a star! ⭐**

Made with ❤️ by [Samer Elhamdo](https://github.com/SamerElhamdo)

[Report Bug](https://github.com/SamerElhamdo/Binance-Futures-MCP-Server/issues) • [Request Feature](https://github.com/SamerElhamdo/Binance-Futures-MCP-Server/issues) • [npm Package](https://www.npmjs.com/package/binance-futures-mcp)

</div>