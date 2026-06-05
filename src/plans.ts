/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VipLevel, AfdianPlan } from "./types.js";

export const AFDIAN_PLANS: AfdianPlan[] = [
  {
    level: VipLevel.WEEKLY,
    name: "周度会员",
    price: 5,
    days: 7,
    desc: "7天高级会员权益，低门槛体验所有专业功能",
    afdianPlanId: "plan_weekly_5",
    features: ["7天无限次使用", "高并发极速处理", "尊贵周度会员标识", "全平台无广告体验"]
  },
  {
    level: VipLevel.MONTHLY,
    name: "月度会员",
    price: 18,
    days: 30,
    desc: "30天高级会员权益，适合中短期高强度需求",
    afdianPlanId: "plan_monthly_18",
    features: ["30天高速特权", "优先享用全新功能", "尊贵月度专属标识", "专属1对1客服解答"]
  },
  {
    level: VipLevel.QUARTERLY,
    name: "季度会员",
    price: 48,
    days: 90,
    desc: "90天高级会员权益，季付更划算，效率倍增",
    afdianPlanId: "plan_quarter_48",
    features: ["90天全套权益", "专享开发者测试包", "尊贵季度专属标识", "独立大容量存储空间"]
  },
  {
    level: VipLevel.YEARLY,
    name: "年度会员",
    price: 168,
    days: 365,
    desc: "365天终极会员权益，超值优待，一年无忧",
    afdianPlanId: "plan_yearly_168",
    features: ["365天至尊全权", "专享社区开发者特供", "至尊年度金色标识", "所有高级服务终生优惠"]
  }
];
