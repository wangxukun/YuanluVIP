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
  desc: string;
  afdianPlanId: string; // The corresponding plan_id on Afdian
  features: string[];
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
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
