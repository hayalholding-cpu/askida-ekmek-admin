import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { API, apiPost } from "./lib/api";
import { db } from "./lib/firebase";

type FormDataType = {
  email: string;
  password: string;
  bakeryName: string;
  city: string;
  district: string;
  neighborhood: string;
  phone: string;
  address: string;
};

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
  sort?: number;
};

const ISTANBUL_CITY_CODE = 34;
const ISTANBUL_CITY_NAME = "İstanbul";
const ISTANBUL_CITY_SLUG = "istanbul";

export default function AdminCreateBaker() {
  const [formData, setFormData] = useState<FormDataType>({
    email: "",
    password: "",
    bakeryName: "",
    city: ISTANBUL_CITY_NAME,
    district: "",
    neighborhood: "",
    phone: "",
    address: "",
  });

  const [districts, setDistricts] = useState<DistrictDoc[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDoc[]>([]);
  const [districtSlug, setDistrictSlug] = useState("");
  const [neighborhoodSlug, setNeighborhoodSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [generatedBakeryCode, setGeneratedBakeryCode] = useState("");

  const selectedDistrict = useMemo(
    () => districts.find((d) => d.slug === districtSlug) || null,
    [districts, districtSlug]
  );

  const filteredNeighborhoods = useMemo(() => {
    return neighborhoods
      .filter((n) => n.districtSlug === districtSlug)
      .sort((a, b) =>
        String(a.neighborhoodName || "").localeCompare(
          String(b.neighborhoodName || ""),
          "tr"
        )
      );
  }, [neighborhoods, districtSlug]);

  const isFormValid = useMemo(() => {
    return (
      formData.email.trim() &&
      formData.password.trim().length >= 6 &&
      formData.bakeryName.trim() &&
      formData.city.trim() &&
      formData.district.trim() &&
      formData.neighborhood.trim() &&
      districtSlug.trim() &&
      neighborhoodSlug.trim()
    );
  }, [formData, districtSlug, neighborhoodSlug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingDistricts(true);
      setError("");

      try {
        const qD = query(
          collection(db, "districts"),
          where("cityCode", "==", ISTANBUL_CITY_CODE)
        );
        const snap = await getDocs(qD);

        const list: DistrictDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            cityCode: data?.cityCode,
            districtName: data?.districtName,
            slug: data?.slug,
            sort: data?.sort,
          });
        });

        const clean = list
          .filter((x) => x.slug && x.districtName)
          .sort(
            (a, b) =>
              Number(a.sort ?? 9999) - Number(b.sort ?? 9999) ||
              String(a.districtName || "").localeCompare(
                String(b.districtName || ""),
                "tr"
              )
          );

        if (!cancelled) {
          setDistricts(clean);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "İlçeler yüklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!districtSlug) {
        setNeighborhoods([]);
        setNeighborhoodSlug("");
        setFormData((prev) => ({
          ...prev,
          district: "",
          neighborhood: "",
        }));
        return;
      }

      setLoadingNeighborhoods(true);
      setError("");

      try {
        const qN = query(
          collection(db, "neighborhoods"),
          where("cityCode", "==", ISTANBUL_CITY_CODE),
          where("districtSlug", "==", districtSlug)
        );

        const snap = await getDocs(qN);

        const list: NeighborhoodDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            cityCode: data?.cityCode,
            districtSlug: data?.districtSlug,
            districtName: data?.districtName,
            neighborhoodName: data?.neighborhoodName,
            slug: data?.slug,
            sort: data?.sort,
          });
        });

        const clean = list
          .filter((x) => x.slug && x.neighborhoodName)
          .sort(
            (a, b) =>
              Number(a.sort ?? 9999) - Number(b.sort ?? 9999) ||
              String(a.neighborhoodName || "").localeCompare(
                String(b.neighborhoodName || ""),
                "tr"
              )
          );

        if (!cancelled) {
          setNeighborhoods(clean);
          setNeighborhoodSlug("");
          setFormData((prev) => ({
            ...prev,
            district: selectedDistrict?.districtName || "",
            neighborhood: "",
          }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Mahalleler yüklenemedi.");
          setNeighborhoods([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingNeighborhoods(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [districtSlug, selectedDistrict?.districtName]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleDistrictChange(value: string) {
    const district = districts.find((d) => d.slug === value) || null;

    setDistrictSlug(value);
    setNeighborhoodSlug("");
    setFormData((prev) => ({
      ...prev,
      district: district?.districtName || "",
      neighborhood: "",
    }));
  }

  function handleNeighborhoodChange(value: string) {
    const neighborhood =
      filteredNeighborhoods.find((n) => n.slug === value) || null;

    setNeighborhoodSlug(value);
    setFormData((prev) => ({
      ...prev,
      neighborhood: neighborhood?.neighborhoodName || "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");
    setGeneratedBakeryCode("");

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        bakeryName: formData.bakeryName.trim(),
        city: formData.city.trim() || ISTANBUL_CITY_NAME,
        citySlug: ISTANBUL_CITY_SLUG,
        district: formData.district.trim(),
        districtSlug,
        neighborhood: formData.neighborhood.trim(),
        neighborhoodSlug,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      };

      const data = await apiPost(API.createBakerAccount, payload);

      if (!data?.ok) {
        throw new Error(data?.message || "Fırın hesabı oluşturulamadı.");
      }

      const bakeryCode = String(
        data?.bakeryCode || data?.bakery?.bakeryCode || data?.code || ""
      ).trim();

      setMessage(data?.message || "Fırın hesabı başarıyla oluşturuldu.");
      setGeneratedBakeryCode(bakeryCode);

      if (!bakeryCode) {
        setError(
          "Fırın hesabı oluşturuldu ancak fırıncı kodu sunucu cevabında gelmedi."
        );
      }

      setFormData({
        email: "",
        password: "",
        bakeryName: "",
        city: ISTANBUL_CITY_NAME,
        district: "",
        neighborhood: "",
        phone: "",
        address: "",
      });
      setDistrictSlug("");
      setNeighborhoodSlug("");
      setNeighborhoods([]);
    } catch (err: any) {
      setError(err?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 760,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 28 }}>Fırıncı Ekle</h1>

        <p style={{ marginTop: 0, marginBottom: 24, color: "#666", lineHeight: 1.6 }}>
          Yeni fırın hesabı oluştururken ilçe ve mahalle listeden seçilir. Böylece
          veri standardı korunur ve mobil tarafta fırınlar doğru görünür.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Fırın Adı *</label>
              <input
                name="bakeryName"
                placeholder="Fırın adı"
                value={formData.bakeryName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>E-posta *</label>
              <input
                name="email"
                type="email"
                placeholder="E-posta"
                value={formData.email}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Şifre *</label>
              <input
                name="password"
                type="password"
                placeholder="Şifre (en az 6 karakter)"
                value={formData.password}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Telefon</label>
              <input
                name="phone"
                placeholder="Telefon"
                value={formData.phone}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>İl *</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                style={inputStyle}
                disabled
              />
            </div>

            <div>
              <label style={labelStyle}>İlçe *</label>
              <select
                value={districtSlug}
                onChange={(e) => handleDistrictChange(e.target.value)}
                required
                style={inputStyle}
                disabled={loadingDistricts}
              >
                <option value="">
                  {loadingDistricts ? "İlçeler yükleniyor..." : "İlçe seçin"}
                </option>
                {districts.map((district) => (
                  <option key={district.id} value={district.slug || ""}>
                    {district.districtName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Mahalle *</label>
              <select
                value={neighborhoodSlug}
                onChange={(e) => handleNeighborhoodChange(e.target.value)}
                required
                style={inputStyle}
                disabled={!districtSlug || loadingNeighborhoods}
              >
                <option value="">
                  {!districtSlug
                    ? "Önce ilçe seçin"
                    : loadingNeighborhoods
                    ? "Mahalleler yükleniyor..."
                    : "Mahalle seçin"}
                </option>
                {filteredNeighborhoods.map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.slug || ""}>
                    {neighborhood.neighborhoodName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Açık Adres</label>
            <textarea
              name="address"
              placeholder="Açık adres"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 90,
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            style={{
              padding: "14px 18px",
              border: "none",
              borderRadius: 12,
              cursor: loading || !isFormValid ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 16,
              background: loading || !isFormValid ? "#d9d9d9" : "#0f172a",
              color: "#fff",
              width: 260,
            }}
          >
            {loading ? "Oluşturuluyor..." : "Fırıncı Hesabı Oluştur"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: 16,
              color: "#166534",
              background: "#dcfce7",
              border: "1px solid #86efac",
              padding: 12,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {generatedBakeryCode && (
          <div
            style={{
              marginTop: 16,
              background: "#fff7ed",
              border: "2px solid #fdba74",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#9a3412",
                marginBottom: 8,
              }}
            >
              Oluşturulan Fırıncı Kodu
            </div>

            <div
              style={{
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: 6,
                color: "#111827",
              }}
            >
              {generatedBakeryCode}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#6b7280",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Bu kodu fırıncı giriş ekranında şifre ile birlikte kullanın.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              color: "#991b1b",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              padding: 12,
              borderRadius: 10,
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  fontSize: 14,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  boxSizing: "border-box",
  background: "#fff",
};