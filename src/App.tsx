/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Crown, 
  Sparkles, 
  LogOut, 
  Activity
} from "lucide-react";
import { VipLevel, User } from "./types.js";
import { AuthCard } from "./components/AuthCard.js";
import { PlansPanel } from "./components/PlansPanel.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isVipFreshActive, setIsVipFreshActive] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("yuanlu_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error("Local storage user parsing failed:", e);
      }
    }
  }, []);

  // Poll database to auto-refresh user status (useful after simulating a Webhook payment!)
  useEffect(() => {
    if (currentUser) {
      // Force status update on setup
      fetchLatestUserStatus(currentUser.email);

      // Start automatic polling interval (every 3 seconds)
      const interval = setInterval(() => {
        fetchLatestUserStatus(currentUser.email);
      }, 3000);
      setPollIntervalId(interval);

      return () => clearInterval(interval);
    } else {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
      }
    }
  }, [currentUser?.email]);

  // Recalculate remaining duration based on current user's vipExpiry
  useEffect(() => {
    if (currentUser && currentUser.vipExpiry) {
      const expiryTime = Date.parse(currentUser.vipExpiry);
      const diffMs = expiryTime - Date.now();
      if (diffMs > 0) {
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setDaysRemaining(days);
      } else {
        setDaysRemaining(null);
      }
    } else {
      setDaysRemaining(null);
    }
  }, [currentUser?.vipExpiry, currentUser?.vipLevel]);

  const fetchLatestUserStatus = async (email: string) => {
    try {
      const res = await fetch(`/api/auth/user?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.user) {
        // Did VIP level change or expiry extend? Show flash animation
        if (currentUser && data.user.vipLevel > currentUser.vipLevel) {
          setIsVipFreshActive(true);
          setTimeout(() => setIsVipFreshActive(false), 4000);
        }
        
        setCurrentUser(data.user);
        // Sync back to local storage
        localStorage.setItem("yuanlu_user", JSON.stringify(data.user));
      }
    } catch (e) {
      console.error("Failed to poll user stats:", e);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("yuanlu_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("yuanlu_user");
    setCurrentUser(null);
    setDaysRemaining(null);
  };

  const getVipBadgeDetails = (level: VipLevel) => {
    switch (level) {
      case VipLevel.WEEKLY:
        return { text: "周度会员 (Weekly)", color: "text-amber-700 bg-amber-50 border-amber-200" };
      case VipLevel.MONTHLY:
        return { text: "月度会员 (Monthly)", color: "text-orange-700 bg-orange-50 border-orange-200" };
      case VipLevel.QUARTERLY:
        return { text: "季度会员 (Quarterly)", color: "text-rose-700 bg-rose-50 border-rose-200" };
      case VipLevel.YEARLY:
        return { text: "年度至尊会员 (Yearly)", color: "text-yellow-700 bg-yellow-50 border-yellow-200 animate-pulse font-extrabold" };
      default:
        return { text: "免费用户 (Guest)", color: "text-slate-500 bg-slate-100 border-slate-200" };
    }
  };

  const activeVipDetails = currentUser ? getVipBadgeDetails(currentUser.vipLevel) : null;

  return (
    <div id="yuanlu-app-root" className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between text-slate-900">
      
      {/* 👑 Top Header & User Status Section */}
      <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <div id="brand-logo-section" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black">Y</div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-800">
                Yuanlu<span className="text-orange-500">Pro</span>
              </span>
            </div>
          </div>

          {/* User state display */}
          <div id="user-status-card" className="flex items-center gap-6">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-800 font-mono">{currentUser.email}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {currentUser.vipLevel > VipLevel.NONE ? activeVipDetails?.text : "Standard Account"}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm uppercase">
                  {currentUser.email[0]}
                </div>
                
                <span className="w-[1px] h-6 bg-slate-200"></span>

                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-red-600 font-bold flex items-center gap-1 p-1 transition cursor-pointer"
                  title="退离登录状态"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Guest Member Mode
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📢 VIP Activation Flash Banner */}
      <AnimatePresence>
        {isVipFreshActive && (
          <motion.div
            id="vipv-fresh-banner"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-orange-500 text-white py-3.5 px-4 shadow-lg text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>【系统恭喜】您的付款已被爱发电成功捕获！会员资格已秒级自动充值并生效激活！</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Main Core Dashboard Hub */}
      <main id="main-content-hub" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!currentUser ? (
          
          /* 1. Welcoming Hero Invitation and Authentication screen */
          <div id="auth-full-screen" className="py-8 space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                学用「爱发电」自动管理您的网站会员
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed font-sans">
                为了实现最流畅的教学流程，请在下方<strong>极速注册或登录密码</strong>。
                登录成功后，您可以点击充值卡片，并直接在付款页面进行全自动邮箱激活操作！
              </p>
            </div>

            <AuthCard onAuthSuccess={handleLoginSuccess} />
          </div>
        ) : (
          
          /* 2. Logged-in full application dashboard without tabs */
          <div id="dashboard-full-screen" className="space-y-8">
            
            {/* Visual welcome notification banner / Bento Hero */}
            <div className="bg-slate-900 rounded-2xl p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 shadow-md border border-slate-800">
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="space-y-2 text-center md:text-left z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
                  欢迎回来，{currentUser.email.split("@")[0]}！
                  {currentUser.vipLevel > VipLevel.NONE && (
                    <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold px-3 py-0.5 rounded-full">
                      <Crown className="w-3.5 h-3.5 fill-orange-400" />
                      高级 VIP 会员
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                  通过 <span className="text-orange-400 font-bold italic">爱发电</span> 无缝激活您的 YuanluPro 会员资格。由 Webhooks & Prisma 提供即时自动同步技术支持。
                </p>
              </div>

              {/* Status Indicator Bento item */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl w-full md:w-auto justify-center z-10 backdrop-blur-xs">
                <div className="bg-orange-500 text-white rounded-xl p-2 md:p-2.5">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left text-xs">
                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    Webhook 配备状态
                  </span>
                  <span className="block font-bold text-green-400 mt-0.5">
                    ● Live / Webhook Active
                  </span>
                </div>
              </div>
            </div>

            {/* Render plans view directly */}
            <div id="plans-view-container" className="py-2">
              <div id="panel-plans" className="animate-fade-in">
                <PlansPanel currentUser={currentUser} onNavigateToAuth={() => {}} />
              </div>
            </div>

          </div>
        )}
      </main>

      {/* 🌌 Modern Platform Footer */}
      <footer id="global-footer" className="bg-slate-100 text-slate-500 text-[11px] py-6 border-t border-slate-200/80 font-mono tracking-wider uppercase mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 text-center md:text-left flex-wrap justify-center font-semibold">
            <span>DB: Prisma + PostgreSQL</span>
            <span>Auth: NextAuth (Email)</span>
            <span>Payments: Aifadian @wxkzd</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Webhook Listener Active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
