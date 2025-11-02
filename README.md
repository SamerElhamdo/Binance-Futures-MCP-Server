# Binance Futures MCP Server

![GitHub Repo stars](https://img.shields.io/github/stars/your-repo/binance-futures-mcp?style=social)
![npm](https://img.shields.io/npm/dt/binance-futures-mcp)

The Binance Futures MCP server provides comprehensive trading capabilities for Binance USDⓈ-M Futures through the Model Context Protocol. This server enables AI assistants like Claude to interact with Binance Futures API for trading operations.

## Features

- **New Order**: Create various types of orders (LIMIT, MARKET, STOP, TAKE_PROFIT, TRAILING_STOP_MARKET)
- **Query Order**: Check the status of specific orders
- **Cancel Order**: Cancel existing orders
- **Get Account**: View account balances, margin, and positions
- **Get Position**: Retrieve detailed position information
- **Get Open Orders**: List all current open orders
- **Cancel All Orders**: Cancel all open orders for a symbol

## Prerequisites

Before you begin, ensure you have:

- [Binance API credentials](https://www.binance.com/en/my/settings/api-management)
  - API Key with Futures trading enabled
  - Secret Key (keep this secure!)
  - Ensure your API key has futures trading permissions
- [Claude Desktop](https://claude.ai/download) or [Cursor](https://cursor.sh)
- [Node.js](https://nodejs.org/) (v20 or higher)
  - Verify installation: `node --version`

## Installation

### Running with NPX

```bash
npx -y binance-futures-mcp@latest
```

### Installing via Smithery

To install Binance Futures MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai):

```bash
npx -y @smithery/cli install @your-org/binance-futures-mcp --client claude
```

## Configuration

### Configuring Claude Desktop

#### For macOS:

```bash
# Create the config file if it doesn't exist
touch "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Opens the config file in TextEdit 
open -e "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Alternative method using Visual Studio Code (requires VS Code to be installed)
code "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```

#### For Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

#### Add the Binance Futures server configuration:

Replace `your-api-key-here` and `your-secret-key-here` with your actual Binance API credentials.

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

### Configuring VS Code

Add the following JSON block to your User Settings (JSON) file in VS Code. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS) and type `Preferences: Open User Settings (JSON)`.

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "binance_api_key",
        "description": "Binance API Key",
        "password": true
      },
      {
        "type": "promptString",
        "id": "binance_secret_key",
        "description": "Binance Secret Key",
        "password": true
      }
    ],
    "servers": {
      "binance-futures": {
        "command": "npx",
        "args": ["-y", "binance-futures-mcp@latest"],
        "env": {
          "BINANCE_API_KEY": "${input:binance_api_key}",
          "BINANCE_SECRET_KEY": "${input:binance_secret_key}"
        }
      }
    }
  }
}
```

### Configuring Cline

1. Open the Cline MCP settings file:

   #### For macOS:
   ```bash
   code ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

   #### For Windows:
   ```bash
   code %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
   ```

2. Add the Binance Futures server configuration:

   ```json
   {
     "mcpServers": {
       "binance-futures-mcp": {
         "command": "npx",
         "args": ["-y", "binance-futures-mcp@latest"],
         "env": {
           "BINANCE_API_KEY": "your-api-key-here",
           "BINANCE_SECRET_KEY": "your-secret-key-here"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

3. Save the file and restart Cline if it's already running.

## Available Tools

### 1. binance-futures-new-order

Create a new order on Binance USDⓈ-M Futures.

**Supported Order Types:**
- `LIMIT`: Limit order with specified price
- `MARKET`: Market order executed at current price
- `STOP`: Stop loss limit order
- `STOP_MARKET`: Stop loss market order
- `TAKE_PROFIT`: Take profit limit order
- `TAKE_PROFIT_MARKET`: Take profit market order
- `TRAILING_STOP_MARKET`: Trailing stop order

**Example Parameters:**
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

### 2. binance-futures-query-order

Query the status of a specific order.

**Parameters:**
- `symbol` (required): Trading pair (e.g., BTCUSDT)
- `orderId` (optional): Binance order ID
- `origClientOrderId` (optional): Your original client order ID

### 3. binance-futures-cancel-order

Cancel an existing order.

**Parameters:**
- `symbol` (required): Trading pair
- `orderId` (optional): Binance order ID
- `origClientOrderId` (optional): Your original client order ID

### 4. binance-futures-get-account

Get current account information including balances, margin, and positions.

**No parameters required.**

### 5. binance-futures-get-position

Get current position information.

**Parameters:**
- `symbol` (optional): Trading pair. If not provided, returns all positions.

### 6. binance-futures-get-open-orders

Get all current open orders.

**Parameters:**
- `symbol` (optional): Trading pair. If not provided, returns all open orders.

### 7. binance-futures-cancel-all-orders

Cancel all open orders for a specific symbol.

**Parameters:**
- `symbol` (required): Trading pair

## Security Considerations

⚠️ **IMPORTANT**: 
- Never share your API keys or secret keys
- Use read-only API keys for testing when possible
- Restrict API key permissions to only what's necessary
- Consider using IP whitelist restrictions on your Binance API keys
- Never commit API keys to version control

## Git Installation (Development)

1. Clone the repository:
```bash
git clone https://github.com/your-repo/binance-futures-mcp.git
cd binance-futures-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure environment variables:
```bash
export BINANCE_API_KEY="your-api-key"
export BINANCE_SECRET_KEY="your-secret-key"
```

5. Run the server:
```bash
node build/index.js
```

## Usage Examples

Once configured, you can use the MCP server with Claude or other MCP clients:

- "Check my Binance Futures account balance"
- "Create a limit buy order for 0.01 BTCUSDT at $50,000"
- "Show me all my open positions"
- "Cancel all open orders for BTCUSDT"
- "What's the status of order ID 12345?"

## API Documentation

This MCP server uses the [Binance USDⓈ-M Futures API](https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api).

Key endpoints:
- `POST /fapi/v1/order` - New order
- `GET /fapi/v1/order` - Query order
- `DELETE /fapi/v1/order` - Cancel order
- `GET /fapi/v2/account` - Account information
- `GET /fapi/v2/positionRisk` - Position information
- `GET /fapi/v1/openOrders` - Open orders
- `DELETE /fapi/v1/allOpenOrders` - Cancel all orders

## Error Handling

The server provides detailed error messages from Binance API. Common errors:
- Invalid API key or secret
- Insufficient balance
- Order would immediately trigger (TRAILING_STOP_MARKET)
- Invalid symbol or parameters

## License

MIT

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) for the MCP specification
- [Anthropic](https://anthropic.com) for Claude Desktop
- [Binance](https://binance.com) for the Futures API
