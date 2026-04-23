import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API, apiDelete, apiGet, apiPost, apiPut } from "./lib/api";

type BakeryItem = {
  id: string;
  uid?: string;
  bakeryName?: string;
  email?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  citySlug?: string;
  districtSlug?: string;
  neighborhoodSlug?: string;
  bakeryCode?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

type MigrationPreviewItem = {
  id: string;
  bakeryName: string;
  uid: string;
  email: string;
  current: {
    city: string;
    district: string;
    neighborhood: string;
    citySlug: string;
    districtSlug: string;
    neighborhoodSlug: string;
    isActive: boolean | undefined;
  };
  next: {
    city: string;
    district: string;
    neighborhood: string;
    citySlug: string;
    districtSlug: string;
    neighborhoodSlug: string;
    isActive: boolean;
  };
  flags: {
    needsCity: boolean;
    needsDistrict: boolean;
    needsNeighborhood: boolean;
    needsCitySlug: boolean;
    needsDistrictSlug: boolean;
    needsNeighborhoodSlug: boolean;
    needsIsActive: boolean;
    missingLocation: boolean;
    docIdMatchesUid: boolean;
    needsAnyUpdate: boolean;
  };
};

type MigrationPreviewResponse = {
  ok: boolean;
  total: number;
  needsAnyUpdateCount: number;
  missingSlugCount: number;
  missingIsActiveCount: number;
  missingLocationCount: number;
  docIdMismatchCount: number;
  items: MigrationPreviewItem[];
  message?: string;
  error?: string;
};

type MigrationApplyResponse = {
  ok: boolean;
  message: string;
  totalUpdated: number;
  results: Array<{
    id: string;
    bakeryName: string;
    uid: string;
    updated: boolean;
    missingLocation: boolean;
    docIdMatchesUid: boolean;
    applied: {
      city: string;
      district: string;
      neighborhood: string;
      citySlug: string;
      districtSlug: string;
      neighborhoodSlug: string;
      isActive: boolean;
    };
  }>;
  error?: string;
};

function mapBakery(item: any): BakeryItem {
  return {
    id: String(item?.id || item?.uid || ""),
    uid: item?.uid || item?.id || "",
    bakeryName: item?.bakeryName || item?.name || "",
    email: item?.email || "",
    city: item?.city || "",
    district: item?.district || "",
    neighborhood: item?.neighborhood || "",
    citySlug: item?.citySlug || "",
    districtSlug: item?.districtSlug || "",
    neighborhoodSlug: item?.neighborhoodSlug || "",
    bakeryCode: item?.bakeryCode || "",
    isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function extractBakeryList(data: any): any[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.bakeries)) return data.bakeries;
  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.records)) return data.records;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.bakeries)) return data.data.bakeries;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.records)) return data.data.records;

  return [];
}

export default function AdminBakeries() {
  const navigate = useNavigate();

  const [items, setItems] = useState<BakeryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewData, setPreviewData] = useState<MigrationPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [showOnlyProblematic, setShowOnlyProblematic] = useState(true);

  async function loadBakeries() {
    try {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

      const data = await apiGet(API.adminBakeries);

      console.log("ADMIN BAKERIES RESPONSE:", data);

      const rawList = extractBakeryList(data);
      const list = rawList.map((item: any) => mapBakery(item)).filter((item: BakeryItem) => item.id);

      setItems(list);

      if (!rawList.length) {
        console.warn("Fırın listesi boş geldi. Response yapısı beklenenden farklı olabilir:", data);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Fırın listesi alınırken hata oluştu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBakeries();
  }, []);

  async function handleToggleActive(item: BakeryItem) {
    const targetUid = item.uid || item.id;
    if (!targetUid) {
      setErrorMessage("Fırın kimliği bulunamadı.");
      return;
    }

    try {
      setBusyId(item.id);
      setMessage("");
      setErrorMessage("");

      const data = await apiPut(API.bakerByUid(targetUid), {
        isActive: !item.isActive,
      });

      if (!data?.ok) {
        setErrorMessage(data?.message || "Aktif/pasif güncelleme sırasında hata oluştu");
        return;
      }

      setMessage(
        `${item.bakeryName || "Fırın"} ${item.isActive ? "pasif" : "aktif"} yapıldı`
      );

      await loadBakeries();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Aktif/pasif güncelleme sırasında hata oluştu");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: BakeryItem) {
    const ok = window.confirm(
      `${item.bakeryName || "Bu kayıt"} kalıcı olarak silinsin mi?`
    );
    if (!ok) return;

    const targetUid = item.uid || item.id;
    if (!targetUid) {
      setErrorMessage("Fırın kimliği bulunamadı.");
      return;
    }

    try {
      setBusyId(item.id);
      setMessage("");
      setErrorMessage("");

      const data = await apiDelete(API.bakerByUid(targetUid));

      if (!data?.ok) {
        setErrorMessage(data?.message || "Silme sırasında hata oluştu");
        return;
      }

      setMessage(`${item.bakeryName || "Kayıt"} silindi`);
      await loadBakeries();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Silme sırasında hata oluştu");
    } finally {
      setBusyId(null);
    }
  }

  function openTabelaMode(bakeryId: string) {
    if (!bakeryId) {
      window.alert("Tabela modu için fırın id bulunamadı.");
      return;
    }

    window.open(`/tabela/${bakeryId}`, "_blank");
  }

  async function handleMigrationPreview() {
    try {
      setPreviewLoading(true);
      setPreviewError("");
      setApplyMessage("");
      setPreviewData(null);

      const data: MigrationPreviewResponse = await apiGet(API.migrateBakeriesPreview);

      if (!data?.ok) {
        setPreviewError(data?.message || data?.error || "Preview alınamadı");
        return;
      }

      setPreviewData(data);
    } catch (error: any) {
      console.error(error);
      setPreviewError(
        error?.message || "Migration preview sırasında bağlantı hatası oluştu"
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleMigrationApply() {
    const ok = window.confirm(
      "Migration işlemi çalıştırılsın mı? Eski bakery kayıtları yeni standarda göre güncellenecek."
    );
    if (!ok) return;

    try {
      setApplyLoading(true);
      setPreviewError("");
      setApplyMessage("");

      const data: MigrationApplyResponse = await apiPost(API.migrateBakeriesApply, {});

      if (!data?.ok) {
        setPreviewError(data?.message || data?.error || "Migration apply başarısız");
        return;
      }

      setApplyMessage(`${data.totalUpdated} kayıt başarıyla migrate edildi`);

      await handleMigrationPreview();
      await loadBakeries();
    } catch (error: any) {
      console.error(error);
      setPreviewError(
        error?.message || "Migration apply sırasında bağlantı hatası oluştu"
      );
    } finally {
      setApplyLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    let list = [...items];

    if (statusFilter === "active") {
      list = list.filter((x) => x.isActive === true);
    }

    if (statusFilter === "passive") {
      list = list.filter((x) => x.isActive === false);
    }

    const q = search.trim().toLocaleLowerCase("tr-TR");

    if (q) {
      list = list.filter((x) => {
        const text = [
          x.bakeryName,
          x.email,
          x.city,
          x.district,
          x.neighborhood,
          x.citySlug,
          x.districtSlug,
          x.neighborhoodSlug,
          x.bakeryCode,
          x.id,
          x.uid,
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");

        return text.includes(q);
      });
    }

    return list;
  }, [items, search, statusFilter]);

  const previewItems = useMemo(() => {
    if (!previewData?.items) return [];

    if (!showOnlyProblematic) return previewData.items;

    return previewData.items.filter(
      (item) =>
        item.flags.needsAnyUpdate ||
        item.flags.missingLocation ||
        !item.flags.docIdMatchesUid
    );
  }, [previewData, showOnlyProblematic]);

  return (
    <div
      style={{
        padding: 24,
        background: "#f4f6f8",
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            color: "#111827",
          }}
        >
          Fırın Yönetimi
        </h1>

        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          Fırınları listele, detayına gir, düzenle, aktif/pasif yap, sil ve migration kontrolü yap.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          marginBottom: 20,
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: "#111827",
            }}
          >
            Migration Araçları
          </h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleMigrationPreview}
              disabled={previewLoading || applyLoading}
              style={darkButtonStyle}
            >
              {previewLoading ? "Preview alınıyor..." : "Migration Preview"}
            </button>

            <button
              onClick={handleMigrationApply}
              disabled={applyLoading || previewLoading}
              style={warningButtonStyle}
            >
              {applyLoading ? "Migration çalışıyor..." : "Migration Apply"}
            </button>
          </div>
        </div>

        <p
          style={{
            marginTop: 0,
            color: "#6b7280",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Önce preview al. Sonra eksik slug, eksik isActive ve konum alanlarını tek seferde yeni standarda geçir.
        </p>

        {previewError ? (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              fontWeight: 600,
            }}
          >
            {previewError}
          </div>
        ) : null}

        {applyMessage ? (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              fontWeight: 700,
            }}
          >
            {applyMessage}
          </div>
        ) : null}

        {previewData ? (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Toplam Kayıt</div>
                <div style={summaryValueStyle}>{previewData.total}</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Güncellenecek</div>
                <div style={summaryValueStyle}>{previewData.needsAnyUpdateCount}</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Eksik Slug</div>
                <div style={summaryValueStyle}>{previewData.missingSlugCount}</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Eksik isActive</div>
                <div style={summaryValueStyle}>{previewData.missingIsActiveCount}</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>Eksik Konum</div>
                <div style={summaryValueStyle}>{previewData.missingLocationCount}</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryLabelStyle}>DocId / UID Uyuşmazlık</div>
                <div style={summaryValueStyle}>{previewData.docIdMismatchCount}</div>
              </div>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 14,
              }}
            >
              <input
                type="checkbox"
                checked={showOnlyProblematic}
                onChange={(e) => setShowOnlyProblematic(e.target.checked)}
              />
              Sadece problemli kayıtları göster
            </label>

            <div
              style={{
                maxHeight: 380,
                overflow: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1100,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "Fırın",
                      "İlçe",
                      "Mahalle",
                      "districtSlug",
                      "neighborhoodSlug",
                      "isActive",
                      "Eksik Konum",
                      "DocId=UID",
                      "Güncellenecek",
                    ].map((head) => (
                      <th
                        key={head}
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: 13,
                          color: "#374151",
                          position: "sticky",
                          top: 0,
                          background: "#f9fafb",
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 16,
                          color: "#6b7280",
                        }}
                      >
                        Gösterilecek preview kaydı yok.
                      </td>
                    </tr>
                  ) : (
                    previewItems.map((item) => (
                      <tr key={item.id}>
                        <td style={cellStyle}>
                          <div style={{ fontWeight: 700, color: "#111827" }}>
                            {item.bakeryName || "-"}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {item.email || "-"}
                          </div>
                        </td>
                        <td style={cellStyle}>{item.next.district || "-"}</td>
                        <td style={cellStyle}>{item.next.neighborhood || "-"}</td>
                        <td style={cellStyle}>{item.next.districtSlug || "-"}</td>
                        <td style={cellStyle}>{item.next.neighborhoodSlug || "-"}</td>
                        <td style={cellStyle}>
                          {item.next.isActive ? "true" : "false"}
                        </td>
                        <td style={cellStyle}>
                          <span
                            style={{
                              ...badgeStyle,
                              background: item.flags.missingLocation ? "#fef2f2" : "#ecfdf5",
                              color: item.flags.missingLocation ? "#b91c1c" : "#047857",
                            }}
                          >
                            {item.flags.missingLocation ? "Eksik" : "Tamam"}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span
                            style={{
                              ...badgeStyle,
                              background: item.flags.docIdMatchesUid ? "#ecfdf5" : "#fff7ed",
                              color: item.flags.docIdMatchesUid ? "#047857" : "#c2410c",
                            }}
                          >
                            {item.flags.docIdMatchesUid ? "Eşleşiyor" : "Uyumsuz"}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span
                            style={{
                              ...badgeStyle,
                              background: item.flags.needsAnyUpdate ? "#eff6ff" : "#f3f4f6",
                              color: item.flags.needsAnyUpdate ? "#1d4ed8" : "#374151",
                            }}
                          >
                            {item.flags.needsAnyUpdate ? "Evet" : "Hayır"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: "#111827",
            }}
          >
            Fırın Listesi
          </h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fırın, kod, ilçe, mahalle, slug ara..."
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "passive")
              }
              style={inputStyle}
            >
              <option value="all">Tümü</option>
              <option value="active">Sadece aktif</option>
              <option value="passive">Sadece pasif</option>
            </select>

            <button
              onClick={loadBakeries}
              disabled={loading}
              style={blueButtonStyle}
            >
              {loading ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        {message ? (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1520,
            }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {[
                  "Fırın",
                  "Fırıncı Kodu",
                  "E-posta",
                  "İl",
                  "İlçe",
                  "Mahalle",
                  "citySlug",
                  "districtSlug",
                  "neighborhoodSlug",
                  "Durum",
                  "İşlemler",
                ].map((head) => (
                  <th
                    key={head}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 13,
                      color: "#374151",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: 18, color: "#6b7280" }}>
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 18, color: "#6b7280" }}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyleStrong}>{item.bakeryName || "-"}</td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          ...badgeStyle,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                        }}
                      >
                        {item.bakeryCode || "-"}
                      </span>
                    </td>
                    <td style={cellStyle}>{item.email || "-"}</td>
                    <td style={cellStyle}>{item.city || "-"}</td>
                    <td style={cellStyle}>{item.district || "-"}</td>
                    <td style={cellStyle}>{item.neighborhood || "-"}</td>
                    <td style={cellStyle}>{item.citySlug || "-"}</td>
                    <td style={cellStyle}>{item.districtSlug || "-"}</td>
                    <td style={cellStyle}>{item.neighborhoodSlug || "-"}</td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          ...badgeStyle,
                          background: item.isActive ? "#ecfdf5" : "#fef2f2",
                          color: item.isActive ? "#047857" : "#b91c1c",
                        }}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => navigate(`/admin/bakeries/${item.uid || item.id}`)}
                          style={darkButtonStyleSmall}
                        >
                          Detay
                        </button>

                        <button
                          onClick={() => openTabelaMode(item.id)}
                          style={{
                            ...smallButtonBaseStyle,
                            background: "#0f766e",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Tabela
                        </button>

                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={busyId === item.id}
                          style={{
                            ...smallButtonBaseStyle,
                            background: item.isActive ? "#f59e0b" : "#10b981",
                            color: "#fff",
                            cursor: busyId === item.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {busyId === item.id
                            ? "Bekleyin..."
                            : item.isActive
                            ? "Pasif Yap"
                            : "Aktif Yap"}
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          disabled={busyId === item.id}
                          style={{
                            ...smallButtonBaseStyle,
                            background: "#dc2626",
                            color: "#fff",
                            cursor: busyId === item.id ? "not-allowed" : "pointer",
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  minWidth: 220,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  background: "#fff",
};

const summaryCardStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 24,
  color: "#111827",
  fontWeight: 800,
};

const cellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
  color: "#374151",
  verticalAlign: "top",
};

const cellStyleStrong: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  color: "#111827",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const smallButtonBaseStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 700,
};

const darkButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  background: "#1f2937",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const warningButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  background: "#b45309",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const blueButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const darkButtonStyleSmall: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};