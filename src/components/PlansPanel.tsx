/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ClipboardCopy, Send, ArrowUpRight, HelpCircle, UserCheck, AlertTriangle } from "lucide-react";
import { AFDIAN_PLANS } from "../plans.js";
import { VipLevel, User } from "../types.js";
import { buildAfdianPaymentUrl, getAfdianPlanId, buildRemark } from "../lib/afdian.js";

interface PlansPanelProps {
  currentUser: User | null;
  onNavigateToAuth: () => void;
}

export function PlansPanel({ currentUser, onNavigateToAuth }: PlansPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: VipLevel) => {
    switch (level) {
      case VipLevel.WEEKLY:
        return { text: "7 DAYS", color: "bg-slate-100 text-slate-500" };
      case VipLevel.MONTHLY:
        return { text: "30 DAYS", color: "bg-orange-200 text-orange-700 font-bold" };
      case VipLevel.QUARTERLY:
        return { text: "90 DAYS", color: "bg-slate-100 text-slate-500" };
      case VipLevel.YEARLY:
        return { text: "365 DAYS", color: "bg-slate-100 text-slate-500" };
      default:
        return { text: "FREE", color: "bg-slate-100 text-slate-500" };
    }
  };

  return (
    <div id="plans-grid-root" className="space-y-10">
      {/* Email copy banner for logged-in user */}
      {currentUser ? (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-800">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs bg-orange-65 bg-orange-600/30 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              当前已登录用户身份
            </span>
            <h4 className="text-lg font-bold font-sans">充值激活邮箱：<span className="text-yellow-400 font-mono underline">{currentUser.email}</span></h4>
            <p className="text-xs text-slate-400">通过 <span className="text-orange-400 font-bold italic">爱发电</span> 无缝激活您的 <span className="text-orange-400 font-bold italic"> 远路播客 </span> 会员资格。选择合适您的方案后，系统将自动在爱发电支付留言中预填您的邮箱，实现秒级自动激活！</p>
          </div>
          <button
            onClick={handleCopyEmail}
            className="flex-shrink-0 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow cursor-pointer"
          >
            <ClipboardCopy className="w-4 h-4 text-slate-700" />
            {copied ? "已复制到剪贴板！" : "复制当前激活邮箱"}
          </button>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-orange-950 space-y-1">
            <h4 className="font-bold text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-orange-600" />
              未检测到用户登录信息
            </h4>
            <p className="text-xs text-orange-900/85">目前您还是游客状态。在爱发电充值时必须填写您注册在远路播客站点的对应邮箱，否则无法进行自动匹配激活。</p>
          </div>
          <button
            onClick={onNavigateToAuth}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl h-fit transition active:scale-95 shadow cursor-pointer"
          >
            立即登录/注册账号
          </button>
        </div>
      )}

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AFDIAN_PLANS.map((plan) => {
          const badge = getLevelBadge(plan.level);
          const isMonthly = plan.level === VipLevel.MONTHLY;
          const planId = getAfdianPlanId(plan.planKey);
          const remark = currentUser ? buildRemark(currentUser.email) : "";
          const paymentUrl = planId && currentUser
            ? buildAfdianPaymentUrl({ planId, months: plan.months, remark })
            : null;

          return (
            <div
              key={plan.level}
              className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 group justify-between ${
                isMonthly
                  ? "bg-orange-50 border-2 border-orange-500 shadow-sm"
                  : "bg-white border border-slate-200 hover:border-orange-200 shadow-sm"
              }`}
            >
              {/* Most popular indicator for monthly */}
              {isMonthly && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  MOST POPULAR
                </div>
              )}

              {/* Card details */}
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded ${badge.color}`}>
                      {badge.text}
                    </span>
                    <div className="text-2xl font-black text-slate-900">¥{plan.price}</div>
                  </div>

                  <h4 className="text-xl font-bold mb-2 text-slate-900">{plan.name}</h4>
                  <ul className="text-sm text-slate-500 space-y-2 mb-auto">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        • {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action: direct afdian payment link */}
                <div className="pt-4 mt-6 border-t border-slate-100">
                  {!currentUser ? (
                    <button
                      onClick={onNavigateToAuth}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                        isMonthly
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-800 hover:bg-orange-500 hover:text-white"
                      }`}
                    >
                      登录后订阅
                    </button>
                  ) : !planId ? (
                    <div className="flex items-center justify-center gap-1 text-amber-600 text-xs py-3">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      请先配置 Plan ID
                    </div>
                  ) : (
                    <a
                      href={paymentUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                        isMonthly
                          ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200"
                          : "bg-slate-100 text-slate-800 hover:bg-orange-500 hover:text-white"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      一键订阅
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {currentUser && planId && (
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      点击后将跳转至爱发电完成支付，留言已预填邮箱 <code className="text-orange-500">{currentUser.email}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
