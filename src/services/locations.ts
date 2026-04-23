import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase"; // ⚠️ sende db başka dosyadaysa burayı düzelt

export const DEFAULT_CITY_ID = "istanbul";

export type City = { id: string; name: string; order?: number; active?: boolean };
export type District = { id: string; name: string; cityId: string; order?: number; active?: boolean };
export type Neighborhood = { id: string; name: string; cityId: string; districtId: string; order?: number; active?: boolean };

const onlyActive = true;

export async function fetchCities(): Promise<City[]> {
  const q = query(collection(db, "cities"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((x) => !onlyActive || x.active !== false);
}

export async function fetchDistricts(cityId: string): Promise<District[]> {
  const q = query(
    collection(db, "districts"),
    where("cityId", "==", cityId),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((x) => !onlyActive || x.active !== false);
}

export async function fetchNeighborhoods(cityId: string, districtId: string): Promise<Neighborhood[]> {
  const q = query(
    collection(db, "neighborhoods"),
    where("cityId", "==", cityId),
    where("districtId", "==", districtId),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((x) => !onlyActive || x.active !== false);
}