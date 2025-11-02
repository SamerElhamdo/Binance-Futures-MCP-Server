#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {CallToolRequestSchema, ListToolsRequestSchema, Tool} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as crypto from 'crypto';

dotenv.config();

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;

if (!API_KEY || !SECRET_KEY) {
  throw new Error("BINANCE_API_KEY and BINANCE_SECRET_KEY environment variables are required");
}

const BASE_URL = 'https://fapi.binance.com';

interface BinanceOrderResponse {
  clientOrderId: string;
  cumQty: string;
  cumQuote: string;
  executedQty: string;
  orderId: number;
  avgPrice: string;
  origQty: string;
  price: string;
  reduceOnly: boolean;
  side: string;
  positionSide: string;
  status: string;
  stopPrice?: string;
  closePosition?: boolean;
  symbol: string;
  timeInForce?: string;
  type: string;
  origType: string;
  activatePrice?: string;
  priceRate?: string;
  updateTime: number;
  workingType?: string;
  priceProtect?: boolean;
  priceMatch?: string;
  selfTradePreventionMode?: string;
  goodTillDate?: number;
}

interface BinanceAccountResponse {
  assets: Array<{
    asset: string;
    walletBalance: string;
    unrealizedProfit: string;
    marginBalance: string;
    maintMargin: string;
    initialMargin: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    maxWithdrawAmount: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    availableBalance: string;
    marginAvailable: boolean;
    updateTime: number;
  }>;
  positions: Array<{
    symbol: string;
    initialMargin: string;
    maintMargin: string;
    unrealizedProfit: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    leverage: string;
    isolated: boolean;
    entryPrice: string;
    maxNotional: string;
    positionSide: string;
    positionAmt: string;
    updateTime: number;
  }>;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
}

interface BinancePositionResponse {
  symbol: string;
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  maxNotional: string;
  positionSide: string;
  positionAmt: string;
  notional: string;
  updateTime: number;
}

class BinanceFuturesClient {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "binance-futures-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'X-MBX-APIKEY': API_KEY!
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private signRequest(params: Record<string, any>): string {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', SECRET_KEY!)
      .update(queryString)
      .digest('hex');
  }

  private async makeSignedRequest(method: string, endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now();
    const queryParams: Record<string, any> = {};
    
    // Copy all params except undefined values
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams[key] = params[key];
      }
    });
    
    queryParams.timestamp = timestamp;

    const signature = this.signRequest(queryParams);
    queryParams.signature = signature;

    try {
      if (method === 'GET' || method === 'DELETE') {
        const queryString = new URLSearchParams(
          Object.entries(queryParams).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        const response = await this.axiosInstance.request({
          method: method as any,
          url: `${endpoint}?${queryString}`
        });
        return response.data;
      } else {
        // POST requests: Binance expects form data
        const formData = new URLSearchParams(
          Object.entries(queryParams).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString();
        
        const response = await this.axiosInstance.post(endpoint, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return response.data;
      }
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`Binance API error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "binance-futures-new-order",
          description: "Create a new order on Binance USDⓈ-M Futures. Supports all order types: LIMIT, MARKET, STOP, STOP_MARKET, TAKE_PROFIT, TAKE_PROFIT_MARKET, TRAILING_STOP_MARKET. Essential for executing trades on futures markets.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              side: {
                type: "string",
                enum: ["BUY", "SELL"],
                description: "Order side: BUY or SELL"
              },
              type: {
                type: "string",
                enum: ["LIMIT", "MARKET", "STOP", "STOP_MARKET", "TAKE_PROFIT", "TAKE_PROFIT_MARKET", "TRAILING_STOP_MARKET"],
                description: "Order type"
              },
              positionSide: {
                type: "string",
                enum: ["LONG", "SHORT", "BOTH"],
                description: "Position side. Default BOTH for One-way Mode; LONG or SHORT for Hedge Mode"
              },
              timeInForce: {
                type: "string",
                enum: ["GTC", "IOC", "FOK", "GTD"],
                description: "Time in force. Required for LIMIT orders"
              },
              quantity: {
                type: "number",
                description: "Order quantity. Cannot be sent with closePosition=true"
              },
              price: {
                type: "number",
                description: "Order price. Required for LIMIT, STOP, TAKE_PROFIT orders"
              },
              reduceOnly: {
                type: "string",
                enum: ["true", "false"],
                description: "Reduce only order. Default false. Cannot be sent in Hedge Mode or with closePosition=true"
              },
              newClientOrderId: {
                type: "string",
                description: "A unique id among open orders. Automatically generated if not sent"
              },
              stopPrice: {
                type: "number",
                description: "Used with STOP/STOP_MARKET or TAKE_PROFIT/TAKE_PROFIT_MARKET orders"
              },
              closePosition: {
                type: "string",
                enum: ["true", "false"],
                description: "Close-All, used with STOP_MARKET or TAKE_PROFIT_MARKET"
              },
              activationPrice: {
                type: "number",
                description: "Used with TRAILING_STOP_MARKET orders, default as the latest price"
              },
              callbackRate: {
                type: "number",
                description: "Used with TRAILING_STOP_MARKET orders, min 0.1, max 10 where 1 for 1%"
              },
              workingType: {
                type: "string",
                enum: ["MARK_PRICE", "CONTRACT_PRICE"],
                description: "stopPrice triggered by: MARK_PRICE or CONTRACT_PRICE. Default CONTRACT_PRICE"
              },
              priceProtect: {
                type: "string",
                enum: ["TRUE", "FALSE"],
                description: "Price protection. Default FALSE"
              },
              newOrderRespType: {
                type: "string",
                enum: ["ACK", "RESULT"],
                description: "Response type. ACK or RESULT, default ACK"
              }
            },
            required: ["symbol", "side", "type"]
          }
        },
        {
          name: "binance-futures-query-order",
          description: "Query the status of a specific order on Binance USDⓈ-M Futures. Use this to check if an order was filled, pending, or cancelled.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              orderId: {
                type: "number",
                description: "Order ID from Binance"
              },
              origClientOrderId: {
                type: "string",
                description: "Original client order ID"
              }
            },
            required: ["symbol"]
          }
        },
        {
          name: "binance-futures-cancel-order",
          description: "Cancel an existing order on Binance USDⓈ-M Futures. Use this to cancel pending orders that haven't been executed yet.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              orderId: {
                type: "number",
                description: "Order ID from Binance"
              },
              origClientOrderId: {
                type: "string",
                description: "Original client order ID"
              }
            },
            required: ["symbol"]
          }
        },
        {
          name: "binance-futures-get-account",
          description: "Get current account information including balances, margin, and positions for Binance USDⓈ-M Futures. Essential for risk management and portfolio tracking.",
          inputSchema: {
            type: "object",
            properties: {}
          },
          required: []
        },
        {
          name: "binance-futures-get-position",
          description: "Get current position information for Binance USDⓈ-M Futures. Returns details about open positions including entry price, size, PnL, and margin used.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT). If not provided, returns all positions"
              }
            }
          },
          required: []
        },
        {
          name: "binance-futures-get-open-orders",
          description: "Get all current open orders for Binance USDⓈ-M Futures. Useful for monitoring pending orders and managing active trades.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT). If not provided, returns all open orders"
              }
            }
          },
          required: []
        },
        {
          name: "binance-futures-cancel-all-orders",
          description: "Cancel all open orders for a specific symbol on Binance USDⓈ-M Futures. Use with caution as this will cancel all pending orders.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              }
            },
            required: ["symbol"]
          }
        }
      ];
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      try {
        const args = request.params.arguments ?? {};
        let response: any;

        switch (request.params.name) {
          case "binance-futures-new-order":
            response = await this.newOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "binance-futures-query-order":
            response = await this.queryOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "binance-futures-cancel-order":
            response = await this.cancelOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "binance-futures-get-account":
            response = await this.getAccount();
            return {
              content: [{
                type: "text",
                text: formatAccountResponse(response)
              }]
            };

          case "binance-futures-get-position":
            response = await this.getPosition(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatPositionResponse(response)
              }]
            };

          case "binance-futures-get-open-orders":
            response = await this.getOpenOrders(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatOrdersResponse(response)
              }]
            };

          case "binance-futures-cancel-all-orders":
            response = await this.cancelAllOrders(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatOrdersResponse(response)
              }]
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Binance API error: ${error.message}`
          }],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Binance Futures MCP server running on stdio");
  }

  async newOrder(params: any): Promise<BinanceOrderResponse> {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
    };

    if (params.positionSide) orderParams.positionSide = params.positionSide;
    if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
    if (params.quantity !== undefined) orderParams.quantity = params.quantity;
    if (params.price !== undefined) orderParams.price = params.price;
    if (params.reduceOnly) orderParams.reduceOnly = params.reduceOnly;
    if (params.newClientOrderId) orderParams.newClientOrderId = params.newClientOrderId;
    if (params.stopPrice !== undefined) orderParams.stopPrice = params.stopPrice;
    if (params.closePosition) orderParams.closePosition = params.closePosition;
    if (params.activationPrice !== undefined) orderParams.activationPrice = params.activationPrice;
    if (params.callbackRate !== undefined) orderParams.callbackRate = params.callbackRate;
    if (params.workingType) orderParams.workingType = params.workingType;
    if (params.priceProtect) orderParams.priceProtect = params.priceProtect;
    if (params.newOrderRespType) orderParams.newOrderRespType = params.newOrderRespType;

    return await this.makeSignedRequest('POST', '/fapi/v1/order', orderParams);
  }

  async queryOrder(params: any): Promise<BinanceOrderResponse> {
    const queryParams: Record<string, any> = {
      symbol: params.symbol,
    };

    if (params.orderId !== undefined) queryParams.orderId = params.orderId;
    if (params.origClientOrderId) queryParams.origClientOrderId = params.origClientOrderId;

    return await this.makeSignedRequest('GET', '/fapi/v1/order', queryParams);
  }

  async cancelOrder(params: any): Promise<BinanceOrderResponse> {
    const cancelParams: Record<string, any> = {
      symbol: params.symbol,
    };

    if (params.orderId !== undefined) cancelParams.orderId = params.orderId;
    if (params.origClientOrderId) cancelParams.origClientOrderId = params.origClientOrderId;

    return await this.makeSignedRequest('DELETE', '/fapi/v1/order', cancelParams);
  }

  async getAccount(): Promise<BinanceAccountResponse> {
    return await this.makeSignedRequest('GET', '/fapi/v2/account');
  }

  async getPosition(symbol?: string): Promise<BinancePositionResponse | BinancePositionResponse[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    return await this.makeSignedRequest('GET', '/fapi/v2/positionRisk', params);
  }

  async getOpenOrders(symbol?: string): Promise<BinanceOrderResponse[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    return await this.makeSignedRequest('GET', '/fapi/v1/openOrders', params);
  }

  async cancelAllOrders(symbol: string): Promise<any> {
    return await this.makeSignedRequest('DELETE', '/fapi/v1/allOpenOrders', { symbol });
  }
}

function formatOrderResponse(order: BinanceOrderResponse): string {
  const output: string[] = [];
  
  output.push(`Order Information:`);
  output.push(`Symbol: ${order.symbol}`);
  output.push(`Order ID: ${order.orderId}`);
  output.push(`Client Order ID: ${order.clientOrderId}`);
  output.push(`Side: ${order.side}`);
  output.push(`Type: ${order.type}`);
  output.push(`Status: ${order.status}`);
  output.push(`Position Side: ${order.positionSide}`);
  
  if (order.price) output.push(`Price: ${order.price}`);
  if (order.origQty) output.push(`Original Quantity: ${order.origQty}`);
  if (order.executedQty) output.push(`Executed Quantity: ${order.executedQty}`);
  if (order.avgPrice) output.push(`Average Price: ${order.avgPrice}`);
  if (order.stopPrice) output.push(`Stop Price: ${order.stopPrice}`);
  if (order.timeInForce) output.push(`Time In Force: ${order.timeInForce}`);
  if (order.workingType) output.push(`Working Type: ${order.workingType}`);
  if (order.reduceOnly !== undefined) output.push(`Reduce Only: ${order.reduceOnly}`);
  if (order.activatePrice) output.push(`Activation Price: ${order.activatePrice}`);
  if (order.priceRate) output.push(`Price Rate: ${order.priceRate}`);
  if (order.updateTime) output.push(`Update Time: ${new Date(order.updateTime).toISOString()}`);
  
  return output.join('\n');
}

function formatAccountResponse(account: BinanceAccountResponse): string {
  const output: string[] = [];
  
  output.push(`Account Information:`);
  output.push(`Total Wallet Balance: ${account.totalWalletBalance}`);
  output.push(`Total Unrealized Profit: ${account.totalUnrealizedProfit}`);
  output.push(`Total Margin Balance: ${account.totalMarginBalance}`);
  output.push(`Available Balance: ${account.availableBalance}`);
  output.push(`Max Withdraw Amount: ${account.maxWithdrawAmount}`);
  
  if (account.assets && account.assets.length > 0) {
    output.push(`\nAssets:`);
    account.assets.forEach(asset => {
      output.push(`\n${asset.asset}:`);
      output.push(`  Wallet Balance: ${asset.walletBalance}`);
      output.push(`  Available Balance: ${asset.availableBalance}`);
      output.push(`  Unrealized Profit: ${asset.unrealizedProfit}`);
    });
  }
  
  if (account.positions && account.positions.length > 0) {
    output.push(`\nPositions:`);
    account.positions.forEach(position => {
      if (parseFloat(position.positionAmt) !== 0) {
        output.push(`\n${position.symbol}:`);
        output.push(`  Position Amount: ${position.positionAmt}`);
        output.push(`  Entry Price: ${position.entryPrice}`);
        output.push(`  Leverage: ${position.leverage}x`);
        output.push(`  Unrealized Profit: ${position.unrealizedProfit}`);
        output.push(`  Position Side: ${position.positionSide}`);
      }
    });
  }
  
  return output.join('\n');
}

function formatPositionResponse(positions: BinancePositionResponse | BinancePositionResponse[]): string {
  const output: string[] = [];
  const posArray = Array.isArray(positions) ? positions : [positions];
  
  output.push(`Position Information:`);
  
  posArray.forEach(position => {
    if (parseFloat(position.positionAmt) !== 0) {
      output.push(`\n${position.symbol}:`);
      output.push(`  Position Amount: ${position.positionAmt}`);
      output.push(`  Entry Price: ${position.entryPrice}`);
      output.push(`  Leverage: ${position.leverage}x`);
      output.push(`  Unrealized Profit: ${position.unrealizedProfit}`);
      output.push(`  Position Side: ${position.positionSide}`);
      output.push(`  Maintenance Margin: ${position.maintMargin}`);
      output.push(`  Initial Margin: ${position.initialMargin}`);
      output.push(`  Notional: ${position.notional}`);
      output.push(`  Isolated: ${position.isolated}`);
      output.push(`  Update Time: ${new Date(position.updateTime).toISOString()}`);
    }
  });
  
  if (posArray.every(p => parseFloat(p.positionAmt) === 0)) {
    output.push(`\nNo open positions`);
  }
  
  return output.join('\n');
}

function formatOrdersResponse(orders: BinanceOrderResponse | BinanceOrderResponse[]): string {
  const output: string[] = [];
  const ordersArray = Array.isArray(orders) ? orders : [orders];
  
  if (ordersArray.length === 0) {
    return "No orders found";
  }
  
  output.push(`Orders (${ordersArray.length}):`);
  
  ordersArray.forEach((order, index) => {
    output.push(`\n[${index + 1}] ${order.symbol} - ${order.side} ${order.type}`);
    output.push(`  Order ID: ${order.orderId}`);
    output.push(`  Status: ${order.status}`);
    output.push(`  Quantity: ${order.origQty}`);
    if (order.price) output.push(`  Price: ${order.price}`);
    if (order.stopPrice) output.push(`  Stop Price: ${order.stopPrice}`);
    output.push(`  Executed: ${order.executedQty}`);
  });
  
  return output.join('\n');
}

function listTools(): void {
  const tools = [
    {
      name: "binance-futures-new-order",
      description: "Create a new order on Binance USDⓈ-M Futures"
    },
    {
      name: "binance-futures-query-order",
      description: "Query the status of a specific order"
    },
    {
      name: "binance-futures-cancel-order",
      description: "Cancel an existing order"
    },
    {
      name: "binance-futures-get-account",
      description: "Get current account information"
    },
    {
      name: "binance-futures-get-position",
      description: "Get current position information"
    },
    {
      name: "binance-futures-get-open-orders",
      description: "Get all current open orders"
    },
    {
      name: "binance-futures-cancel-all-orders",
      description: "Cancel all open orders for a symbol"
    }
  ];

  console.log("Available tools:");
  tools.forEach(tool => {
    console.log(`\n- ${tool.name}`);
    console.log(`  Description: ${tool.description}`);
  });
  process.exit(0);
}

interface Arguments {
  'list-tools': boolean;
  _: (string | number)[];
  $0: string;
}

const argv = yargs(hideBin(process.argv))
  .option('list-tools', {
    type: 'boolean',
    description: 'List all available tools and exit',
    default: false
  })
  .help()
  .parse() as Arguments;

if (argv['list-tools']) {
  listTools();
}

const server = new BinanceFuturesClient();
server.run().catch(console.error);
