/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { User, VipLevel, WebhookLog } from "./types.js";

// JSON file for webhook logs only (Prisma schema has no webhook log model)
const DB_FILE = path.join(process.cwd(), "db.json");

interface LogDbSchema {
  logs: WebhookLog[];
}

const DEFAULT_LOG_DB: LogDbSchema = {
  logs: []
};

function loadLogDb(): LogDbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_LOG_DB, null, 2), "utf-8");
      return DEFAULT_LOG_DB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LOG_DB;
  }
}

function saveLogDb(data: LogDbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write log DB:", error);
  }
}

function vipLevelToSubscriptionType(level: VipLevel): string {
  switch (level) {
    case VipLevel.WEEKLY: return "WEEKLY";
    case VipLevel.MONTHLY: return "MONTHLY";
    case VipLevel.QUARTERLY: return "QUARTERLY";
    case VipLevel.YEARLY: return "YEARLY";
    default: return "NONE";
  }
}

function subscriptionTypeToVipLevel(type: string): VipLevel {
  switch (type) {
    case "WEEKLY": return VipLevel.WEEKLY;
    case "MONTHLY": return VipLevel.MONTHLY;
    case "QUARTERLY": return VipLevel.QUARTERLY;
    case "YEARLY": return VipLevel.YEARLY;
    default: return VipLevel.NONE;
  }
}

async function getUserVipInfo(userid: string): Promise<{ vipLevel: VipLevel; vipExpiry: string | null }> {
  const activeSub = await prisma.subscriptions.findFirst({
    where: {
      userid,
      endDate: { gt: new Date() }
    },
    orderBy: { endDate: "desc" }
  });

  if (activeSub) {
    return {
      vipLevel: subscriptionTypeToVipLevel(activeSub.subscriptionType),
      vipExpiry: activeSub.endDate?.toISOString() ?? null
    };
  }

  return { vipLevel: VipLevel.NONE, vipExpiry: null };
}

export const Database = {
  // 1. User methods
  async registerUser(email: string, plainPassword: string): Promise<{ success: boolean; message: string; user?: User }> {
    const formattedEmail = email.trim().toLowerCase();

    if (!formattedEmail) {
      return { success: false, message: "邮箱不能为空！" };
    }

    const existing = await prisma.user.findUnique({ where: { email: formattedEmail } });
    if (existing) {
      return { success: false, message: "该邮箱已被注册！" };
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const newUser = await prisma.user.create({
      data: {
        email: formattedEmail,
        password: hashedPassword,
      }
    });

    return {
      success: true,
      message: "注册成功！",
      user: {
        userid: newUser.userid,
        email: newUser.email,
        createdAt: newUser.createAt.toISOString(),
        role: newUser.role || "USER",
        vipLevel: VipLevel.NONE,
        vipExpiry: null
      }
    };
  },

  async loginUser(email: string, plainPassword: string): Promise<{ success: boolean; message: string; user?: User }> {
    const formattedEmail = email.trim().toLowerCase();

    const matched = await prisma.user.findUnique({ where: { email: formattedEmail } });
    if (!matched) {
      return { success: false, message: "邮箱或密码错误，请核对后再试！" };
    }

    const passwordValid = await bcrypt.compare(plainPassword, matched.password);
    if (!passwordValid) {
      return { success: false, message: "邮箱或密码错误，请核对后再试！" };
    }

    const { vipLevel, vipExpiry } = await getUserVipInfo(matched.userid);

    let currentRole = matched.role || "USER";
    if (currentRole === "PREMIUM" && vipLevel === VipLevel.NONE) {
      await prisma.user.update({
        where: { userid: matched.userid },
        data: { role: "USER" }
      });
      currentRole = "USER";
    }

    return {
      success: true,
      message: "登录成功！",
      user: {
        userid: matched.userid,
        email: matched.email,
        createdAt: matched.createAt.toISOString(),
        role: currentRole,
        vipLevel,
        vipExpiry
      }
    };
  },

  async getUser(email: string): Promise<User | null> {
    const formattedEmail = email.trim().toLowerCase();
    const matched = await prisma.user.findUnique({ where: { email: formattedEmail } });
    if (!matched) return null;

    const { vipLevel, vipExpiry } = await getUserVipInfo(matched.userid);

    let currentRole = matched.role || "USER";
    if (currentRole === "PREMIUM" && vipLevel === VipLevel.NONE) {
      await prisma.user.update({
        where: { userid: matched.userid },
        data: { role: "USER" }
      });
      currentRole = "USER";
    }

    return {
      userid: matched.userid,
      email: matched.email,
      createdAt: matched.createAt.toISOString(),
      role: currentRole,
      vipLevel,
      vipExpiry
    };
  },

  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          where: { endDate: { gt: new Date() } },
          orderBy: { endDate: "desc" },
          take: 1
        }
      }
    });

    return users.map(u => {
      const activeSub = u.subscriptions[0];
      return {
        userid: u.userid,
        email: u.email,
        createdAt: u.createAt.toISOString(),
        role: u.role || "USER",
        vipLevel: activeSub ? subscriptionTypeToVipLevel(activeSub.subscriptionType) : VipLevel.NONE,
        vipExpiry: activeSub?.endDate?.toISOString() ?? null
      };
    });
  },

  // 2. Member/Subscription Activation methods
  async activateMembershipByEmail(
    email: string,
    priceAmount: number,
    orderId: string
  ): Promise<{ success: boolean; message: string; daysAdded: number; newExpiry: string | null }> {
    const formattedEmail = email.trim().toLowerCase();
    const matched = await prisma.user.findUnique({ where: { email: formattedEmail } });

    if (!matched) {
      return { success: false, message: `用户邮箱 ${email} 在系统中未找到！`, daysAdded: 0, newExpiry: null };
    }

    // Determine plan days based on payment amount
    let daysAdded = 0;
    let targetLevel = VipLevel.NONE;
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
        daysAdded = Math.floor(amt * 1);
        targetLevel = VipLevel.WEEKLY;
      }
    }

    // Calculate expiry: extend from current active subscription endDate if exists
    let currentExpiryTimestamp = Date.now();
    const activeSub = await prisma.subscriptions.findFirst({
      where: {
        userid: matched.userid,
        endDate: { gt: new Date() }
      },
      orderBy: { endDate: "desc" }
    });

    if (activeSub?.endDate) {
      const existing = activeSub.endDate.getTime();
      if (existing > Date.now()) {
        currentExpiryTimestamp = existing;
      }
    }

    const updatedExpiryMs = currentExpiryTimestamp + daysAdded * 24 * 60 * 60 * 1000;
    const newExpiryDate = new Date(updatedExpiryMs);

    // Create subscription record and update user role to PREMIUM
    await prisma.$transaction([
      prisma.subscriptions.create({
        data: {
          userid: matched.userid,
          subscriptionType: vipLevelToSubscriptionType(targetLevel),
          startDate: new Date(),
          endDate: newExpiryDate
        }
      }),
      prisma.user.update({
        where: { userid: matched.userid },
        data: { role: "PREMIUM" }
      })
    ]);

    return {
      success: true,
      message: `成功激活用户 ${formattedEmail} 的 ${daysAdded} 天 VIP 权益。`,
      daysAdded,
      newExpiry: newExpiryDate.toISOString()
    };
  },

  // 3. Webhook execution logs tracker (still JSON-file based)
  logWebhook(log: Omit<WebhookLog, "id" | "timestamp">): WebhookLog {
    const db = loadLogDb();
    const newLog: WebhookLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };

    db.logs.unshift(newLog);
    if (db.logs.length > 50) {
      db.logs = db.logs.slice(0, 50);
    }

    saveLogDb(db);
    return newLog;
  },

  getLogs(): WebhookLog[] {
    const db = loadLogDb();
    return db.logs;
  },

  clearLogs() {
    const db = loadLogDb();
    db.logs = [];
    saveLogDb(db);
  }
};
