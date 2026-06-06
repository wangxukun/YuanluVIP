/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum VipLevel {
  NONE = 0,
  WEEKLY = 1,     // 7 days - 5元
  MONTHLY = 2,    // 30 days - 18元
  QUARTERLY = 3,  // 90 days - 48元
  YEARLY = 4,     // 365 days - 168元
}

export interface AfdianPlan {
  level: VipLevel;
  name: string;
  price: number;
  days: number;
  months: number;       // months parameter for afdian URL (0 = one-time)
  desc: string;
  planKey: string;      // tier key for plan ID lookup ("WEEKLY", "MONTHLY", etc.)
  features: string[];
}

export interface User {
  userid: string;
  email: string;
  createdAt: string;
  role: string;
  vipLevel: VipLevel;
  vipExpiry: string | null;  // ISO Date string or null if not subscriber
  lastAfdianOrder?: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  ip: string;
  success: boolean;
  message: string;
  payload: any;
  error?: string;
  emailMatched?: string;
  vipDaysAdded?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
