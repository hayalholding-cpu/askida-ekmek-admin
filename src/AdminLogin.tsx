import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API, apiPost } from "./lib/api";

type LoginResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  admin?: {
    email?: string;
    role?: string;
    uid?: string;
    name?: string;
  };
  token?: string | null;
};

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async () => {
    const safeEmail = email.trim();
    const safePassword = password.trim();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!safeEmail || !safePassword) {
        setErrorMessage("Lütfen email ve şifre alanlarını doldurun.");
        return;
      }

      const data = await apiPost<LoginResponse>(API.adminLogin, {
        email: safeEmail,
        password: safePassword,
      });

      if (!data?.ok) {
        setErrorMessage(data?.message || "Giriş işlemi tamamlanamadı.");
        return;
      }

      localStorage.setItem("admin_auth", "true");
      localStorage.setItem("admin_email", data?.admin?.email || safeEmail);
      localStorage.setItem("admin_role", data?.admin?.role || "super_admin");

      if (data?.admin?.uid) {
        localStorage.setItem("admin_uid", data.admin.uid);
      }

      if (data?.token) {
        localStorage.setItem("admin_token", data.token);
      }

      setSuccessMessage("Giriş başarılı. Yönlendiriliyorsunuz...");

      setTimeout(() => {
        navigate("/admin");
      }, 700);
    } catch (error: any) {
      console.error("Admin giriş hatası:", error);
      setErrorMessage(
        error?.message ||
          "Backend bağlantısı kurulamadı. Sunucunun açık olduğundan emin olun."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: 28,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              color: "#111827",
            }}
          >
            Ana Admin Girişi
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#6b7280",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            Askıda Ekmek yönetim paneline giriş yaparak sistemdeki tüm verileri
            yönetin.
          </p>
        </div>

        {successMessage && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #10b981",
              color: "#065f46",
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #ef4444",
              color: "#7f1d1d",
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Email
          </label>

          <input
            type="email"
            placeholder="admin@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            style={{
              display: "block",
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
              boxSizing: "border-box",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Şifre
          </label>

          <input
            type="password"
            placeholder="Şifrenizi girin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              display: "block",
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
              boxSizing: "border-box",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 16px",
            background: loading ? "#9ca3af" : "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </div>
    </div>
  );
}