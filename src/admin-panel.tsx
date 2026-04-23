import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "./firebase";

type BakeryItem = {
  id: string;
  uid?: string;
  isActive?: boolean;
  pendingEkmek?: number;
};

type TransactionItem = {
  id: string;
  createdAt?: any;
};

export default function AdminPanel() {
  const [bakeries, setBakeries] = useState<BakeryItem[]>([]);
  const [todayTransactions, setTodayTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const bakeriesSnap = await getDocs(collection(db, "bakeries"));
      const bakeryList: BakeryItem[] = bakeriesSnap.docs.map((docItem) => {
        const data = docItem.data() as any;
        return {
          id: docItem.id,
          uid: data?.uid || docItem.id,
          isActive: typeof data?.isActive === "boolean" ? data.isActive : true,
          pendingEkmek: Number(data?.pendingEkmek || 0),
        };
      });

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );

      let transactionList: TransactionItem[] = [];
      try {
        const txQuery = query(
          collection(db, "bakery_transactions"),
          where("createdAt", ">=", startOfDay)
        );
        const txSnap = await getDocs(txQuery);
        transactionList = txSnap.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as any),
        }));
      } catch {
        transactionList = [];
      }

      setBakeries(bakeryList);
      setTodayTransactions(transactionList);
    } catch (err) {
      console.error(err);
      setError("Dashboard verileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  const totalBakeries = useMemo(() => bakeries.length, [bakeries]);

  const activeBakeries = useMemo(
    () => bakeries.filter((item) => item.isActive === true).length,
    [bakeries]
  );

  const passiveBakeries = useMemo(
    () => bakeries.filter((item) => item.isActive === false).length,
    [bakeries]
  );

  const totalPendingBread = useMemo(
    () => bakeries.reduce((sum, item) => sum + Number(item.pendingEkmek || 0), 0),
    [bakeries]
  );

  const quickLinks = [
    {
      title: "Fırıncı Ekle",
      description: "Yeni fırın hesabı oluştur ve sisteme ekle.",
      path: "/admin/create-baker",
      buttonText: "Fırıncı Ekle",
    },
    {
      title: "Fırın Listesi",
      description: "Tüm fırınları görüntüle, detayına gir, düzenle veya sil.",
      path: "/admin/bakeries",
      buttonText: "Fırınları Gör",
    },
    {
      title: "İşlem Geçmişi",
      description: "Ödeme, ekmek ekleme ve askıdan verme işlemlerini izle.",
      path: "/admin/transactions",
      buttonText: "İşlemleri Gör",
    },
    {
      title: "Ürün Yönetimi",
      description: "Ürün ekle, fiyat güncelle, aktif/pasif durumunu değiştir.",
      path: "/admin/products",
      buttonText: "Ürünleri Yönet",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            color: "#111827",
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: "#6b7280",
            lineHeight: 1.6,
            fontSize: 15,
          }}
        >
          Askıda Ekmek yönetim panelinin genel durumunu buradan takip edebilirsin.
        </p>
      </div>

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: 14,
            padding: 14,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <SummaryCard
          title="Toplam Fırın"
          value={loading ? "..." : String(totalBakeries)}
        />
        <SummaryCard
          title="Aktif Fırın"
          value={loading ? "..." : String(activeBakeries)}
        />
        <SummaryCard
          title="Pasif Fırın"
          value={loading ? "..." : String(passiveBakeries)}
        />
        <SummaryCard
          title="Bekleyen Ekmek"
          value={loading ? "..." : String(totalPendingBread)}
        />
        <SummaryCard
          title="Bugünkü İşlem"
          value={loading ? "..." : String(todayTransactions.length)}
        />
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              color: "#111827",
            }}
          >
            Hızlı Erişim
          </h2>
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Sık kullanılan yönetim ekranlarına hızlıca geç.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {quickLinks.map((item) => (
            <div
              key={item.path}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 18,
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {item.description}
              </div>

              <Link
                to={item.path}
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  background: "#111827",
                  color: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {item.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#111827",
          fontSize: 34,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}