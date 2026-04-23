import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/firebase";

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

const API_BASE = import.meta.env.VITE_API_URL;
const ISTANBUL_CITY_CODE = 34;
const ISTANBUL_CITY_NAME = "İstanbul";

export default function BakerAccountCreate() {
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
  const [debugText, setDebugText] = useState("");

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
      formData.neighborhood.trim()
    );
  }, [formData]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingDistricts(true);

      try {
        const snap = await getDocs(collection(db, "districts"));

        const list: DistrictDoc[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          if (Number(data?.cityCode) === ISTANBUL_CITY_CODE) {
            list.push({
              id: doc.id,
              cityCode: data?.cityCode,
              districtName: data?.districtName,
              slug: data?.slug,
              sort: data?.sort,
            });
          }
        });

        const clean = list
          .filter((item) => item.slug && item.districtName)
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
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "İlçeler yüklenemedi.");
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

      try {
        const snap = await getDocs(collection(db, "neighborhoods"));

        const list: NeighborhoodDoc[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          if (
            Number(data?.cityCode) === ISTANBUL_CITY_CODE &&
            String(data?.districtSlug || "") === districtSlug
          ) {
            list.push({
              id: doc.id,
              cityCode: data?.cityCode,
              districtSlug: data?.districtSlug,
              districtName: data?.districtName,
              neighborhoodName: data?.neighborhoodName,
              slug: data?.slug,
              sort: data?.sort,
            });
          }
        });

        const clean = list
          .filter((item) => item.slug && item.neighborhoodName)
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
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Mahalleler yüklenemedi.");
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

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function findBakeryCodeBruteforce(email: string, bakeryName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedBakeryName = bakeryName.trim().toLowerCase();

    const delays = [0, 700, 1500, 2500, 3500, 5000];

    for (const delay of delays) {
      if (delay > 0) {
        await sleep(delay);
      }

      const snap = await getDocs(collection(db, "bakeries"));

      let foundCode = "";

      snap.forEach((doc) => {
        const data = doc.data() as any;

        const docEmail = String(data?.email || "").trim().toLowerCase();
        const docBakeryName = String(data?.bakeryName || "").trim().toLowerCase();
        const docCode = String(data?.bakeryCode || "").trim();

        const sameEmail = docEmail === normalizedEmail;
        const sameBakeryName = docBakeryName === normalizedBakeryName;

        if ((sameEmail || sameBakeryName) && docCode) {
          foundCode = docCode;
        }
      });

      if (foundCode) {
        return foundCode;
      }
    }

    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");
    setGeneratedBakeryCode("");
    setDebugText("");

    const submittedEmail = formData.email.trim().toLowerCase();
    const submittedBakeryName = formData.bakeryName.trim();

    try {
      const payload = {
        email: submittedEmail,
        password: formData.password.trim(),
        bakeryName: submittedBakeryName,
        city: formData.city.trim(),
        district: formData.district.trim(),
        neighborhood: formData.neighborhood.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      };

      const res = await fetch(`${API_BASE}/create-baker-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();

      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { rawText };
      }

      setDebugText(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data?.message || "Fırın hesabı oluşturulamadı.");
      }

      let code = String(
        data?.bakeryCode ||
          data?.bakery?.bakeryCode ||
          data?.code ||
          ""
      ).trim();

      if (!code) {
        code = await findBakeryCodeBruteforce(submittedEmail, submittedBakeryName);
      }

      setMessage(data?.message || "Fırın hesabı başarıyla oluşturuldu.");
      setGeneratedBakeryCode(code);

      if (!code) {
        setError(
          "Fırın hesabı oluştu ama bakeryCode yine alınamadı. Bu durumda büyük ihtimalle çalışan sayfa ya da çalışan backend beklediğimiz dosya değil."
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
    } catch (err: any) {
      setError(err?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 24,
        background: "#ffffff",
        borderRadius: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: 8,
          fontSize: 28,
          color: "#111827",
        }}
      >
        Fırın Hesabı Oluştur
      </h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: 24,
          color: "#6b7280",
          lineHeight: 1.6,
        }}
      >
        Yeni fırın hesabı oluşturduğunuzda sistem otomatik olarak 6 haneli
        fırıncı kodu üretir. Bu kod fırıncı girişinde kullanılacaktır.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <input
          name="bakeryName"
          placeholder="Fırın Adı"
          value={formData.bakeryName}
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="E-posta"
          value={formData.email}
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={formData.password}
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <input
          name="city"
          placeholder="İl"
          value={formData.city}
          onChange={handleChange}
          style={inputStyle}
          disabled
          required
        />

        <select
          value={districtSlug}
          onChange={(e) => handleDistrictChange(e.target.value)}
          style={inputStyle}
          disabled={loadingDistricts}
          required
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

        <select
          value={neighborhoodSlug}
          onChange={(e) => handleNeighborhoodChange(e.target.value)}
          style={inputStyle}
          disabled={!districtSlug || loadingNeighborhoods}
          required
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

        <input
          name="phone"
          placeholder="Telefon"
          value={formData.phone}
          onChange={handleChange}
          style={inputStyle}
        />

        <textarea
          name="address"
          placeholder="Adres"
          value={formData.address}
          onChange={handleChange}
          rows={3}
          style={{
            ...inputStyle,
            minHeight: 90,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <button
          type="submit"
          disabled={loading || !isFormValid}
          style={{
            height: 48,
            border: "none",
            borderRadius: 12,
            background: loading || !isFormValid ? "#d1d5db" : "#111827",
            color: "#fff",
            fontWeight: 800,
            cursor: loading || !isFormValid ? "not-allowed" : "pointer",
            fontSize: 15,
          }}
        >
          {loading ? "Oluşturuluyor..." : "Fırın Hesabı Oluştur"}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 12,
            background: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      {generatedBakeryCode && (
        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 14,
            background: "#fff7ed",
            border: "2px solid #fdba74",
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
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: 8,
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
            marginTop: 18,
            padding: 14,
            borderRadius: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            marginBottom: 10,
            color: "#111827",
          }}
        >
          Debug Cevabı
        </div>

        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 13,
            color: "#374151",
            lineHeight: 1.5,
          }}
        >
          {debugText || "Henüz istek gönderilmedi."}
        </pre>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  background: "#fff",
};