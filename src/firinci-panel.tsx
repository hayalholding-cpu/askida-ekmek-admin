import { doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API, apiPost } from "./lib/api";
import { db } from "./firebase";

type BakeryDoc = {
  id?: string;
  uid?: string;
  bakeryName?: string;
  email?: string;
  phone?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  bakeryCode?: string;
  isActive?: boolean;
  pendingEkmek?: number;
  pendingPide?: number;
  deliveredEkmek?: number;
  deliveredPide?: number;
};

type DeliverResponse = {
  ok?: boolean;
  message?: string;
  bakeryId?: string;
  bakeryName?: string;
  pendingEkmek?: number;
  deliveredEkmek?: number;
};

function mapBakeryData(docId: string, data: any): BakeryDoc {
  return {
    id: docId,
    uid: data?.uid || docId,
    bakeryName: data?.bakeryName || "",
    email: data?.email || "",
    phone: data?.phone || "",
    city: data?.city || "",
    district: data?.district || "",
    neighborhood: data?.neighborhood || "",
    bakeryCode: data?.bakeryCode || "",
    isActive: data?.isActive !== false,
    pendingEkmek: Number(data?.pendingEkmek || 0),
    pendingPide: Number(data?.pendingPide || 0),
    deliveredEkmek: Number(data?.deliveredEkmek || 0),
    deliveredPide: Number(data?.deliveredPide || 0),
  };
}

export default function FirinciPanel() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bakery, setBakery] = useState<BakeryDoc | null>(null);
  const [bakeryId, setBakeryId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [teslimAdet, setTeslimAdet] = useState(1);
  const [teslimNotu, setTeslimNotu] = useState("");
  const [teslimLoading, setTeslimLoading] = useState(false);

  useEffect(() => {
    try {
      const bakerAuthRaw = localStorage.getItem("bakerAuth");

      if (!bakerAuthRaw) {
        navigate("/firinci-login", { replace: true });
        return;
      }

      const bakerAuth = JSON.parse(bakerAuthRaw);

      if (!bakerAuth) {
        localStorage.removeItem("bakerAuth");
        localStorage.removeItem("bakerToken");
        navigate("/firinci-login", { replace: true });
        return;
      }

      const resolvedBakeryId = String(bakerAuth.id || bakerAuth.uid || "").trim();

      if (!resolvedBakeryId) {
        setErrorMessage("Fırın kimliği bulunamadı.");
        setBakery(null);
        setLoading(false);
        return;
      }

      setBakeryId(resolvedBakeryId);

      const unsub = onSnapshot(
        doc(db, "bakeries", resolvedBakeryId),
        (snap) => {
          if (!snap.exists()) {
            setBakery(null);
            setErrorMessage("Fırın kaydı bulunamadı.");
            setLoading(false);
            return;
          }

          const currentBakery = mapBakeryData(snap.id, snap.data());

          setBakery(currentBakery);
          setErrorMessage("");
          setLoading(false);

          localStorage.setItem("bakerAuth", JSON.stringify(currentBakery));

          const pendingCount = Number(currentBakery.pendingEkmek || 0);
          setTeslimAdet((prev) => {
            if (pendingCount <= 0) return 1;
            if (prev > pendingCount) return pendingCount;
            if (prev < 1) return 1;
            return prev;
          });
        },
        (error) => {
          console.error("Fırıncı paneli canlı veri hatası:", error);
          setErrorMessage("Fırın verisi canlı olarak alınamadı.");
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (error) {
      console.error("Fırıncı paneli yükleme hatası:", error);
      setErrorMessage("Fırın bilgisi okunamadı.");
      setBakery(null);
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("bakerAuth");
    localStorage.removeItem("bakerToken");
    navigate("/firinci-login", { replace: true });
  };

  const handleRefreshFromFirestore = async () => {
    try {
      if (!bakeryId) {
        setErrorMessage("Fırın kimliği bulunamadı.");
        return;
      }

      setSuccessMessage("");
      setErrorMessage("");

      const snap = await getDoc(doc(db, "bakeries", bakeryId));

      if (!snap.exists()) {
        setBakery(null);
        setErrorMessage("Fırın kaydı bulunamadı.");
        return;
      }

      const freshBakery = mapBakeryData(snap.id, snap.data());

      setBakery(freshBakery);
      localStorage.setItem("bakerAuth", JSON.stringify(freshBakery));
      setSuccessMessage("Panel bilgileri Firestore'dan yenilendi.");
    } catch (error) {
      console.error("Firestore yenileme hatası:", error);
      setErrorMessage("Panel bilgileri Firestore'dan yenilenemedi.");
    }
  };

  const handleDeliverBread = async () => {
    try {
      setSuccessMessage("");
      setErrorMessage("");

      const pendingCount = Number(bakery?.pendingEkmek || 0);

      if (!bakeryId) {
        setErrorMessage("Fırın kimliği bulunamadı.");
        return;
      }

      if (pendingCount <= 0) {
        setErrorMessage("Askıda bekleyen ekmek bulunmuyor.");
        return;
      }

      if (!Number.isInteger(teslimAdet) || teslimAdet < 1) {
        setErrorMessage("Teslim adedi en az 1 olmalıdır.");
        return;
      }

      if (teslimAdet > pendingCount) {
        setErrorMessage("Teslim adedi, bekleyen ekmek sayısından fazla olamaz.");
        return;
      }

      setTeslimLoading(true);

      const data = await apiPost<DeliverResponse>(API.deliverSuspendedBread, {
        bakeryId,
        count: teslimAdet,
        note: teslimNotu.trim(),
      });

      if (!data?.ok) {
        setErrorMessage(data?.message || "Askıdan ekmek verme işlemi başarısız oldu.");
        return;
      }

      setTeslimAdet(1);
      setTeslimNotu("");
      setSuccessMessage(
        `${teslimAdet} adet ekmek askıdan verildi. Bekleyen ve verilen ekmek sayıları güncellendi.`
      );
    } catch (error: any) {
      console.error("Askıdan ekmek verme hatası:", error);
      setErrorMessage(
        error?.message || "Backend bağlantısında hata oluştu."
      );
    } finally {
      setTeslimLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1 style={titleStyle}>Fırıncı Paneli</h1>
          <p style={subtleTextStyle}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!bakery) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={topBarStyle}>
            <div>
              <h1 style={titleStyle}>Fırıncı Paneli</h1>
              <p style={subtleTextStyle}>Fırın bilgisi bulunamadı</p>
            </div>

            <button onClick={handleLogout} style={logoutButtonStyle}>
              Çıkış Yap
            </button>
          </div>

          <div style={errorBoxStyle}>
            {errorMessage || "Fırın bilgisi bulunamadı."}
          </div>
        </div>
      </div>
    );
  }

  const displayName = bakery.bakeryName || "Fırın";
  const locationText = [bakery.city, bakery.district, bakery.neighborhood]
    .filter(Boolean)
    .join(" / ");
  const pendingCount = Number(bakery.pendingEkmek || 0);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <h1 style={titleStyle}>Fırıncı Paneli</h1>
            <p style={subtleTextStyle}>
              {displayName}
              {locationText ? ` • ${locationText}` : ""}
            </p>
          </div>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            Çıkış Yap
          </button>
        </div>

        {successMessage && <div style={successBoxStyle}>{successMessage}</div>}
        {errorMessage && <div style={errorBoxStyle}>{errorMessage}</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>Fırıncı Kodu</div>
            <div style={valueStyle}>{bakery.bakeryCode || "-"}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Bekleyen Ekmek</div>
            <div style={valueStyle}>{Number(bakery.pendingEkmek || 0)}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Bekleyen Pide</div>
            <div style={valueStyle}>{Number(bakery.pendingPide || 0)}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Verilen Ekmek</div>
            <div style={valueStyle}>{Number(bakery.deliveredEkmek || 0)}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Verilen Pide</div>
            <div style={valueStyle}>{Number(bakery.deliveredPide || 0)}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Durum</div>
            <div style={valueStyle}>
              {bakery.isActive === false ? "Pasif" : "Aktif"}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Askıdan Ekmek Ver</h3>

          <p style={descStyle}>
            Bu alandan askıda bekleyen ekmekleri teslim edilmiş olarak işaretleyebilirsin.
            Adet seç, istersen not yaz ve işlemi tamamla.
          </p>

          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>Teslim Edilecek Adet</div>

            <div style={counterWrapStyle}>
              <button
                type="button"
                onClick={() => setTeslimAdet((prev) => Math.max(1, prev - 1))}
                style={counterButtonStyle}
                disabled={teslimLoading || pendingCount <= 0}
              >
                -
              </button>

              <div style={counterValueStyle}>{teslimAdet}</div>

              <button
                type="button"
                onClick={() =>
                  setTeslimAdet((prev) =>
                    Math.min(Math.max(pendingCount, 1), prev + 1)
                  )
                }
                style={counterButtonStyle}
                disabled={teslimLoading || pendingCount <= 0}
              >
                +
              </button>

              <div style={helperTextStyle}>
                Bekleyen ekmek: <strong>{pendingCount}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>İşlem Notu</div>
            <textarea
              value={teslimNotu}
              onChange={(e) => setTeslimNotu(e.target.value)}
              placeholder="Örn: Sabah dağıtımı yapıldı"
              rows={4}
              style={textareaStyle}
              disabled={teslimLoading}
            />
          </div>

          <button
            onClick={handleDeliverBread}
            disabled={teslimLoading || pendingCount <= 0}
            style={{
              ...actionBtnStyle,
              background:
                teslimLoading || pendingCount <= 0 ? "#9ca3af" : "#16a34a",
              maxWidth: 280,
            }}
          >
            {teslimLoading ? "İşleniyor..." : "Askıdan Ekmek Ver"}
          </button>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Panel Bilgisi</h3>
          <p style={descStyle}>
            Bu panel artık giriş verisiyle sınırlı değildir. Fırın bilgileri
            Firestore’daki güncel bakery kaydından okunur ve canlı olarak
            yenilenir.
          </p>

          <button
            onClick={handleRefreshFromFirestore}
            style={{
              ...actionBtnStyle,
              background: "#111827",
              maxWidth: 300,
            }}
          >
            Firestore'dan Yenile
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f4f6f8",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  color: "#111827",
};

const subtleTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#6b7280",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
};

const valueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  marginTop: 8,
  color: "#111827",
  wordBreak: "break-word",
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
  marginBottom: 24,
};

const descStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.6,
  marginTop: 0,
  marginBottom: 18,
};

const actionBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const successBoxStyle: React.CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #10b981",
  color: "#065f46",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
  fontWeight: 600,
};

const errorBoxStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #ef4444",
  color: "#7f1d1d",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
  fontWeight: 600,
};

const counterWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 10,
  flexWrap: "wrap",
};

const counterButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontSize: 24,
  fontWeight: 700,
  cursor: "pointer",
};

const counterValueStyle: React.CSSProperties = {
  minWidth: 64,
  height: 44,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 800,
  color: "#111827",
  background: "#fff",
};

const helperTextStyle: React.CSSProperties = {
  color: "#4b5563",
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  resize: "vertical",
  boxSizing: "border-box",
};