import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";

type DistrictDoc = {
  cityCode: number;
  cityName: string;
  districtName: string;
  slug: string;
  sort: number;
  createdAt?: any;
  updatedAt?: any;
};

const ISTANBUL_CITY_CODE = 34;
const ISTANBUL_CITY_NAME = "İstanbul";

const ISTANBUL_DISTRICTS = [
  "Adalar",
  "Arnavutköy",
  "Ataşehir",
  "Avcılar",
  "Bağcılar",
  "Bahçelievler",
  "Bakırköy",
  "Başakşehir",
  "Bayrampaşa",
  "Beşiktaş",
  "Beykoz",
  "Beylikdüzü",
  "Beyoğlu",
  "Büyükçekmece",
  "Çatalca",
  "Çekmeköy",
  "Esenler",
  "Esenyurt",
  "Eyüpsultan",
  "Fatih",
  "Gaziosmanpaşa",
  "Güngören",
  "Kadıköy",
  "Kağıthane",
  "Kartal",
  "Küçükçekmece",
  "Maltepe",
  "Pendik",
  "Sancaktepe",
  "Sarıyer",
  "Silivri",
  "Sultanbeyli",
  "Sultangazi",
  "Şile",
  "Şişli",
  "Tuzla",
  "Ümraniye",
  "Üsküdar",
  "Zeytinburnu",
];

function slugifyTR(input: string) {
  return input
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Districts() {
  const [items, setItems] = useState<DistrictDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const q = query(collection(db, "districts"), orderBy("sort"));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => d.data() as DistrictDoc);
      setItems(rows.filter((x) => x.cityCode === ISTANBUL_CITY_CODE));
    } catch (e: any) {
      setErr(e?.message || "Listeleme hatası");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function seedIstanbulDistricts() {
    try {
      setSaving(true);
      setErr(null);

      const batch = writeBatch(db);

      ISTANBUL_DISTRICTS.forEach((name, idx) => {
        const slug = slugifyTR(name);
        const id = `${ISTANBUL_CITY_CODE}_${slug}`; // 34_maltepe gibi
        const ref = doc(db, "districts", id);

        batch.set(
          ref,
          {
            cityCode: ISTANBUL_CITY_CODE,
            cityName: ISTANBUL_CITY_NAME,
            districtName: name,
            slug,
            sort: idx + 1,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true } // tekrar basarsan günceller
        );
      });

      await batch.commit();
      await load();
      alert("İstanbul ilçeleri yüklendi ✅");
    } catch (e: any) {
      setErr(e?.message || "Yükleme hatası");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>İlçe Yönetimi</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <button onClick={seedIstanbulDistricts} disabled={saving} style={btnPrimary}>
          {saving ? "Yükleniyor..." : "İstanbul 39 İlçeyi Yükle"}
        </button>
        <button onClick={load} disabled={loading} style={btn}>
          Yenile
        </button>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 10 }}>Hata: {err}</p>}
      {loading && <p>Yükleniyor...</p>}

      {!loading && (
        <div style={{ marginTop: 14 }}>
          <p>
            Kayıt: <b>{items.length}</b>
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Sıra</th>
                <th style={th}>İl</th>
                <th style={th}>İlçe</th>
                <th style={th}>Slug</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={`${x.cityCode}-${x.slug}`}>
                  <td style={td}>{x.sort}</td>
                  <td style={td}>{x.cityName}</td>
                  <td style={td}>{x.districtName}</td>
                  <td style={td}>{x.slug}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    Henüz ilçe yok. “İstanbul 39 İlçeyi Yükle” butonuna bas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "white",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "black",
  color: "white",
  border: "1px solid black",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #ddd",
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eee",
};