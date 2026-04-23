import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

const ISTANBUL_CITY_CODE = 34;
const ISTANBUL_CITY_NAME = "İstanbul";

/** Türkçe karakterleri ve boşlukları güvenli slug'a çevirir */
function slugifyTR(input: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type NeighborhoodDoc = {
  id: string;
  cityCode?: number;
  cityName?: string;
  districtName?: string;
  districtSlug?: string;
  neighborhoodName?: string;
  slug?: string;
};

export default function Neighborhoods() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const selectedDistrictSlug = useMemo(
    () => (selectedDistrict ? slugifyTR(selectedDistrict) : ""),
    [selectedDistrict]
  );

  const [items, setItems] = useState<NeighborhoodDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // District listesi: turkey-neighbourhoods paketinden
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr("");
        // ESM uyumlu: require yok. Dynamic import.
        const mod: any = await import("turkey-neighbourhoods");
        const api: any = mod?.default ?? mod;

        const d: string[] = api?.getDistrictsByCityCode?.(ISTANBUL_CITY_CODE) ?? [];
        if (!cancelled) setDistricts(d);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setErr(e?.message || "İlçeler (turkey-neighbourhoods) okunamadı.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Seçili ilçe için Firestore'dan mahalleleri çek
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedDistrictSlug) {
        setItems([]);
        return;
      }

      try {
        setLoadingList(true);
        setErr("");

        const qy = query(
          collection(db, "neighborhoods"),
          where("cityCode", "==", ISTANBUL_CITY_CODE),
          where("districtSlug", "==", selectedDistrictSlug)
        );

        const snap = await getDocs(qy);
        const rows: NeighborhoodDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        if (!cancelled) setItems(rows);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setErr(e?.message || "Mahalleler Firestore’dan okunamadı.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDistrictSlug]);

  // İstanbul’un tüm mahallelerini paketten alıp Firestore’a yaz
  async function importIstanbulNeighborhoodsFromPackage() {
    try {
      setBusy(true);
      setErr("");
      setInfo("Paket verisi okunuyor...");

      const mod: any = await import("turkey-neighbourhoods");
      const api: any = mod?.default ?? mod;

      const dists: string[] = api?.getDistrictsByCityCode?.(ISTANBUL_CITY_CODE) ?? [];
      if (!dists.length) throw new Error("İstanbul ilçeleri bulunamadı (paket).");

      setInfo(`İlçe sayısı: ${dists.length}. Firestore’a yazılıyor...`);

      // Firestore batch limiti 500 -> güvenli 400
      const BATCH_LIMIT = 400;

      let batch = writeBatch(db);
      let inBatch = 0;
      let total = 0;

      for (const districtName of dists) {
        const districtSlug = slugifyTR(districtName);

        const nList: string[] =
          api?.getNeighbourhoodsByCityCodeAndDistrict?.(
            ISTANBUL_CITY_CODE,
            districtName
          ) ?? [];

        if (!Array.isArray(nList) || nList.length === 0) continue;

        for (const neighborhoodName of nList) {
          const nSlug = slugifyTR(neighborhoodName);
          if (!nSlug) continue;

          // Stabil ID
          const id = `${ISTANBUL_CITY_CODE}_${districtSlug}_${nSlug}`;

          batch.set(doc(db, "neighborhoods", id), {
            cityCode: ISTANBUL_CITY_CODE,
            cityName: ISTANBUL_CITY_NAME,
            districtName,
            districtSlug,
            neighborhoodName,
            slug: nSlug,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          });

          inBatch++;
          total++;

          if (inBatch >= BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            inBatch = 0;
            setInfo(`Yazılıyor... ${total}`);
          }
        }
      }

      if (inBatch > 0) await batch.commit();

      setInfo(`Tamam ✅ Toplam yazılan/yenilenen mahalle: ${total}`);
      alert(`İstanbul mahalleleri yüklendi ✅ (${total})`);

      // Listeyi yenilemek için seçili ilçe varsa tekrar çek
      if (selectedDistrictSlug) {
        // effect tetiklensin diye selectedDistrict'i aynı bırakıp sadece listeyi manuel güncelleyelim
        setSelectedDistrict((x) => x);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Mahalle yükleme hatası");
      setInfo("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Mahalle Yönetimi</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={importIstanbulNeighborhoodsFromPackage} disabled={busy}>
          {busy ? "Yükleniyor..." : "İstanbul Mahallelerini Yükle (Paketten)"}
        </button>

        <span style={{ color: "#666", fontWeight: 700 }}>
          {loadingList ? "Liste yükleniyor..." : ""}
        </span>
      </div>

      {info ? <div style={{ marginTop: 10, color: "green", fontWeight: 800 }}>{info}</div> : null}
      {err ? (
        <div style={{ marginTop: 10, color: "crimson", fontWeight: 800 }}>
          Hata: {err}
        </div>
      ) : null}

      <hr style={{ margin: "16px 0" }} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 900 }}>İlçe:</label>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={busy}
        >
          <option value="">Seçiniz...</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {selectedDistrict ? (
          <span style={{ color: "#666", fontWeight: 700 }}>
            Seçili: {selectedDistrict} ({selectedDistrictSlug})
          </span>
        ) : null}
      </div>

      <h3 style={{ marginTop: 14 }}>
        Mahalleler ({items.length})
      </h3>

      {!selectedDistrict ? (
        <div style={{ color: "#666" }}>Önce ilçe seç.</div>
      ) : items.length === 0 && !loadingList ? (
        <div style={{ color: "#666" }}>
          Bu ilçe için mahalle yok. (Önce “İstanbul Mahallelerini Yükle (Paketten)” butonuna bas.)
        </div>
      ) : null}

      <ul>
        {items.map((n) => (
          <li key={n.id}>{n.neighborhoodName ?? n.slug ?? n.id}</li>
        ))}
      </ul>
    </div>
  );
}