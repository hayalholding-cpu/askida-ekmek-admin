import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API, apiPost } from "./lib/api";

type BakeryLoginResponse = {
  ok?: boolean;
  message?: string;
  bakery?: {
    id?: string;
    uid?: string;
    bakeryName?: string;
    bakeryCode?: string;
    email?: string;
    district?: string;
    neighborhood?: string;
    isActive?: boolean;
    pendingEkmek?: number;
    pendingPide?: number;
    deliveredEkmek?: number;
    deliveredPide?: number;
    products?: any[];
  };
  baker?: any;
  token?: string | null;
  idToken?: string | null;
};

export default function FirinciLogin() {
  const navigate = useNavigate();

  const [bakeryCode, setBakeryCode] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const cleanBakeryCode = bakeryCode.trim();
      const cleanPassword = password.trim();

      if (!cleanBakeryCode || !cleanPassword) {
        setErrorMessage("Lütfen fırıncı kodu ve şifre alanlarını doldurun.");
        return;
      }

      const responseData = await apiPost<BakeryLoginResponse>(API.bakeryLogin, {
        bakeryCode: cleanBakeryCode,
        password: cleanPassword,
      });

      const bakeryData = responseData?.bakery || responseData?.baker || {};

      localStorage.setItem("bakerAuth", JSON.stringify(bakeryData));
      localStorage.setItem(
        "bakerToken",
        responseData?.idToken || responseData?.token || ""
      );

      setSuccessMessage("Giriş başarılı. Yönlendiriliyorsunuz...");

      setTimeout(() => {
        navigate("/firinci-panel");
      }, 700);
    } catch (error: any) {
      console.error("Fırıncı giriş hatası:", error);
      setErrorMessage(
        error?.message || "Sunucu bağlantı hatası oluştu."
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
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: 28,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>
            Fırıncı Girişi
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
            Fırıncı kodunuz ve şifreniz ile giriş yaparak askıdaki ürünleri
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
              fontWeight: 600,
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
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        <input
          type="text"
          placeholder="Fırıncı Kodu"
          value={bakeryCode}
          onChange={(e) => setBakeryCode(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...buttonStyle,
            background: loading ? "#9ca3af" : "#111827",
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 10,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Fırıncı kodu, admin panelde fırın hesabı oluşturulduktan sonra verilen
          6 haneli koddur.
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  marginBottom: 12,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: 12,
};