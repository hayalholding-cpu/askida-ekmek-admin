import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/firebase";

const ISTANBUL_CITY_NAME = "İstanbul";

type DistrictDoc = {
  id: string;
  cityCode?: number;
  districtName?: string;
  slug?: string;
  sort?: number;
};

type NeighborhoodDoc = {
  id: string;
  cityCode?: number;
  districtSlug?: string;
  districtName?: string;
  neighborhoodName?: string;
  slug?: string;
};

type BakeryDoc = {
  id: string;
  uid?: string;

  name?: string;
  bakeryName?: string;
  email?: string;
  phone?: string;
  address?: string;

  city?: string;
  district?: string;
  neighborhood?: string;

  citySlug?: string;
  districtSlug?: string;
  neighborhoodSlug?: string;

  bakeryCode?: string;
  bakeryPassword?: string;

  isActive?: boolean;
  role?: string;
  source?: string;

  createdAt?: any;
  updatedAt?: any;
};

type EditFormType = {
  name: string;
  bakeryName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  neighborhood: string;
  districtSlug: string;
  neighborhoodSlug: string;
  isActive: boolean;
  bakeryCode: string;
  bakeryPassword: string;
};

function toSlug(value = "") {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Bakeries() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [districts, setDistricts] = useState<DistrictDoc[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDoc[]>([]);
  const [bakeries, setBakeries] = useState<BakeryDoc[]>([]);

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingBakeries, setLoadingBakeries] = useState(false);

  const [editingId, setEditingId] = useState("");

  const [form, setForm] = useState<EditFormType>({
    name: "",
    bakeryName: "",
    email: "",
    phone: "",
    address: "",
    city: ISTANBUL_CITY_NAME,
    district: "",
    neighborhood: "",
    districtSlug: "",
    neighborhoodSlug: "",
    isActive: true,
    bakeryCode: "",
    bakeryPassword: "",
  });

  const selectedDistrict = useMemo(
    () => districts.find((d) => d.slug === form.districtSlug) || null,
    [districts, form.districtSlug]
  );

  const filteredNeighborhoods = useMemo(() => {
    return neighborhoods
      .filter((n) => n.districtSlug === form.districtSlug)
      .sort((a, b) =>
        String(a.neighborhoodName || "").localeCompare(
          String(b.neighborhoodName || ""),
          "tr"
        )
      );
  }, [neighborhoods, form.districtSlug]);

  const selectedNeighborhood = useMemo(
    () =>
      filteredNeighborhoods.find((n) => n.slug === form.neighborhoodSlug) || null,
    [filteredNeighborhoods, form.neighborhoodSlug]
  );

  const resetForm = () => {
    setEditingId("");
    setForm({
      name: "",
      bakeryName: "",
      email: "",
      phone: "",
      address: "",
      city: ISTANBUL_CITY_NAME,
      district: "",
      neighborhood: "",
      districtSlug: "",
      neighborhoodSlug: "",
      isActive: true,
      bakeryCode: "",
      bakeryPassword: "",
    });
    setErr("");
    setInfo("");
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingDistricts(true);
      setErr("");

      try {
        const snap = await getDocs(collection(db, "districts"));

        const list: DistrictDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (
            data?.districtName &&
            data?.slug &&
            String(data?.cityName || "İstanbul").trim() === ISTANBUL_CITY_NAME
          ) {
            list.push({
              id: d.id,
              ...data,
            });
          }
        });

        list.sort(
          (a, b) =>
            Number(a.sort ?? 9999) - Number(b.sort ?? 9999) ||
            String(a.districtName || "").localeCompare(
              String(b.districtName || ""),
              "tr"
            )
        );

        if (!cancelled) {
          setDistricts(list);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "İlçeler yüklenemedi.");
      } finally {
        if (!cancelled) setLoadingDistricts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingNeighborhoods(true);
      setErr("");

      try {
        const snap = await getDocs(collection(db, "neighborhoods"));

        const list: NeighborhoodDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (
            data?.neighborhoodName &&
            data?.slug &&
            String(data?.districtSlug || "").trim()
          ) {
            list.push({
              id: d.id,
              ...data,
            });
          }
        });

        if (!cancelled) {
          setNeighborhoods(list);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Mahalleler yüklenemedi.");
      } finally {
        if (!cancelled) setLoadingNeighborhoods(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const reloadBakeries = async () => {
    setLoadingBakeries(true);
    setErr("");

    try {
      const qRef = query(collection(db, "bakeries"), orderBy("name", "asc"));
      const snap = await getDocs(qRef);

      const list: BakeryDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;

        if (
          String(data?.city || "").trim() === ISTANBUL_CITY_NAME ||
          String(data?.citySlug || "").trim() === "istanbul"
        ) {
          list.push({
            id: d.id,
            ...data,
          });
        }
      });

      list.sort((a, b) =>
        String(a.name || a.bakeryName || "").localeCompare(
          String(b.name || b.bakeryName || ""),
          "tr"
        )
      );

      setBakeries(list);
    } catch (e: any) {
      setErr(e?.message || "Fırınlar yüklenemedi.");
    } finally {
      setLoadingBakeries(false);
    }
  };

  useEffect(() => {
    reloadBakeries();
  }, []);

  const startEdit = (b: BakeryDoc) => {
    setEditingId(b.id);
    setErr("");
    setInfo("");

    setForm({
      name: b.name || b.bakeryName || "",
      bakeryName: b.bakeryName || b.name || "",
      email: b.email || "",
      phone: b.phone || "",
      address: b.address || "",
      city: b.city || ISTANBUL_CITY_NAME,
      district: b.district || "",
      neighborhood: b.neighborhood || "",
      districtSlug: b.districtSlug || "",
      neighborhoodSlug: b.neighborhoodSlug || "",
      isActive: Boolean(b.isActive),
      bakeryCode: b.bakeryCode || "",
      bakeryPassword: b.bakeryPassword || "",
    });
  };

  const softToggleActive = async (b: BakeryDoc, nextValue: boolean) => {
    const ok = window.confirm(
      nextValue
        ? `"${b.name || b.bakeryName || "Adsız"}" fırınını aktif yapalım mı?`
        : `"${b.name || b.bakeryName || "Adsız"}" fırınını pasif yapalım mı?\n\nPasif olursa mobilde görünmez.`
    );

    if (!ok) return;

    setBusy(true);
    setErr("");
    setInfo("");

    try {
      await updateDoc(doc(db, "bakeries", b.id), {
        isActive: nextValue,
        updatedAt: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, "users", b.id), {
          isActive: nextValue,
          updatedAt: serverTimestamp(),
        });
      } catch {
      }

      setInfo(
        nextValue
          ? "Fırın aktif yapıldı."
          : "Fırın pasif yapıldı. Mobilde görünmez."
      );

      if (editingId === b.id) {
        setForm((prev) => ({ ...prev, isActive: nextValue }));
      }

      await reloadBakeries();
    } catch (e: any) {
      setErr(e?.message || "Aktiflik güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const hardDelete = async (b: BakeryDoc) => {
    const ok = window.confirm(
      `DİKKAT!\n"${b.name || b.bakeryName || "Adsız"}" fırınını Firestore'dan kalıcı olarak silelim mi?\n\nBu işlem geri alınamaz.`
    );
    if (!ok) return;

    setBusy(true);
    setErr("");
    setInfo("");

    try {
      await deleteDoc(doc(db, "bakeries", b.id));

      try {
        await deleteDoc(doc(db, "users", b.id));
      } catch {
      }

      setInfo("Fırın Firestore'dan kalıcı olarak silindi.");
      if (editingId === b.id) resetForm();
      await reloadBakeries();
    } catch (e: any) {
      setErr(e?.message || "Fırın silinemedi.");
    } finally {
      setBusy(false);
    }
  };

  const onDistrictChange = (districtSlug: string) => {
    const district = districts.find((d) => d.slug === districtSlug);

    setForm((prev) => ({
      ...prev,
      districtSlug,
      district: district?.districtName || "",
      neighborhoodSlug: "",
      neighborhood: "",
    }));
  };

  const onNeighborhoodChange = (neighborhoodSlug: string) => {
    const neighborhood = filteredNeighborhoods.find((n) => n.slug === neighborhoodSlug);

    setForm((prev) => ({
      ...prev,
      neighborhoodSlug,
      neighborhood: neighborhood?.neighborhoodName || "",
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");

    if (!editingId) {
      setErr(
        "Yeni fırın ekleme bu ekrandan kapatıldı. Yeni fırın oluşturmak için 'Fırın Hesabı Oluştur' ekranını kullan."
      );
      return;
    }

    const resolvedName = form.name.trim() || form.bakeryName.trim();
    if (!resolvedName) {
      setErr("Fırın adı boş olamaz.");
      return;
    }

    if (!form.districtSlug) {
      setErr("İlçe seçiniz.");
      return;
    }

    if (!form.neighborhoodSlug) {
      setErr("Mahalle seçiniz.");
      return;
    }

    const resolvedDistrict = selectedDistrict?.districtName || form.district.trim();
    const resolvedNeighborhood =
      selectedNeighborhood?.neighborhoodName || form.neighborhood.trim();

    if (!resolvedDistrict) {
      setErr("İlçe bilgisi eksik.");
      return;
    }

    if (!resolvedNeighborhood) {
      setErr("Mahalle bilgisi eksik.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        name: resolvedName,
        bakeryName: resolvedName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: ISTANBUL_CITY_NAME,
        district: resolvedDistrict,
        neighborhood: resolvedNeighborhood,
        citySlug: toSlug(ISTANBUL_CITY_NAME),
        districtSlug: form.districtSlug || toSlug(resolvedDistrict),
        neighborhoodSlug: form.neighborhoodSlug || toSlug(resolvedNeighborhood),
        isActive: !!form.isActive,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "bakeries", editingId), payload);

      try {
        await updateDoc(doc(db, "users", editingId), {
          name: resolvedName,
          bakeryName: resolvedName,
          email: form.email.trim().toLowerCase(),
          city: ISTANBUL_CITY_NAME,
          district: resolvedDistrict,
          neighborhood: resolvedNeighborhood,
          citySlug: toSlug(ISTANBUL_CITY_NAME),
          districtSlug: form.districtSlug || toSlug(resolvedDistrict),
          neighborhoodSlug: form.neighborhoodSlug || toSlug(resolvedNeighborhood),
          isActive: !!form.isActive,
          updatedAt: serverTimestamp(),
        });
      } catch {
      }

      setInfo("Fırın bilgileri yeni veri standardına göre güncellendi.");
      resetForm();
      await reloadBakeries();
    } catch (e: any) {
      setErr(e?.message || "Fırın güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h2>Fırın Yönetimi</h2>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Bu ekran artık yeni fırın oluşturma ekranı değil; mevcut fırınları
        <b> düzenlemek, aktif/pasif yapmak ve veri standardına geçirmek </b>
        için kullanılır. Yeni fırın eklemek için <b>Fırın Hesabı Oluştur</b> sayfasını kullan.
      </div>

      {err ? (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 10,
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid #fecaca",
          }}
        >
          <b>Hata:</b> {err}
        </div>
      ) : null}

      {info ? (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 10,
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid #86efac",
          }}
        >
          {info}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        style={{
          border: "1px solid #ddd",
          padding: 14,
          borderRadius: 10,
          marginBottom: 18,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {editingId ? "Fırın Düzenle" : "Fırın Seçip Düzenle"}
          {editingId ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {" "}
              (doc id / uid: {editingId})
            </span>
          ) : null}
        </h3>

        {!editingId ? (
          <div
            style={{
              marginBottom: 12,
              fontSize: 14,
              color: "#666",
            }}
          >
            Aşağıdaki listeden bir fırın seçip <b>Düzenle</b> butonuna bas.
          </div>
        ) : null}

        {editingId ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
                FIRINCI KODU
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a", marginTop: 4 }}>
                {form.bakeryCode || "-"}
              </div>
            </div>

            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: "#a16207", fontWeight: 700 }}>
                FIRINCI ŞİFRESİ
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#854d0e", marginTop: 4 }}>
                {form.bakeryPassword || "-"}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Fırın adı
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                  bakeryName: e.target.value,
                }))
              }
              style={inputStyle}
              placeholder="Örn: Örnek Ekmek Fırını"
              disabled={!editingId}
            />
          </label>

          <label>
            E-posta
            <input
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              style={inputStyle}
              placeholder="ornek@firin.com"
              disabled={!editingId}
            />
          </label>

          <label>
            Telefon
            <input
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              style={inputStyle}
              placeholder="Telefon"
              disabled={!editingId}
            />
          </label>

          <label>
            İl
            <input
              value={form.city}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, city: e.target.value }))
              }
              style={inputStyle}
              disabled
            />
          </label>

          <label>
            İlçe
            <select
              value={form.districtSlug}
              onChange={(e) => onDistrictChange(e.target.value)}
              style={inputStyle}
              disabled={!editingId || loadingDistricts}
            >
              <option value="">
                {loadingDistricts ? "İlçeler yükleniyor..." : "İlçe seçin"}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.slug || ""}>
                  {d.districtName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mahalle
            <select
              value={form.neighborhoodSlug}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              style={inputStyle}
              disabled={!editingId || loadingNeighborhoods || !form.districtSlug}
            >
              <option value="">
                {loadingNeighborhoods ? "Mahalleler yükleniyor..." : "Mahalle seçin"}
              </option>
              {filteredNeighborhoods.map((n) => (
                <option key={n.id} value={n.slug || ""}>
                  {n.neighborhoodName}
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: "1 / span 2" }}>
            Adres
            <input
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
              style={inputStyle}
              placeholder="Açık adres"
              disabled={!editingId}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              disabled={!editingId}
            />{" "}
            Aktif
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            type="submit"
            disabled={busy || !editingId}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: busy || !editingId ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Kaydediliyor..." : "Güncelle"}
          </button>

          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              İptal
            </button>
          ) : null}
        </div>
      </form>

      <div>
        <h3 style={{ marginBottom: 8 }}>
          Fırın Listesi{" "}
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            ({loadingBakeries ? "yükleniyor..." : `${bakeries.length} adet`})
          </span>
        </h3>

        {loadingBakeries ? (
          <div>Yükleniyor...</div>
        ) : bakeries.length === 0 ? (
          <div>Henüz fırın yok.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {bakeries.map((b) => (
              <div
                key={b.id}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: 12,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "#fff",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {b.name || b.bakeryName || "(adsız)"}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                    {b.district || "-"} / {b.neighborhood || "-"}
                  </div>

                  {b.address ? (
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                      {b.address}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1e40af",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Fırıncı Kodu: {b.bakeryCode || "-"}
                  </div>

                  {b.bakeryPassword ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                        marginLeft: 8,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#fefce8",
                        border: "1px solid #fde68a",
                        color: "#854d0e",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Şifre: {b.bakeryPassword}
                    </div>
                  ) : null}

                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                    {b.email ? `E-posta: ${b.email} • ` : ""}
                    {b.phone ? `Telefon: ${b.phone} • ` : ""}
                    {b.isActive ? "Aktif" : "Pasif"}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    districtSlug: {b.districtSlug || "-"} • neighborhoodSlug:{" "}
                    {b.neighborhoodSlug || "-"}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>
                    doc id: {b.id}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    disabled={busy}
                    style={actionBtnStyle}
                  >
                    Düzenle
                  </button>

                  {b.isActive ? (
                    <button
                      type="button"
                      onClick={() => softToggleActive(b, false)}
                      disabled={busy}
                      style={actionBtnStyle}
                    >
                      Pasif Yap
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => softToggleActive(b, true)}
                      disabled={busy}
                      style={actionBtnStyle}
                    >
                      Aktif Yap
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => hardDelete(b)}
                    disabled={busy}
                    style={{
                      ...actionBtnStyle,
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    Kalıcı Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  marginTop: 6,
  boxSizing: "border-box",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};