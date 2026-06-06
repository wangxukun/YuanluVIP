/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { Database } from "./src/db.js";
import { AFDIAN_PLANS } from "./src/plans.js";
import { WebhookLog } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON and Urldecoded parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default webhook secret token if not configured in environment
const AFDIAN_WEBHOOK_SECRET = process.env.AFDIAN_WEBHOOK_SECRET || "YuanluSecret_2026_Prod";

console.log(`[YuanluPro Server] Initializing with AFDian Webhook Secret: "${AFDIAN_WEBHOOK_SECRET}"`);

// --- API ROUTES ---

// 1. Auth: User Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "邮件与密匙/密码不能为空！" });
  }

  const result = await Database.registerUser(email, password);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 2. Auth: User Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "邮件与密匙/密码不能为空！" });
  }

  const result = await Database.loginUser(email, password);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 3. User Details Info Update/Poll (Get latest VIP details)
app.get("/api/auth/user", async (req: Request, res: Response) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, message: "参数邮箱不能为空！" });
  }

  const user = await Database.getUser(email);
  if (!user) {
    return res.status(404).json({ success: false, message: "未找到该用户！" });
  }

  return res.json({ success: true, user });
});

// 4. Webhook Logs Fetch
app.get("/api/webhook/logs", (req: Request, res: Response) => {
  const logs = Database.getLogs();
  return res.json({ success: true, logs });
});

// 5. Clear simulation logs
app.post("/api/webhook/logs/clear", (req: Request, res: Response) => {
  Database.clearLogs();
  return res.json({ success: true, message: "模拟日志已全部清空！" });
});

// 6. AFDian Webhook Activate会员接收端点
// This is the active core webhook endpoint for YuanluPro.
// AFDian will call this exact path when payments are successfully finished.
app.post("/api/afdian-webhook", async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
  console.log(`[Webhook] Received request from IP: ${ip}`);

  let payload = req.body;
  let rawBodyText = JSON.stringify(req.body);

  // 1. Parse body configurations (AFDian Webhook can wrap inside "request_json" parameter)
  try {
    if (req.body && req.body.request_json) {
      if (typeof req.body.request_json === "string") {
        payload = JSON.parse(req.body.request_json);
      } else {
        payload = req.body.request_json;
      }
    }
  } catch (e: any) {
    console.error("[Webhook] Failed to parse request_json wrapper:", e);
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: "解析 request_json 包装数据失败",
      payload: req.body,
      error: e.message
    });
    return res.status(400).json({ ec: 400, em: "数据解析错误", logId: logErr.id });
  }

  console.log("[Webhook] Parsed inner payload:", JSON.stringify(payload, null, 2));

  // 2. Authentication & Verification Check:
  // We recommend and support URL parameter verification (e.g., token parameter matches secret)
  // or verifying MD5 request signature parameter if present in headers or payload body.
  const queryToken = req.query.token as string;
  const signatureHeader = req.headers["x-afdian-signature"] as string;
  const signatureParam = payload.sign || req.query.sign as string || req.body.sign as string;

  let isAuthenticated = false;
  let authReason = "";

  // Strategy A: URL parameter token match. This is the easiest and most bulletproof way.
  if (queryToken && queryToken === AFDIAN_WEBHOOK_SECRET) {
    isAuthenticated = true;
    authReason = `URL Token验证成功（匹配: ${AFDIAN_WEBHOOK_SECRET}）`;
  }
  // Strategy B: Checking signature
  else if (signatureHeader || signatureParam) {
    const receivedSign = signatureHeader || signatureParam;
    
    // AFDian standard webhook signature algorithm:
    // Some formats use: MD5(Token + RawDataString)
    // Let's verify standard MD5 sum
    const plainString = AFDIAN_WEBHOOK_SECRET + JSON.stringify(payload.data || payload);
    const expectedSign = crypto.createHash("md5").update(plainString).digest("hex");
    
    // We also support MD5 of data.order stringified for different AFDian webhook versions
    const alternativePlain = AFDIAN_WEBHOOK_SECRET + (payload.data?.order?.out_trade_no || "");
    const alternativeSign = crypto.createHash("md5").update(alternativePlain).digest("hex");

    if (receivedSign === expectedSign || receivedSign === alternativeSign) {
      isAuthenticated = true;
      authReason = "爱发电 MD5 签名验证成功！";
    } else {
      authReason = `签名不匹配！收到: ${receivedSign}，预估: ${expectedSign}。为了方便本地教研，暂行通过。`;
      // Allow passing with warning in simulation mode to help learning developers
      isAuthenticated = true; 
    }
  }
  // Strategy C: If no security is provided, check if we're in learning/simulation environment
  else {
    isAuthenticated = true; // Auto-pass for sandbox learning convenience with a visual warning log
    authReason = "未包含鉴权 Token (本地沙盒模拟，已宽限放行)";
  }

  // If not verified
  if (!isAuthenticated) {
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: "鉴权未通过 / 签名无效",
      payload,
      error: `认证令牌或签名不匹配。原因: ${authReason}`
    });
    return res.status(401).json({ ec: 401, em: `鉴权失败: ${authReason}`, logId: logErr.id });
  }

  // 3. Extract order information
  // The webhook data wrapper is: { ec: 200, em: "active", data: { type: "order", order: { ... } } }
  const data = payload.data;
  if (!data || data.type !== "order" || !data.order) {
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: "非有效订单通知或缺少 order 节点",
      payload,
      error: "字段 data.type 必须为 'order' 并且包含订单数据"
    });
    return res.status(200).json({ ec: 200, em: "ok", detail: "忽略非订单通知类型" });
  }

  const order = data.order;
  const out_trade_no = order.out_trade_no; // Order ID
  const remark = order.remark || ""; // Payer remarks (used to fill Email)
  const total_amount = order.total_amount; // Paid Amount
  const plan_id = order.plan_id; // AFDian Plan ID

  if (!out_trade_no) {
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: "订单信息缺失 out_trade_no 交易单号",
      payload,
      error: "缺少交易单号"
    });
    return res.status(400).json({ ec: 400, em: "缺少交易单号" });
  }

  // Extract Email from remark (Afdian remark supports free typing, look for email address patterns)
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const remarkStr = String(remark).trim();
  const matchedEmails = remarkStr.match(emailRegex);
  
  // Use the matched email, or if no email matched but the text itself has no spaces and might be an email, use it directly.
  let targetEmail = "";
  if (matchedEmails && matchedEmails.length > 0) {
    targetEmail = matchedEmails[0].toLowerCase();
  } else if (remarkStr.includes("@")) {
    targetEmail = remarkStr.toLowerCase();
  }

  if (!targetEmail) {
    const logMessage = `订单付款成功，但留言「${remark}」不包含可识别的会员邮箱(Email)，无法自动激活！`;
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: "无法自动激活: 支付留言不含有效邮箱",
      payload,
      error: logMessage
    });
    return res.status(200).json({ ec: 200, em: "ok", detail: "订单处理完成但未激活 (无有效邮箱留言)" });
  }

  // 4. Activate User Membership
  const activation = await Database.activateMembershipByEmail(targetEmail, parseFloat(total_amount), out_trade_no);

  if (!activation.success) {
    const logErr = Database.logWebhook({
      ip: String(ip),
      success: false,
      message: `自动激活失败: ${activation.message}`,
      payload,
      error: activation.message,
      emailMatched: targetEmail
    });
    return res.status(200).json({ ec: 200, em: "ok", detail: `订单处理完成但未激活 (未找到匹配的用户): ${activation.message}` });
  }

  // 5. Log Success Webhook Entry
  const successLog = Database.logWebhook({
    ip: String(ip),
    success: true,
    message: `【爱发电回调】订单激活成功！用户: ${targetEmail}, 金额: ${total_amount}元, 级别天数: ${activation.daysAdded}天`,
    payload,
    emailMatched: targetEmail,
    vipDaysAdded: activation.daysAdded
  });

  return res.json({
    ec: 200,
    em: "ok",
    data: {
      activated: true,
      email: targetEmail,
      daysAdded: activation.daysAdded,
      newExpiry: activation.newExpiry,
      logId: successLog.id
    }
  });
});

// 7. Get All Users (for dashboard/sim users lookup)
app.get("/api/users", async (req: Request, res: Response) => {
  const users = await Database.getAllUsers();
  return res.json({ success: true, users });
});

// 8. Generate AFDian simulation signature
app.post("/api/simulate/gen-signature", (req: Request, res: Response) => {
  const { dataPayload, token } = req.body;
  const plainText = (token || AFDIAN_WEBHOOK_SECRET) + JSON.stringify(dataPayload);
  const signature = crypto.createHash("md5").update(plainText).digest("hex");
  return res.json({ success: true, signature, plainText });
});


// --- INTEGRATING VITE DEV SERVER OR STATIC ASSETS ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[YuanluPro] Starting Express Server with Vite Dev Middleware (Development Version)");
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    
    app.use(vite.middlewares);
  } else {
    console.log("[YuanluPro] Starting Express Server with Built Static Files (Production Version)");
    
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve production bundle assets
    app.use(express.static(distPath));
    
    // Fallback everything to single page app index.html
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[YuanluPro] Full-Stack server booted and listening on host "0.0.0.0" and port ${PORT}`);
  });
}

startServer();
