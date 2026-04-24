import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API, apiDelete, apiGet, apiPost, apiPut } from "./lib/api";
type BakeryDetailType = {
  id: string;
  uid?: string;
  name?: string;
  bakeryName?: string;
  email?: string;
  phone?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  role?: string;
  isActive?: boolean;
  products?: BakeryProduct[];
  todayIncomingBread?: number;
  totalIncomingBread?: number;
  suspendedBread?: number;
  todayGivenBread?: number;
  totalGivenBread?: number;
  pendingEkmek?: number;
  pendingPide?: number;
  deliveredEkmek?: number;
  deliveredPide?: number;
};

type BakeryProduct = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
};

type BakeryTransaction = {
  id: string;
  bakeryId: string;
  bakeryName: string;
  type: string;
  count: number;
  source: string;
  createdByUid: string;
  note: string;
  createdAt: any;
  productType?: string;
};

type TabKey =
  | "general"
  | "bread"
  | "transactions"
  | "products"
  | "password"
  | "danger";

type TodaySummaryType = {
  incomingEkmek: number;
  deliveredEkmek: number;
  incomingPide: number;
  deliveredPide: number;
};

const emptyTodaySummary: TodaySummaryType = {
  incomingEkmek: 0,
  deliveredEkmek: 0,
  incomingPide: 0,
  deliveredPide: 0,
};

function mapBakeryResponse(raw: any): BakeryDetailType {
  const pendingEkmek = Number(raw?.pendingEkmek || 0);
  const deliveredEkmek = Number(raw?.deliveredEkmek || 0);

  return {
    id: String(raw?.id || ""),
    uid: raw?.uid || "",
    name: raw?.name || "",
    bakeryName: raw?.bakeryName || "",
    email: raw?.email || "",
    phone: raw?.phone || "",
    city: raw?.city || "",
    district: raw?.district || "",
    neighborhood: raw?.neighborhood || "",
    role: raw?.role || "baker",
    isActive: raw?.isActive !== false,
    products: Array.isArray(raw?.products) ? raw.products : [],
    pendingEkmek,
    pendingPide: Number(raw?.pendingPide || 0),
    deliveredEkmek,
    deliveredPide: Number(raw?.deliveredPide || 0),
    suspendedBread: pendingEkmek,
    totalIncomingBread: pendingEkmek + deliveredEkmek,
    totalGivenBread: deliveredEkmek,
    todayIncomingBread: 0,
    todayGivenBread: 0,
  };
}

export default function AdminBakeryDetail() {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breadBusy, setBreadBusy] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [productsSaving, setProductsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [bakery, setBakery] = useState<BakeryDetailType | null>(null);
  const [todaySummary, setTodaySummary] =
    useState<TodaySummaryType>(emptyTodaySummary);
  const [transactions, setTransactions] = useState<BakeryTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [breadCount, setBreadCount] = useState(1);
  const [newPassword, setNewPassword] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [success]);

  const displayName = useMemo(() => {
    if (!bakery) return "Fırın";
    return bakery.bakeryName || bakery.name || "Adsız Fırın";
  }, [bakery]);

  const locationText = useMemo(() => {
    if (!bakery) return "";
    return [bakery.city, bakery.district, bakery.neighborhood]
      .filter(Boolean)
      .join(" / ");
  }, [bakery]);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setBakery(null);
      setError("Fırın kimliği bulunamadı.");
      return;
    }

    (async () => {
      const loadedBakery = await loadBakery();
      const summaryUid = loadedBakery?.uid || loadedBakery?.id || uid;
      if (summaryUid) {
        await loadTodaySummary(summaryUid);
      }
    })();
  }, [uid]);

  useEffect(() => {
    if (activeTab === "transactions" && uid) {
      loadTransactions();
    }
  }, [activeTab, uid]);

  async function loadBakery(): Promise<BakeryDetailType | null> {
    if (!uid) return null;

    try {
      setLoading(true);
      setError("");

      const data = await apiGet(API.bakerByUid(uid));

      if (!data?.ok || !data?.bakery) {
        setBakery(null);
        setError(data?.message || "Fırın bilgisi alınamadı");
        return null;
      }

      const mapped = mapBakeryResponse(data.bakery);
      setBakery(mapped);
      return mapped;
    } catch (e: any) {
      setBakery(null);
      setError(e?.message || "Fırın bilgisi alınamadı");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadTodaySummary(currentUid: string) {
  const targetUid = String(
    currentUid || bakery?.uid || bakery?.id || uid || ""
  ).trim();

  if (!targetUid) {
    setTodaySummary(emptyTodaySummary);
    return;
  }

  try {
    const API_BASE = import.meta.env.VITE_API_URL;
    const url = `${API_BASE}/baker/${targetUid}/today-summary`;

    console.log("TODAY SUMMARY URL:", url);

    const response = await fetch(url);
    const json = await response.json();

    console.log("TODAY SUMMARY RESPONSE:", json);

    if (response.ok && json?.ok) {
      const summary = json?.data || {};

      setTodaySummary({
        incomingEkmek: Number(summary?.incomingEkmek || 0),
        deliveredEkmek: Number(summary?.deliveredEkmek || 0),
        incomingPide: Number(summary?.incomingPide || 0),
        deliveredPide: Number(summary?.deliveredPide || 0),
      });

      return;
    }

    console.warn("today-summary response not ok:", json);
    setTodaySummary(emptyTodaySummary);
  } catch (err) {
    console.log("today-summary fetch hatası:", err);
    setTodaySummary(emptyTodaySummary);
  }
}

  async function loadTransactions() {
    if (!uid) return;

    try {
      setTransactionsLoading(true);
      setError("");

      const data = await apiGet(API.bakerTransactionsByUid(uid));

      if (!data?.ok) {
        setError(data?.message || "İşlem geçmişi alınamadı");
        return;
      }

      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
    } catch (e: any) {
      setError(e?.message || "İşlem geçmişi alınamadı");
    } finally {
      setTransactionsLoading(false);
    }
  }


  async function updateBakery() {
    if (!bakery || !uid) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const targetId = bakery.uid || bakery.id || uid;

      const data = await apiPut(API.bakerByUid(targetId), {
        name: bakery.name || "",
        bakeryName: bakery.bakeryName || "",
        email: bakery.email || "",
        phone: bakery.phone || "",
        city: bakery.city || "",
        district: bakery.district || "",
        neighborhood: bakery.neighborhood || "",
        isActive: !!bakery.isActive,
      });

      console.log("UPDATE RESPONSE:", data);

      if (data?.ok === false) {
        setError(data?.message || "Fırın güncellenemedi");
        return;
      }

      const loadedBakery = await loadBakery();
      const summaryUid = loadedBakery?.uid || loadedBakery?.id || uid;

      if (summaryUid) {
        await loadTodaySummary(summaryUid);
      }

      setSuccess("Fırın bilgileri başarıyla güncellendi.");
    } catch (e: any) {
      setError(e?.message || "Güncelleme hatası oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function addBread() {
    if (!bakery?.uid) return;

    try {
      setBreadBusy(true);
      setError("");

      const count = Number(breadCount);

      if (!count || count <= 0) {
        setError("Geçerli bir ekmek adedi girin.");
        return;
      }

      const data = await apiPost(API.addBreadToBaker, {
        uid: bakery.uid,
        productType: "ekmek",
        count,
        source: "admin-panel",
      });

      if (!data?.ok) {
        setError(data?.message || "Fırına ekmek eklenemedi");
        return;
      }

      setSuccess(`${count} adet ekmek fırına eklendi.`);
      setBreadCount(1);

      const loadedBakery = await loadBakery();
      const summaryUid = loadedBakery?.uid || loadedBakery?.id || uid;
      if (summaryUid) {
        await loadTodaySummary(summaryUid);
      }

      if (activeTab === "transactions") {
        await loadTransactions();
      }
    } catch (e: any) {
      setError(e?.message || "Ekmek ekleme işlemi başarısız oldu");
    } finally {
      setBreadBusy(false);
    }
  }

  async function saveProducts() {
    if (!bakery || !uid) return;

    try {
      setProductsSaving(true);
      setError("");
      setSuccess("");

      const products = Array.isArray(bakery.products) ? bakery.products : [];

      const cleaned = products.map((item, index) => ({
        id: item.id || `product_${index + 1}`,
        name: String(item.name || "").trim(),
        price: Number(item.price || 0),
        isActive: !!item.isActive,
      }));

      const hasEmptyName = cleaned.some((item) => !item.name);
      if (hasEmptyName) {
        setError("Ürün adı boş bırakılamaz.");
        return;
      }

      const data = await apiPut(API.bakerProductsByUid(uid), {
        products: cleaned,
      });

      if (!data?.ok) {
        setError(data?.message || "Ürünler güncellenemedi");
        return;
      }

      setSuccess("Fırın ürünleri güncellendi.");

      const loadedBakery = await loadBakery();
      const summaryUid = loadedBakery?.uid || loadedBakery?.id || uid;
      if (summaryUid) {
        await loadTodaySummary(summaryUid);
      }
    } catch (e: any) {
      setError(e?.message || "Ürünler kaydedilemedi");
    } finally {
      setProductsSaving(false);
    }
  }

  async function resetPassword() {
    if (!bakery?.uid) return;

    try {
      setPasswordSaving(true);
      setError("");
      setSuccess("");

      if (!newPassword || newPassword.length < 6) {
        setError("Yeni şifre en az 6 karakter olmalıdır.");
        return;
      }

      const data = await apiPost(API.bakerResetPassword, {
        uid: bakery.uid,
        newPassword,
      });

      if (!data?.ok) {
        setError(data?.message || "Şifre güncellenemedi");
        return;
      }

      setSuccess("Fırıncı şifresi güncellendi.");
      setNewPassword("");
    } catch (e: any) {
      setError(e?.message || "Şifre güncellenirken hata oluştu");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteBakery() {
    if (!bakery?.uid) return;

    const ok = window.confirm(
      `${displayName} adlı fırını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!ok) return;

    try {
      setDeleteBusy(true);
      setError("");
      setSuccess("");

      const data = await apiDelete(API.bakerByUid(bakery.uid));

      if (!data?.ok) {
        setError(data?.message || "Fırın silinemedi");
        return;
      }

      navigate("/admin/bakeries");
    } catch (e: any) {
      setError(e?.message || "Silme işlemi başarısız oldu");
    } finally {
      setDeleteBusy(false);
    }
  }

  function updateField<K extends keyof BakeryDetailType>(
    field: K,
    value: BakeryDetailType[K]
  ) {
    setBakery((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  }

  function addProductRow() {
    setBakery((prev) => {
      if (!prev) return prev;
      const next = Array.isArray(prev.products) ? [...prev.products] : [];
      next.push({
        id: `product_${Date.now()}`,
        name: "",
        price: 0,
        isActive: true,
      });
      return {
        ...prev,
        products: next,
      };
    });
  }

  function removeProductRow(index: number) {
    setBakery((prev) => {
      if (!prev) return prev;
      const next = Array.isArray(prev.products) ? [...prev.products] : [];
      next.splice(index, 1);
      return {
        ...prev,
        products: next,
      };
    });
  }

  function updateProduct(index: number, field: keyof BakeryProduct, value: any) {
    setBakery((prev) => {
      if (!prev) return prev;
      const next = Array.isArray(prev.products) ? [...prev.products] : [];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return {
        ...prev,
        products: next,
      };
    });
  }

  function formatDate(value: any) {
    try {
      if (!value) return "-";
      if (value?.toDate) return value.toDate().toLocaleString("tr-TR");
      if (value?.seconds) {
        return new Date(value.seconds * 1000).toLocaleString("tr-TR");
      }
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("tr-TR");
      }
      return String(value || "-");
    } catch {
      return "-";
    }
  }

  function mapType(type: string) {
    const safeType = String(type || "").toLowerCase();

    if (safeType === "incoming_bread") return "Ekmek Girişi";
    if (safeType === "give_bread") return "Askıdan Verildi";
    if (safeType === "admin-add-bread") return "Admin Ekmek Ekledi";
    if (safeType === "admin-add-pide") return "Admin Pide Ekledi";
    if (safeType === "baker-deliver-bread") return "Askıdan Ekmek Verildi";
    if (safeType === "mobile-payment") return "Mobil Ödeme Tamamlandı";
    if (safeType === "mobile-payment-pide") return "Mobil Pide Ödemesi";
    if (safeType === "odeme-tamamlandi") return "Ödeme Tamamlandı";
    if (safeType === "payment-complete") return "Ödeme Tamamlandı";
    if (safeType === "askiya-ekmek-birakildi") return "Askıya Ekmek Bırakıldı";
    if (safeType === "askidan-ekmek-verildi") return "Askıdan Ekmek Verildi";
    if (safeType === "askidan-pide-verildi") return "Askıdan Pide Verildi";

    return type || "-";
  }

  if (loading) {
    return <div style={loadingCardStyle}>Yükleniyor...</div>;
  }

  if (!bakery) {
    return (
      <div>
        <div style={topBarStyle}>
          <button onClick={() => navigate("/admin/bakeries")} style={ghostButtonStyle}>
            ← Fırınlara Dön
          </button>
        </div>

        <div style={errorBoxStyle}>{error || "Fırın bulunamadı."}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={topBarStyle}>
        <button onClick={() => navigate("/admin/bakeries")} style={ghostButtonStyle}>
          ← Fırınlara Dön
        </button>
      </div>

      <div style={heroCardStyle}>
        <div>
          <h1 style={heroTitleStyle}>{displayName}</h1>
          <p style={heroSubStyle}>{locationText || "Konum bilgisi eklenmemiş"}</p>

          <div style={badgeRowStyle}>
            <span
              style={{
                ...statusBadgeStyle,
                background: bakery.isActive ? "#ecfdf5" : "#fef2f2",
                color: bakery.isActive ? "#065f46" : "#7f1d1d",
                border: bakery.isActive
                  ? "1px solid #10b981"
                  : "1px solid #ef4444",
              }}
            >
              {bakery.isActive ? "Aktif" : "Pasif"}
            </span>

            <span style={neutralBadgeStyle}>UID: {bakery.uid || bakery.id}</span>
            <span style={neutralBadgeStyle}>Rol: {bakery.role || "baker"}</span>
          </div>
        </div>

        <div style={heroStatsGridStyle}>
          <MiniStat title="Bugün Gelen" value={Number(todaySummary.incomingEkmek || 0)} />
          <MiniStat title="Toplam Gelen" value={Number(bakery.totalIncomingBread || 0)} />
          <MiniStat title="Askıda Kalan" value={Number(bakery.suspendedBread || 0)} />
          <MiniStat title="Bugün Verilen" value={Number(todaySummary.deliveredEkmek || 0)} />
          <MiniStat title="Toplam Verilen" value={Number(bakery.totalGivenBread || 0)} />
        </div>
      </div>

      {success && <div style={successBoxStyle}>{success}</div>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      <div style={tabsRowStyle}>
        <TabButton
          label="Genel Bilgiler"
          active={activeTab === "general"}
          onClick={() => setActiveTab("general")}
        />
        <TabButton
          label="Ekmek İşlemleri"
          active={activeTab === "bread"}
          onClick={() => setActiveTab("bread")}
        />
        <TabButton
          label="İşlem Geçmişi"
          active={activeTab === "transactions"}
          onClick={() => setActiveTab("transactions")}
        />
        <TabButton
          label="Ürünler"
          active={activeTab === "products"}
          onClick={() => setActiveTab("products")}
        />
        <TabButton
          label="Şifre Yönetimi"
          active={activeTab === "password"}
          onClick={() => setActiveTab("password")}
        />
        <TabButton
          label="Tehlikeli İşlemler"
          active={activeTab === "danger"}
          onClick={() => setActiveTab("danger")}
        />
      </div>

      {activeTab === "general" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Fırın Bilgileri</h2>
            <p style={sectionDescStyle}>
              Yetkili kişi, email, telefon ve konum bilgilerini buradan düzenleyebilirsin.
            </p>
          </div>

          <div style={formGridStyle}>
            <FieldBlock label="Fırın Adı">
              <input
                value={bakery.bakeryName || ""}
                onChange={(e) => updateField("bakeryName", e.target.value)}
                style={inputStyle}
                placeholder="Fırın adı"
              />
            </FieldBlock>

            <FieldBlock label="Yetkili Kişi">
              <input
                value={bakery.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                style={inputStyle}
                placeholder="Yetkili kişi"
              />
            </FieldBlock>

            <FieldBlock label="Email">
              <input
                value={bakery.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                style={inputStyle}
                placeholder="Email"
              />
            </FieldBlock>

            <FieldBlock label="Cep Telefonu">
              <input
                value={bakery.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                style={inputStyle}
                placeholder="Cep telefonu"
              />
            </FieldBlock>

            <FieldBlock label="İl">
              <input
                value={bakery.city || ""}
                onChange={(e) => updateField("city", e.target.value)}
                style={inputStyle}
                placeholder="İl"
              />
            </FieldBlock>

            <FieldBlock label="İlçe">
              <input
                value={bakery.district || ""}
                onChange={(e) => updateField("district", e.target.value)}
                style={inputStyle}
                placeholder="İlçe"
              />
            </FieldBlock>

            <FieldBlock label="Mahalle">
              <input
                value={bakery.neighborhood || ""}
                onChange={(e) => updateField("neighborhood", e.target.value)}
                style={inputStyle}
                placeholder="Mahalle"
              />
            </FieldBlock>

            <FieldBlock label="Durum">
              <label style={switchRowStyle}>
                <input
                  type="checkbox"
                  checked={!!bakery.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                />
                <span style={{ color: "#111827", fontWeight: 600 }}>
                  {bakery.isActive ? "Aktif" : "Pasif"}
                </span>
              </label>
            </FieldBlock>
          </div>

          <div style={actionRowStyle}>
            <button onClick={updateBakery} disabled={saving} style={primaryButtonStyle}>
              {saving ? "Kaydediliyor..." : "Bilgileri Güncelle"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "bread" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Ekmek İşlemleri</h2>
            <p style={sectionDescStyle}>
              Bu alandan admin olarak fırına ekmek ekleyebilirsin.
            </p>
          </div>

          <div style={breadPanelStyle}>
            <div style={breadInputWrapStyle}>
              <label style={fieldLabelStyle}>Eklenecek Ekmek Adedi</label>
              <input
                type="number"
                min={1}
                value={breadCount}
                onChange={(e) => setBreadCount(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <button onClick={addBread} disabled={breadBusy} style={primaryButtonStyle}>
              {breadBusy ? "Ekleniyor..." : "Fırına Ekmek Ekle"}
            </button>
          </div>

          <div style={statsGridStyle}>
            <BigStatCard title="Bugün Gelen Ekmek" value={Number(todaySummary.incomingEkmek || 0)} />
            <BigStatCard title="Toplam Gelen Ekmek" value={Number(bakery.totalIncomingBread || 0)} />
            <BigStatCard title="Askıda Kalan Ekmek" value={Number(bakery.suspendedBread || 0)} />
            <BigStatCard title="Bugün Verilen Ekmek" value={Number(todaySummary.deliveredEkmek || 0)} />
            <BigStatCard title="Toplam Verilen Ekmek" value={Number(bakery.totalGivenBread || 0)} />
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>İşlem Geçmişi</h2>
            <p style={sectionDescStyle}>
              Bu fırına ait son işlemler burada listelenir.
            </p>
          </div>

          {transactionsLoading ? (
            <div style={loadingCardStyle}>İşlem geçmişi yükleniyor...</div>
          ) : transactions.length === 0 ? (
            <div style={emptyCardStyle}>Henüz işlem kaydı bulunmuyor.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {transactions.map((item) => (
                <div key={item.id} style={transactionCardStyle}>
                  <div style={transactionTopStyle}>
                    <strong style={{ color: "#111827" }}>{mapType(item.type)}</strong>
                    <span style={neutralBadgeStyle}>{item.source || "-"}</span>
                  </div>

                  <div style={transactionGridStyle}>
                    <InfoMini label="Adet" value={String(item.count)} />
                    <InfoMini label="Ürün" value={item.productType || "-"} />
                    <InfoMini label="Not" value={item.note || "-"} />
                    <InfoMini label="Oluşturan UID" value={item.createdByUid || "-"} />
                    <InfoMini label="Tarih" value={formatDate(item.createdAt)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Fırın Ürünleri</h2>
            <p style={sectionDescStyle}>
              Bu fırına özel ürünleri ve fiyatlarını yönetebilirsin. Mobil tarafta da bu kayıtlar kullanılabilir.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {(bakery.products || []).map((product, index) => (
              <div key={product.id || index} style={productRowStyle}>
                <input
                  value={product.name || ""}
                  onChange={(e) => updateProduct(index, "name", e.target.value)}
                  style={inputStyle}
                  placeholder="Ürün adı"
                />

                <input
                  type="number"
                  min={0}
                  value={Number(product.price || 0)}
                  onChange={(e) => updateProduct(index, "price", Number(e.target.value))}
                  style={inputStyle}
                  placeholder="Fiyat"
                />

                <label style={switchRowStyle}>
                  <input
                    type="checkbox"
                    checked={!!product.isActive}
                    onChange={(e) => updateProduct(index, "isActive", e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Aktif</span>
                </label>

                <button
                  onClick={() => removeProductRow(index)}
                  style={smallDangerButtonStyle}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={addProductRow} style={ghostButtonStyle}>
              + Yeni Ürün Ekle
            </button>

            <button
              onClick={saveProducts}
              disabled={productsSaving}
              style={primaryButtonStyle}
            >
              {productsSaving ? "Kaydediliyor..." : "Ürünleri Kaydet"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "password" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Şifre Yönetimi</h2>
            <p style={sectionDescStyle}>
              Admin olarak bu fırıncı hesabı için yeni şifre belirleyebilirsin.
            </p>
          </div>

          <div style={passwordPanelStyle}>
            <div style={breadInputWrapStyle}>
              <label style={fieldLabelStyle}>Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
                placeholder="En az 6 karakter"
              />
            </div>

            <button
              onClick={resetPassword}
              disabled={passwordSaving}
              style={primaryButtonStyle}
            >
              {passwordSaving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "danger" && (
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Tehlikeli İşlemler</h2>
            <p style={sectionDescStyle}>
              Bu bölümdeki işlemler geri alınamaz. Fırın silinirse admin panelden de kaybolur ve giriş hesabı da kaldırılmaya çalışılır.
            </p>
          </div>

          <div style={dangerCardStyle}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8, color: "#7f1d1d" }}>
                Fırını Kalıcı Olarak Sil
              </h3>
              <p style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.6 }}>
                Bu işlem fırın kaydını siler. İlgili giriş hesabı da kaldırılmaya çalışılır.
                Liste sayfasında da artık görünmez.
              </p>
            </div>

            <button
              onClick={deleteBakery}
              disabled={deleteBusy}
              style={dangerButtonStyle}
            >
              {deleteBusy ? "Siliniyor..." : "Fırını Sil"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        border: active ? "1px solid #111827" : "1px solid #e5e7eb",
        background: active ? "#111827" : "#ffffff",
        color: active ? "#ffffff" : "#111827",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div style={miniStatStyle}>
      <div style={miniStatTitleStyle}>{title}</div>
      <div style={miniStatValueStyle}>{value}</div>
    </div>
  );
}

function BigStatCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={bigStatCardStyle}>
      <div style={bigStatTitleStyle}>{title}</div>
      <div style={bigStatValueStyle}>{value}</div>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: 16,
};

const ghostButtonStyle: CSSProperties = {
  padding: "10px 14px",
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const heroCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 20,
  marginBottom: 16,
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 32,
  color: "#111827",
};

const heroSubStyle: CSSProperties = {
  marginTop: 8,
  marginBottom: 14,
  fontSize: 15,
  color: "#6b7280",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const statusBadgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const neutralBadgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#374151",
};

const heroStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  alignSelf: "start",
};

const miniStatStyle: CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
};

const miniStatTitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
};

const miniStatValueStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
};

const successBoxStyle: CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #10b981",
  color: "#065f46",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
};

const errorBoxStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #ef4444",
  color: "#7f1d1d",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
};

const loadingCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  color: "#374151",
};

const emptyCardStyle: CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  color: "#374151",
};

const tabsRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const sectionHeaderStyle: CSSProperties = {
  marginBottom: 20,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#111827",
};

const sectionDescStyle: CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: "#6b7280",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const fieldLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
};

const switchRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 46,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 16px",
  background: "#111827",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

const breadPanelStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 24,
};

const passwordPanelStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const breadInputWrapStyle: CSSProperties = {
  width: 260,
  maxWidth: "100%",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const bigStatCardStyle: CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};

const bigStatTitleStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 8,
};

const bigStatValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#111827",
};

const transactionCardStyle: CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};

const transactionTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap",
};

const transactionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const productRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto auto",
  gap: 10,
  alignItems: "center",
};

const smallDangerButtonStyle: CSSProperties = {
  padding: "10px 12px",
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerCardStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #ef4444",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const dangerButtonStyle: CSSProperties = {
  padding: "14px 16px",
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};