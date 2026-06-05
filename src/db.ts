/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, VipLevel, AfdianPlan, WebhookLog } from "./types.js";
import { AFDIAN_PLANS } from "./plans.js";

// Database storage file path
const DB_FILE = path.join(process.cwd(), "db.json");

interface DbSchema {
  users: Record<string, any>; // email -> hashed password, vip, etc.
  logs: WebhookLog[];
}

const DEFAULT_DB: DbSchema = {
  users: {},
  logs: []
};

// Help load database synchronously
function loadDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load local DB, resetting to default:", error);
    return DEFAULT_DB;
  }
}

// Save database safely 
function saveDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to DB_FILE:", error);
  }
}

// Simple salt for SHA-256
const PASSWORD_SALT = "YuanluPro_Afdian_Salt_Header_Secret_2026!";

export function hashPassword(plainText: string): string {
  return crypto
    .createHash("sha256")
    .update(plainText + PASSWORD_SALT)
    .digest("hex");
}

export const Database = {
  // 1. User methods
  registerUser(email: string, plainPassword: string): { success: boolean; message: string; user?: User } {
    const db = loadDb();
    const formattedEmail = email.trim().toLowerCase();

    if (!formattedEmail) {
      return { success: false, message: "邮箱不能为空！" };
    }

    if (db.users[formattedEmail]) {
      return { success: false, message: "该邮箱已被注册！" };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: formattedEmail,
      createdAt: new Date().toISOString(),
      vipLevel: VipLevel.NONE,
      vipExpiry: null
    };

    db.users[formattedEmail] = {
      ...newUser,
      passwordHash: hashPassword(plainPassword)
    };

    saveDb(db);
    return { success: true, message: "注册成功！", user: newUser };
  },

  loginUser(email: string, plainPassword: string): { success: boolean; message: string; user?: User } {
    const db = loadDb();
    const formattedEmail = email.trim().toLowerCase();

    const matched = db.users[formattedEmail];
    if (!matched) {
      return { success: false, message: "邮箱或密码错误，请核对后再试！" };
    }

    if (matched.passwordHash !== hashPassword(plainPassword)) {
      return { success: false, message: "邮箱或密码错误，请核对后再试！" };
    }

    const returnedUser: User = {
      id: matched.id,
      email: matched.email,
      createdAt: matched.createdAt,
      vipLevel: matched.vipLevel,
      vipExpiry: matched.vipExpiry,
      lastAfdianOrder: matched.lastAfdianOrder
    };

    return { success: true, message: "登录成功！", user: returnedUser };
  },

  getUser(email: string): User | null {
    const db = loadDb();
    const formattedEmail = email.trim().toLowerCase();
    const matched = db.users[formattedEmail];
    if (!matched) return null;

    return {
      id: matched.id,
      email: matched.email,
      createdAt: matched.createdAt,
      vipLevel: matched.vipLevel,
      vipExpiry: matched.vipExpiry,
      lastAfdianOrder: matched.lastAfdianOrder
    };
  },

  getAllUsers(): User[] {
    const db = loadDb();
    return Object.values(db.users).map(u => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      vipLevel: u.vipLevel,
      vipExpiry: u.vipExpiry,
      lastAfdianOrder: u.lastAfdianOrder
    }));
  },

  // 2. Member/Subscription Activation methods
  activateMembershipByEmail(
    email: string,
    priceAmount: number,
    orderId: string
  ): { success: boolean; message: string; daysAdded: number; newExpiry: string | null } {
    const db = loadDb();
    const formattedEmail = email.trim().toLowerCase();
    const matched = db.users[formattedEmail];

    if (!matched) {
      return { success: false, message: `用户邮箱 ${email} 在系统中未找到！`, daysAdded: 0, newExpiry: null };
    }

    // Determine plan days based on payment amount
    // Let's match the membership levels:
    // 5元 -> 7天 (Weekly)
    // 18元 -> 30天 (Monthly)
    // 48元 -> 90天 (Quarterly)
    // 168元 -> 365天 (Yearly)
    let daysAdded = 0;
    let targetLevel = VipLevel.NONE;

    // Use floating parsing to prevent matching issues like "5.00" vs 5
    const amt = parseFloat(priceAmount.toString());

    if (Math.abs(amt - 5) < 0.1) {
      daysAdded = 7;
      targetLevel = VipLevel.WEEKLY;
    } else if (Math.abs(amt - 18) < 0.1) {
      daysAdded = 30;
      targetLevel = VipLevel.MONTHLY;
    } else if (Math.abs(amt - 48) < 0.1) {
      daysAdded = 90;
      targetLevel = VipLevel.QUARTERLY;
    } else if (Math.abs(amt - 168) < 0.1) {
      daysAdded = 365;
      targetLevel = VipLevel.YEARLY;
    } else {
      // Fallback matching if they customized payment slightly (e.g. general sponsor)
      if (amt >= 168) {
        daysAdded = Math.floor(amt * (365 / 168));
        targetLevel = VipLevel.YEARLY;
      } else if (amt >= 48) {
        daysAdded = Math.floor(amt * (90 / 48));
        targetLevel = VipLevel.QUARTERLY;
      } else if (amt >= 18) {
        daysAdded = Math.floor(amt * (30 / 18));
        targetLevel = VipLevel.MONTHLY;
      } else if (amt >= 5) {
        daysAdded = Math.floor(amt * (7 / 5));
        targetLevel = VipLevel.WEEKLY;
      } else {
        daysAdded = Math.floor(amt * 1); // 1元1天 fallback
        targetLevel = VipLevel.WEEKLY;
      }
    }

    // Calculate expiry logic
    let currentExpiryTimestamp = Date.now();
    if (matched.vipExpiry) {
      const existing = Date.parse(matched.vipExpiry);
      if (existing > Date.now()) {
        currentExpiryTimestamp = existing; // If membership not expired, append duration!
      }
    }

    const updatedExpiryMs = currentExpiryTimestamp + daysAdded * 24 * 60 * 60 * 1000;
    const newExpiryIso = new Date(updatedExpiryMs).toISOString();

    // Update user structure
    matched.vipLevel = targetLevel;
    matched.vipExpiry = newExpiryIso;
    matched.lastAfdianOrder = orderId;

    if (!matched.afdianHistory) {
      matched.afdianHistory = [];
    }
    matched.afdianHistory.push({
      orderId,
      amount: priceAmount,
      daysAdded,
      activatedAt: new Date().toISOString()
    });

    db.users[formattedEmail] = matched;
    saveDb(db);

    return {
      success: true,
      message: `成功激活用户 ${formattedEmail} 的 ${daysAdded} 天 VIP 权益。`,
      daysAdded,
      newExpiry: newExpiryIso
    };
  },

  // 3. Webhook execution logs tracker
  logWebhook(log: Omit<WebhookLog, "id" | "timestamp">): WebhookLog {
    const db = loadDb();
    const newLog: WebhookLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };

    db.logs.unshift(newLog); // push file front
    if (db.logs.length > 50) {
      db.logs = db.logs.slice(0, 50); // limit 50 logs for space
    }

    saveDb(db);
    return newLog;
  },

  getLogs(): WebhookLog[] {
    const db = loadDb();
    return db.logs;
  },

  clearLogs() {
    const db = loadDb();
    db.logs = [];
    saveDb(db);
  },

  resetDatabase() {
    saveDb(DEFAULT_DB);
  }
};
