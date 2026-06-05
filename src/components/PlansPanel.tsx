/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Check, ClipboardCopy, Send, ArrowUpRight, HelpCircle, UserCheck } from "lucide-react";
import { AFDIAN_PLANS } from "../plans.js";
import { VipLevel, User } from "../types.js";

interface PlansPanelProps {
  currentUser: User | null;
  onNavigateToAuth: () => void;
}

export function PlansPanel({ currentUser, onNavigateToAuth }: PlansPanelProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof AFDIAN_PLANS[0] | null>(null);

  const handleCopyEmail = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handePlanSelect = (plan: typeof AFDIAN_PLANS[0]) => {
    setSelectedPlan(plan);
    if (currentUser) {
      // Auto copy the email for the user's convenience
      navigator.clipboard.writeText(currentUser.email);
    }
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
      {/* 📧 Quick copy notice block for logged-in user */}
      {currentUser ? (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-800">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs bg-orange-65 bg-orange-600/30 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              当前已登录用户身份
            </span>
            <h4 className="text-lg font-bold font-sans">充值激活邮箱：<span className="text-yellow-400 font-mono underline">{currentUser.email}</span></h4>
            <p className="text-xs text-slate-400">为了秒级自动激活，请务必保证在爱发电支付时的留言备注填写此相同的邮箱地址！</p>
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
            <p className="text-xs text-orange-900/85">目前您还是游客状态。在爱发电充值时必须填写您注册在袁路站点的对应邮箱，否则无法进行自动匹配激活。</p>
          </div>
          <button
            onClick={onNavigateToAuth}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl h-fit transition active:scale-95 shadow cursor-pointer"
          >
            立即登录/注册账号
          </button>
        </div>
      )}

      {/* 💳 Plans Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AFDIAN_PLANS.map((plan) => {
          const badge = getLevelBadge(plan.level);
          const isSelected = selectedPlan?.level === plan.level;
          const isMonthly = plan.level === VipLevel.MONTHLY;

          return (
            <div
              key={plan.level}
              onClick={() => handePlanSelect(plan)}
              className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 cursor-pointer group justify-between ${
                isMonthly
                  ? "bg-orange-50 border-2 border-orange-500 shadow-sm"
                  : isSelected
                    ? "bg-white border-2 border-orange-500 shadow-md scale-[1.01]"
                    : "bg-white border border-slate-200 hover:border-orange-200 shadow-sm"
              }`}
            >
              {/* Most popular indicator for monthly */}
              {isMonthly && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  MOST POPULAR
                </div>
              )}

              {/* Card top details */}
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

                {/* Action triggering purchase */}
                <div className="pt-4 mt-6 border-t border-slate-100">
                  {isMonthly ? (
                    <button className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:bg-orange-600 transition-colors cursor-pointer">
                      {isSelected ? "已选定此方案" : "Subscribe Now"}
                    </button>
                  ) : (
                    <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-orange-500 text-white" 
                        : "bg-slate-100 text-slate-800 group-hover:bg-orange-500 group-hover:text-white"
                    }`}>
                      {isSelected ? "已选定此方案" : "Select Tier"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔗 Detailed Afdian redirect dialog when plan is selected */}
      {selectedPlan && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs bg-orange-200 text-orange-700 font-bold px-2.5 py-0.5 rounded-full">
                赞助调转向导已激活
              </span>
              <h4 className="text-lg font-bold text-slate-900">
                您即将赞助：<span className="text-orange-600 font-black">{selectedPlan.name} (¥{selectedPlan.price} / {selectedPlan.days}天)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                点击下方按钮将打开 <strong>爱发电 - 远路播客的主页</strong> 主赞助方案界面。
                请选择对应的面额 <strong>¥{selectedPlan.price}</strong> 
                并通过支付宝、微信完成支付。系统已为您 <strong>生成并默认复制了</strong> 会员充值的邮箱备注。
              </p>
            </div>
            {currentUser && (
              <div className="flex-shrink-0 bg-white border border-orange-200 p-4 rounded-xl text-center shadow-xs">
                <span className="block text-[10px] text-slate-400 uppercase font-sans tracking-wide">赞助强制留言信息</span>
                <span className="block font-mono font-bold text-sm text-orange-950 select-all my-1 px-3 py-1 bg-orange-50 border border-orange-150 rounded-lg">{currentUser.email}</span>
                <span className="block text-[10px] text-orange-600 font-bold">✨ 已全自动复制！</span>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <a
              href="https://afdian.com/a/wxkzd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-orange-100"
            >
              <Send className="w-4 h-4" />
              一键前往「爱发电 - 远路播客」主页支付
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setSelectedPlan(null)}
              className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-bold text-xs transition cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
