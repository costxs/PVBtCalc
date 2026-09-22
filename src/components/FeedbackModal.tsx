import { useState, useEffect, type FormEvent } from "react";
import { useT } from "../i18n";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEB3FORMS_KEY = (import.meta.env?.VITE_WEB3FORMS_KEY as string | undefined) || "6a37d8d8-aa53-47e7-a317-3c484f78cf2b";

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (isOpen) {
      setSubject(t("feedback.default_subject"));
      setStatus("idle");
    }
  }, [isOpen, t]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "loading") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, status]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === "loading") return;

    setStatus("loading");

    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_KEY);
      formData.append("subject", subject.trim() || t("feedback.default_subject"));
      formData.append("from_name", "PVBtCalc WebApp");
      if (name.trim()) formData.append("name", name.trim());
      if (email.trim()) formData.append("email", email.trim());
      formData.append("message", message.trim());

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setStatus("success");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setMessage("");
    setSubject(t("feedback.default_subject"));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== "loading") onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          border: "1px solid var(--color-divider)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            background: "var(--color-accent-900)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94bce3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: "19px",
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {t("feedback.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("feedback.close")}
            disabled={status === "loading"}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(238, 241, 244, 0.7)",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.12)",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-neutral-800)" }}>
                {t("feedback.success_title")}
              </h4>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--color-neutral-700)", lineHeight: 1.5, maxWidth: "420px" }}>
                {t("feedback.success_message")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn"
                onClick={handleReset}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-neutral-300)",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {t("feedback.send_another")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "var(--color-accent)",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("feedback.close")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--color-neutral-700)",
              }}
            >
              {t("feedback.description")}
            </p>

            {status === "error" && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  background: "#fef2f2",
                  border: "1px solid #f87171",
                  color: "#b91c1c",
                  fontSize: "12.5px",
                  lineHeight: 1.4,
                }}
              >
                {t("feedback.error_message")}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--color-neutral-700)" }}>
                  {t("feedback.name")}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={t("feedback.name_placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>

              <div className="field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--color-neutral-700)" }}>
                  {t("feedback.user_email")}
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder={t("feedback.user_email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>
            </div>

            <div className="field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--color-neutral-700)" }}>
                {t("feedback.subject")}
              </label>
              <input
                type="text"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={status === "loading"}
              />
            </div>

            <div className="field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--color-neutral-700)" }}>
                {t("feedback.message")}
              </label>
              <textarea
                className="input"
                rows={4}
                required
                placeholder={t("feedback.message_placeholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
                style={{
                  minHeight: "90px",
                  padding: "8px 12px",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                disabled={status === "loading"}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-neutral-300)",
                  background: "#ffffff",
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                }}
              >
                {t("feedback.close")}
              </button>
              <button
                type="submit"
                className="btn"
                disabled={status === "loading" || !message.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: status === "loading" || !message.trim() ? "var(--color-neutral-500)" : "var(--color-accent)",
                  borderRadius: "6px",
                  border: "none",
                  cursor: status === "loading" || !message.trim() ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                {status === "loading" ? (
                  <>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: "spin 1s linear infinite" }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    {t("feedback.sending")}
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    {t("feedback.send")}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
