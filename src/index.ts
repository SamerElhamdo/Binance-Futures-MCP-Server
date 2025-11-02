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
      .map(key => {
        const value = params[key];
        // Convert all values to strings for consistent signature generation
        // Handle null/undefined explicitly
        if (value === null || value === undefined) {
          return `${key}=`;
        }
        // Convert to string - this handles numbers, booleans, etc.
        return `${key}=${String(value)}`;
      })
      .join('&');
    
    return crypto
      .createHmac('sha256', SECRET_KEY!)
      .update(queryString)
      .digest('hex');
  }

  private async makeSignedRequest(method: string, endpoint: string, params: Record<string, any> = {}, useStrictSigning: boolean = false): Promise<any> {
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
        let queryString: string;
        
        if (useStrictSigning) {
          // Build query string with same sorting as signRequest to ensure consistency
          // Used for query-order and cancel-order which have issues with URLSearchParams
          const sortedKeys = Object.keys(queryParams).sort();
          const queryPairs = sortedKeys.map(key => {
            const value = queryParams[key];
            const stringValue = value !== null && value !== undefined ? String(value) : '';
            // URL encode key and value for the actual request
            return `${encodeURIComponent(key)}=${encodeURIComponent(stringValue)}`;
          });
          queryString = queryPairs.join('&');
        } else {
          // Use URLSearchParams for other endpoints (get-account, get-open-orders, etc.)
          // These were working fine before
          queryString = new URLSearchParams(
            Object.entries(queryParams).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          ).toString();
        }
        
        const response = await this.axiosInstance.request({
          method: method as any,
          url: `${endpoint}?${queryString}`
        });
        return response.data;
      } else if (method === 'POST' || method === 'PUT') {
        // POST/PUT requests: Binance expects form data
        // Build form data with same sorting as signRequest to ensure consistency
        const sortedKeys = Object.keys(queryParams).sort();
        const formDataPairs = sortedKeys.map(key => {
          const value = queryParams[key];
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          // URL encode key and value for form data
          return `${encodeURIComponent(key)}=${encodeURIComponent(stringValue)}`;
        });
        const formData = formDataPairs.join('&');
        
        const response = await this.axiosInstance.request({
          method: method as any,
          url: endpoint,
          data: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return response.data;
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
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
          name: "new-order",
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
          name: "query-order",
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
          name: "cancel-order",
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
          name: "get-account",
          description: "Get current account information including balances, margin, and positions for Binance USDⓈ-M Futures. Essential for risk management and portfolio tracking.",
          inputSchema: {
            type: "object",
            properties: {}
          },
          required: []
        },
        {
          name: "get-position",
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
          name: "get-open-orders",
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
          name: "cancel-all-orders",
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
        },
        {
          name: "modify-order",
          description: "Modify an existing order on Binance USDⓈ-M Futures. Useful for updating price or quantity of pending orders without canceling and recreating them.",
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
                description: "Order side: BUY or SELL (required)"
              },
              orderId: {
                type: "number",
                description: "Order ID from Binance"
              },
              origClientOrderId: {
                type: "string",
                description: "Original client order ID"
              },
              quantity: {
                type: "number",
                description: "New quantity (optional)"
              },
              price: {
                type: "number",
                description: "New price (optional)"
              }
            },
            required: ["symbol", "side"]
          }
        },
        {
          name: "change-leverage",
          description: "Change the initial leverage of a symbol for Binance USDⓈ-M Futures. Critical for risk management and position sizing.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              leverage: {
                type: "number",
                description: "Target leverage level (1-125, depends on symbol)"
              }
            },
            required: ["symbol", "leverage"]
          }
        },
        {
          name: "change-position-mode",
          description: "Change position mode between One-way Mode and Hedge Mode for Binance USDⓈ-M Futures. Hedge Mode allows holding both LONG and SHORT positions simultaneously.",
          inputSchema: {
            type: "object",
            properties: {
              dualSidePosition: {
                type: "string",
                enum: ["true", "false"],
                description: "true for Hedge Mode, false for One-way Mode"
              }
            },
            required: ["dualSidePosition"]
          }
        },
        {
          name: "change-margin-type",
          description: "Change margin type between Cross and Isolated for a symbol on Binance USDⓈ-M Futures. Isolated margin limits risk to the specific position.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              marginType: {
                type: "string",
                enum: ["ISOLATED", "CROSSED"],
                description: "ISOLATED for isolated margin, CROSSED for cross margin"
              }
            },
            required: ["symbol", "marginType"]
          }
        },
        {
          name: "modify-position-margin",
          description: "Modify isolated position margin for Binance USDⓈ-M Futures. Add or reduce margin to adjust position risk and prevent liquidation.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              amount: {
                type: "number",
                description: "Amount to add or reduce (positive to add, negative to reduce)"
              },
              type: {
                type: "number",
                description: "Type: 1=Add margin, 2=Reduce margin"
              }
            },
            required: ["symbol", "amount", "type"]
          }
        },
        {
          name: "get-all-orders",
          description: "Get all orders (open, filled, cancelled) for a symbol on Binance USDⓈ-M Futures. Useful for order history and auditing.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              orderId: {
                type: "number",
                description: "If provided, returns orders >= orderId"
              },
              startTime: {
                type: "number",
                description: "Start time in milliseconds (optional)"
              },
              endTime: {
                type: "number",
                description: "End time in milliseconds (optional)"
              },
              limit: {
                type: "number",
                description: "Number of orders to return (default: 500, max: 1000)"
              }
            },
            required: ["symbol"]
          }
        },
        {
          name: "get-trade-history",
          description: "Get account trade list (executed trades) for Binance USDⓈ-M Futures. Returns detailed information about filled orders including price, quantity, and fees.",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Trading pair symbol (e.g., BTCUSDT, ETHUSDT)"
              },
              startTime: {
                type: "number",
                description: "Start time in milliseconds (optional)"
              },
              endTime: {
                type: "number",
                description: "End time in milliseconds (optional)"
              },
              fromId: {
                type: "number",
                description: "Trade ID to fetch from (optional)"
              },
              limit: {
                type: "number",
                description: "Number of trades to return (default: 500, max: 1000)"
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
          case "new-order":
            response = await this.newOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "query-order":
            response = await this.queryOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "cancel-order":
            response = await this.cancelOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "get-account":
            response = await this.getAccount();
            return {
              content: [{
                type: "text",
                text: formatAccountResponse(response)
              }]
            };

          case "get-position":
            response = await this.getPosition(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatPositionResponse(response)
              }]
            };

          case "get-open-orders":
            response = await this.getOpenOrders(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatOrdersResponse(response)
              }]
            };

          case "cancel-all-orders":
            response = await this.cancelAllOrders(args.symbol);
            return {
              content: [{
                type: "text",
                text: formatOrdersResponse(response)
              }]
            };

          case "modify-order":
            response = await this.modifyOrder(args);
            return {
              content: [{
                type: "text",
                text: formatOrderResponse(response)
              }]
            };

          case "change-leverage":
            response = await this.changeLeverage(args);
            return {
              content: [{
                type: "text",
                text: formatLeverageResponse(response)
              }]
            };

          case "change-position-mode":
            response = await this.changePositionMode(args);
            return {
              content: [{
                type: "text",
                text: formatPositionModeResponse(response)
              }]
            };

          case "change-margin-type":
            response = await this.changeMarginType(args);
            return {
              content: [{
                type: "text",
                text: formatMarginTypeResponse(response)
              }]
            };

          case "modify-position-margin":
            response = await this.modifyPositionMargin(args);
            return {
              content: [{
                type: "text",
                text: formatPositionMarginResponse(response)
              }]
            };

          case "get-all-orders":
            response = await this.getAllOrders(args);
            return {
              content: [{
                type: "text",
                text: formatOrdersResponse(response)
              }]
            };

          case "get-trade-history":
            response = await this.getTradeHistory(args);
            return {
              content: [{
                type: "text",
                text: formatTradeHistoryResponse(response)
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

    // timeInForce is mandatory for LIMIT orders
    if (params.type === 'LIMIT') {
      orderParams.timeInForce = params.timeInForce || 'GTC';
    } else if (params.timeInForce) {
      orderParams.timeInForce = params.timeInForce;
    }

    if (params.positionSide) orderParams.positionSide = params.positionSide;
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

    // Use strict signing for query-order to fix signature issues
    return await this.makeSignedRequest('GET', '/fapi/v1/order', queryParams, true);
  }

  async cancelOrder(params: any): Promise<BinanceOrderResponse> {
    const cancelParams: Record<string, any> = {
      symbol: params.symbol,
    };

    if (params.orderId !== undefined) cancelParams.orderId = params.orderId;
    if (params.origClientOrderId) cancelParams.origClientOrderId = params.origClientOrderId;

    // Use strict signing for cancel-order to fix signature issues
    return await this.makeSignedRequest('DELETE', '/fapi/v1/order', cancelParams, true);
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

  async modifyOrder(params: any): Promise<BinanceOrderResponse> {
    const modifyParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side, // Required by Binance API
    };

    // Either orderId or origClientOrderId must be provided
    if (params.orderId !== undefined) {
      modifyParams.orderId = params.orderId;
    } else if (params.origClientOrderId) {
      modifyParams.origClientOrderId = params.origClientOrderId;
    } else {
      throw new Error("Either orderId or origClientOrderId must be provided");
    }

    if (params.quantity !== undefined) modifyParams.quantity = params.quantity;
    if (params.price !== undefined) modifyParams.price = params.price;

    // PUT request for modify order
    return await this.makeSignedRequest('PUT', '/fapi/v1/order', modifyParams);
  }

  async changeLeverage(params: any): Promise<any> {
    const leverageParams: Record<string, any> = {
      symbol: params.symbol,
      leverage: params.leverage,
    };

    return await this.makeSignedRequest('POST', '/fapi/v1/leverage', leverageParams);
  }

  async changePositionMode(params: any): Promise<any> {
    const modeParams: Record<string, any> = {
      dualSidePosition: params.dualSidePosition,
    };

    return await this.makeSignedRequest('POST', '/fapi/v1/positionSide/dual', modeParams);
  }

  async changeMarginType(params: any): Promise<any> {
    const marginParams: Record<string, any> = {
      symbol: params.symbol,
      marginType: params.marginType,
    };

    return await this.makeSignedRequest('POST', '/fapi/v1/marginType', marginParams);
  }

  async modifyPositionMargin(params: any): Promise<any> {
    const marginParams: Record<string, any> = {
      symbol: params.symbol,
      amount: params.amount,
      type: params.type,
    };

    return await this.makeSignedRequest('POST', '/fapi/v1/positionMargin', marginParams);
  }

  async getAllOrders(params: any): Promise<BinanceOrderResponse[]> {
    const queryParams: Record<string, any> = {
      symbol: params.symbol,
    };

    if (params.orderId !== undefined) queryParams.orderId = params.orderId;
    if (params.startTime !== undefined) queryParams.startTime = params.startTime;
    if (params.endTime !== undefined) queryParams.endTime = params.endTime;
    if (params.limit !== undefined) queryParams.limit = params.limit;

    return await this.makeSignedRequest('GET', '/fapi/v1/allOrders', queryParams);
  }

  async getTradeHistory(params: any): Promise<any[]> {
    const queryParams: Record<string, any> = {
      symbol: params.symbol,
    };

    if (params.startTime !== undefined) queryParams.startTime = params.startTime;
    if (params.endTime !== undefined) queryParams.endTime = params.endTime;
    if (params.fromId !== undefined) queryParams.fromId = params.fromId;
    if (params.limit !== undefined) queryParams.limit = params.limit;

    return await this.makeSignedRequest('GET', '/fapi/v1/userTrades', queryParams);
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

function formatLeverageResponse(response: any): string {
  return `Leverage changed successfully:\nSymbol: ${response.symbol}\nLeverage: ${response.leverage}x\nMax Notional Value: ${response.maxNotionalValue}`;
}

function formatPositionModeResponse(response: any): string {
  return `Position mode changed successfully.\nDual Side Position: ${response.dualSidePosition}`;
}

function formatMarginTypeResponse(response: any): string {
  return `Margin type changed successfully.\nSymbol: ${response.symbol}\nMargin Type: ${response.marginType}`;
}

function formatPositionMarginResponse(response: any): string {
  return `Position margin modified successfully.\nAmount: ${response.amount}\nCode: ${response.code}\nMessage: ${response.msg || 'Success'}`;
}

function formatTradeHistoryResponse(trades: any[]): string {
  if (trades.length === 0) {
    return "No trades found";
  }

  const output: string[] = [];
  output.push(`Trade History (${trades.length} trades):`);

  trades.forEach((trade, index) => {
    output.push(`\n[${index + 1}] Trade ID: ${trade.id}`);
    output.push(`  Symbol: ${trade.symbol}`);
    output.push(`  Side: ${trade.side}`);
    output.push(`  Price: ${trade.price}`);
    output.push(`  Quantity: ${trade.qty}`);
    output.push(`  Quote Quantity: ${trade.quoteQty}`);
    output.push(`  Realized PnL: ${trade.realizedPnl || 'N/A'}`);
    output.push(`  Fee: ${trade.commission}`);
    output.push(`  Time: ${new Date(trade.time).toISOString()}`);
  });

  return output.join('\n');
}

function listTools(): void {
  const tools = [
    {
      name: "new-order",
      description: "Create a new order on Binance USDⓈ-M Futures"
    },
    {
      name: "query-order",
      description: "Query the status of a specific order"
    },
    {
      name: "cancel-order",
      description: "Cancel an existing order"
    },
    {
      name: "modify-order",
      description: "Modify an existing order"
    },
    {
      name: "get-account",
      description: "Get current account information"
    },
    {
      name: "get-position",
      description: "Get current position information"
    },
    {
      name: "get-open-orders",
      description: "Get all current open orders"
    },
    {
      name: "get-all-orders",
      description: "Get all orders (history)"
    },
    {
      name: "get-trade-history",
      description: "Get trade history"
    },
    {
      name: "cancel-all-orders",
      description: "Cancel all open orders for a symbol"
    },
    {
      name: "change-leverage",
      description: "Change leverage for a symbol"
    },
    {
      name: "change-position-mode",
      description: "Change position mode (One-way/Hedge)"
    },
    {
      name: "change-margin-type",
      description: "Change margin type (Isolated/Cross)"
    },
    {
      name: "modify-position-margin",
      description: "Modify isolated position margin"
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
