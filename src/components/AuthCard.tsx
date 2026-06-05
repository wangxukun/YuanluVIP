/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { User, ApiResponse } from "../types.js";

interface AuthCardProps {
  onAuthSuccess: (user: User) => void;
}

export function AuthCard({ onAuthSuccess }: AuthCardProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("wangxugkung@gmail.com"); // Prefill with metadata user's email for convenience
  const [password, setPassword] = useState("123456"); // Simple default password for easy demo testing
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Basic validation
    if (!trimmedEmail || !trimmedPass) {
      setErrorMsg("请完整填写所有必填字段！");
      setIsLoading(false);
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMsg("请输入合法的邮箱格式！");
      setIsLoading(false);
      return;
    }

    if (trimmedPass.length < 4) {
      setErrorMsg("为了您的安全，密码最少为 4 位！");
      setIsLoading(false);
      return;
    }

    const apiUrl = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPass })
      });

      const data: { success: boolean; message: string; user?: User } = await response.json();

      if (!response.ok || !data.success) {
        setErrorMsg(data.message || "请求服务器出现错误，请稍后再试！");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(activeTab === "login" ? "登录成功！" : "注册并登录成功！");
      
      // Save details after brief success animation delay
      setTimeout(() => {
        if (data.user) {
          onAuthSuccess(data.user);
        }
      }, 800);

    } catch (err: any) {
      setErrorMsg("无法接通服务器，请检查后端运行状态。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-box-card" className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl animate-fade-in text-slate-800">
      {/* Visual illustration banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-orange-950 px-6 py-8 text-center text-white space-y-2 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        
        <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/20">
          <ShieldCheck className="w-6 h-6 text-orange-400" />
        </div>
        <h3 className="text-xl font-black font-sans tracking-wide">Yuanlu<span className="text-orange-500">Pro</span> 会员管理中心</h3>
        <p className="text-xs text-slate-350">学习利用「爱发电」作为您独立站点的会员赞助解决方案</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button
          onClick={() => {
            setActiveTab("login");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex-1 py-4 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
            activeTab === "login"
              ? "border-orange-500 bg-white text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          立即登录
        </button>
        <button
          onClick={() => {
            setActiveTab("register");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex-1 py-4 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
            activeTab === "register"
              ? "border-orange-500 bg-white text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          免费注册账号
        </button>
      </div>

      {/* Auth visual Forms container */}
      <form onSubmit={handleAuthSubmit} className="p-6 space-y-5">
        {/* Alerts and errors displays */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-650 p-4 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl flex items-center gap-2.5 text-xs animate-pulse">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              用户名 / 电子邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的常用电子邮箱"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 text-xs rounded-xl focus:ring-1 focus:ring-orange-500 text-slate-900 outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              进入凭证 / 登录密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入您的登录密码"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 text-xs rounded-xl focus:ring-1 focus:ring-orange-500 text-slate-900 outline-none font-mono"
            />
          </div>
        </div>

        {/* Submit action */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-xl font-bold text-xs text-white transition active:scale-98 shadow flex items-center justify-center cursor-pointer ${
            isLoading
              ? "bg-slate-400 text-slate-100 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : activeTab === "login" ? (
            "确认登录"
          ) : (
            "注册并一键开通"
          )}
        </button>

        <p className="text-[10px] text-center text-slate-400">
          * 我们承诺严格保障密码经过不可逆散列 SHA256 加密保存。
        </p>
      </form>
    </div>
  );
}
