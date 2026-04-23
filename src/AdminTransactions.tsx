import React, { useEffect, useMemo, useState } from "react";
import { API, apiGet } from "./lib/api";

type TransactionItem = {
  id: string;
  bakeryId?: string;
  bakeryUid?: string;
  bakeryName?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  type?: string;
  productType?: string;
  count?: number;
  note?: string;
  source?: string;
  date?: string;
  createdAt?: any;
  pendingEkmekBefore?: number;
  pendingEkmekAfter?: number;
  deliveredEkmekBefore?: number;
  deliveredEkmekAfter?: number;
};

function mapTransaction(item: any): TransactionItem {
  return {
    id: String(item?.id || ""),
    bakeryId: item?.bakeryId || "",
    bakeryUid: item?.bakeryUid || "",
    bakeryName: item?.bakeryName || "",
    city: item?.city || "",
    district: item?.district || "",
    neighborhood: item?.neighborhood || "",
    type: item?.type || "",
    productType: item?.productType || "",
    count: Number(item?.count || 0),
    note: item?.note || "",
    source: item?.source || "",
    date: item?.date || "",
    createdAt: item?.createdAt || null,
    pendingEkmekBefore: Number(item?.pendingEkmekBefore || 0),
    pendingEkmekAfter: Number(item?.pendingEkmekAfter || 0),
    deliveredEkmekBefore: Number(item?.deliveredEkmekBefore || 0),
    deliveredEkmekAfter: Number(item?.deliveredEkmekAfter || 0),
  };
}

function getTransactionTypeLabel(type?: string) {
  const safeType = String(type || "").toLowerCase();

  if (safeType === "askidan-ekmek-verildi") {
    return "Askıdan Ekmek Verildi";
  }

  if (safeType === "odeme-tamamlandi") {
    return "Ödeme Tamamlandı";
  }

  if (safeType === "payment-complete") {
    return "Ödeme Tamamlandı";
  }

  if (safeType === "askiya-ekmek-birakildi") {
    return "Askıya Ekmek Bırakıldı";
  }

  if (safeType === "ekmek-yuklendi") {
    return "Ekmek Yüklendi";
  }

  if (safeType === "ekmek-teslim-edildi") {
    return "Ekmek Teslim Edildi";
  }

  if (safeType === "delivered-ekmek") {
    return "Ekmek Teslim Edildi";
  }

  return type || "-";
}

function formatDate(value: any, fallbackDate?: string) {
  try {
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString("tr-TR");
    }

    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("tr-TR");
      }
    }

    if (fallbackDate) {
      return fallbackDate;
    }

    return "-";
  } catch {
    return fallbackDate || "-";
  }
}

export default function AdminTransactions() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await apiGet(API.adminTransactions);

      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.transactions)
        ? response.transactions
        : [];

      const list = rawList.map((item: any) => mapTransaction(item));

      setTransactions(list);
    } catch (error: any) {
      console.error("İşlem geçmişi alma hatası:", error);
      setErrorMessage(
        error?.message || "İşlem geçmişi alınamadı. Sunucu bağlantısını kontrol edin."
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const totalTransactions = transactions.length;

  const totalIncomingEkmek = useMemo(() => {
    return transactions.reduce((sum, item) => {
      const type = String(item.type || "").toLowerCase();
      const productType = String(item.productType || "").toLowerCase();
      const count = Number(item.count || 0);

      const isIncomingEkmek =
        (type === "odeme-tamamlandi" ||
          type === "payment-complete" ||
          type === "askiya-ekmek-birakildi" ||
          type === "ekmek-yuklendi") &&
        productType === "ekmek";

      return isIncomingEkmek ? sum + count : sum;
    }, 0);
  }, [transactions]);

  const totalDeliveredEkmek = useMemo(() => {
    return transactions.reduce((sum, item) => {
      const type = String(item.type || "").toLowerCase();
      const productType = String(item.productType || "").toLowerCase();
      const count = Number(item.count || 0);

      const isDeliveredEkmek =
        (type === "askidan-ekmek-verildi" ||
          type === "ekmek-teslim-edildi" ||
          type === "delivered-ekmek") &&
        productType === "ekmek";

      return isDeliveredEkmek ? sum + count : sum;
    }, 0);
  }, [transactions]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={titleStyle}>İşlem Geçmişi</h1>
              <p style={subtleTextStyle}>Yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <div>
            <h1 style={titleStyle}>İşlem Geçmişi</h1>
            <p style={subtleTextStyle}>
              Fırınlara ait tüm hareketler burada listelenir.
            </p>
          </div>

          <button style={refreshButtonStyle} onClick={loadTransactions}>
            Yenile
          </button>
        </div>

        {errorMessage && <div style={errorBoxStyle}>{errorMessage}</div>}

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Toplam İşlem</div>
            <div style={summaryValueStyle}>{totalTransactions}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Toplam Gelen Ekmek</div>
            <div style={summaryValueStyle}>{totalIncomingEkmek}</div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Toplam Verilen Ekmek</div>
            <div style={summaryValueStyle}>{totalDeliveredEkmek}</div>
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tarih</th>
                <th style={thStyle}>Fırın</th>
                <th style={thStyle}>Konum</th>
                <th style={thStyle}>İşlem Tipi</th>
                <th style={thStyle}>Ürün</th>
                <th style={thStyle}>Adet</th>
                <th style={thStyle}>Not</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td style={emptyTdStyle} colSpan={7}>
                    Henüz işlem kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                transactions.map((item) => {
                  const locationText = [item.city, item.district, item.neighborhood]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        {formatDate(item.createdAt, item.date)}
                      </td>
                      <td style={tdStyle}>{item.bakeryName || "-"}</td>
                      <td style={tdStyle}>{locationText || "-"}</td>
                      <td style={tdStyle}>{getTransactionTypeLabel(item.type)}</td>
                      <td style={tdStyle}>{item.productType || "-"}</td>
                      <td style={tdStyle}>{Number(item.count || 0)}</td>
                      <td style={tdStyle}>{item.note || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
  maxWidth: 1200,
  margin: "0 auto",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  color: "#111827",
};

const subtleTextStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  color: "#6b7280",
};

const refreshButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#111827",
  color: "#ffffff",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
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

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  marginTop: 8,
  color: "#111827",
};

const tableWrapStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  background: "#111827",
  color: "#ffffff",
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderTop: "1px solid #e5e7eb",
  fontSize: 14,
  color: "#111827",
  verticalAlign: "top",
};

const emptyTdStyle: React.CSSProperties = {
  padding: "18px 16px",
  textAlign: "center",
  color: "#6b7280",
};