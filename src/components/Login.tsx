import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { clearMessages, signIn, signUp } from "../redux/user/slice";
import { AppDispatch, RootState } from "../redux/store";
import { translateIfKey, useT } from "../i18n";

export default function LoginScreen() {
  const { t } = useT();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, notice } = useSelector((state: RootState) => state.user);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setLocalError("");
    dispatch(clearMessages());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (mode === "register" && !name.trim()) {
      setLocalError(t("auth.err_name_required"));
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setLocalError(t("auth.err_email_invalid"));
      return;
    }
    if (mode === "register" && password.length < 6) {
      setLocalError(t("auth.err_password_min"));
      return;
    }
    if (!password) {
      setLocalError(t("auth.err_password_required"));
      return;
    }
    if (mode === "register") {
      dispatch(signUp({ name, email, password }));
    } else {
      dispatch(signIn({ email, password }));
    }
  };

  const shownError = localError || (error ? translateIfKey(t, error) : "");
  const shownNotice = notice ? translateIfKey(t, notice) : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f4f9",
        backgroundImage:
          "radial-gradient(at 100% 0%, rgba(219, 234, 254, 0.7) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(191, 219, 254, 0.5) 0px, transparent 50%)",
        fontFamily: "var(--font-body)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)",
          padding: "36px 32px",
          boxSizing: "border-box",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <img
              src="/PVBtCalcLogo.png"
              alt={t("auth.logo_alt")}
              style={{
                height: "64px",
                maxWidth: "180px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </motion.div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "30px",
              fontWeight: 700,
              color: "#1e3a5f",
              letterSpacing: "-0.01em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            PVBt<span style={{ color: "#2563eb" }}>Calc</span>
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            {t("auth.tagline")}
          </p>
        </div>

        {/* Tab Switcher: Entrar / Registrar */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#f1f5f9",
            borderRadius: "10px",
            padding: "4px",
            marginBottom: "24px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => switchMode("login")}
            style={{
              position: "relative",
              flex: 1,
              padding: "9px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13.5px",
              fontWeight: 600,
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: mode === "login" ? "#2563eb" : "#64748b",
              transition: "color 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "login" && (
              <motion.div
                layoutId="authTabIndicator"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#ffffff",
                  borderRadius: "7px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{t("auth.tab_login")}</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            style={{
              position: "relative",
              flex: 1,
              padding: "9px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13.5px",
              fontWeight: 600,
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: mode === "register" ? "#2563eb" : "#64748b",
              transition: "color 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "register" && (
              <motion.div
                layoutId="authTabIndicator"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#ffffff",
                  borderRadius: "7px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{t("auth.tab_register")}</span>
          </button>
        </div>

        {/* Form */}
        <form
          method="post"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Animated Name Field on Register Mode */}
          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0, marginTop: -4 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: -4 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <label
                  htmlFor="auth-full-name"
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  {t("auth.full_name")}
                </label>
                <div style={{ position: "relative" }}>
                  <FiUser
                    style={{
                      position: "absolute",
                      left: "13px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontSize: "16px",
                    }}
                  />
                  <input
                    id="auth-full-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("auth.name_placeholder")}
                    autoComplete="name"
                    maxLength={120}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      height: "42px",
                      padding: "0 12px 0 38px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Field */}
          <div>
            <label
              htmlFor="auth-email"
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              {t("auth.email")}
            </label>
            <div style={{ position: "relative" }}>
              <FiMail
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "16px",
                }}
              />
              <input
                id="auth-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email_placeholder")}
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "42px",
                  padding: "0 12px 0 38px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                htmlFor="auth-password"
                style={{
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {t("auth.password")}
              </label>
              {mode === "register" && (
                <span id="auth-password-hint" style={{ fontSize: "11px", color: "#64748b" }}>
                  {t("auth.min_6_chars")}
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <FiLock
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "16px",
                }}
              />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                aria-describedby={mode === "register" ? "auth-password-hint" : undefined}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "42px",
                  padding: "0 40px 0 38px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={showPassword ? t("auth.hide_password") : t("auth.show_password")}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Animated Error Alert */}
          <AnimatePresence>
            {shownError && (
              <motion.div
                role="alert"
                aria-live="assertive"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  x: [-3, 3, -2, 2, 0],
                }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "13px",
                }}
              >
                <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{shownError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Success / Notice Alert */}
          <AnimatePresence>
            {shownNotice && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#15803d",
                  fontSize: "13px",
                }}
              >
                <FiCheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{shownNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.012 }}
            whileTap={{ scale: loading ? 1 : 0.985 }}
            style={{
              marginTop: "4px",
              height: "44px",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              border: "none",
              color: "#ffffff",
              fontFamily: "var(--font-heading)",
              fontSize: "14.5px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.75 : 1,
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#2563eb";
            }}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.35)",
                    borderTopColor: "#ffffff",
                    borderRadius: "50%",
                  }}
                />
                <span>{t("auth.loading")}</span>
              </>
            ) : (
              <>
                <span>
                  {mode === "register" ? t("auth.create_account") : t("auth.sign_in")}
                </span>
                <FiArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer Link */}
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          {mode === "login" ? (
            <span>
              {t("auth.no_account_yet")}{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {t("auth.sign_up_link")}
              </button>
            </span>
          ) : (
            <span>
              {t("auth.already_have_account")}{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {t("auth.access_account_link")}
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
