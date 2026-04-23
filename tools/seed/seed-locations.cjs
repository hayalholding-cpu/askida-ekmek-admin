const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccountKey.json bulunamadı:", serviceAccountPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function readJson(fileName) {
  const p = path.join(__dirname, fileName);
  if (!fs.existsSync(p)) throw new Error("Dosya yok: " + p);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function upsertMany(collectionName, items) {
  // Firestore batch limiti 500 yazma. Biz küçük başladık ama yine de güvenli parça parça yazıyoruz.
  let written = 0;
  for (let i = 0; i < items.length; i += 450) {
    const chunk = items.slice(i, i + 450);
    const batch = db.batch();

    for (const item of chunk) {
      if (!item.id) throw new Error(`${collectionName} item missing id`);
      const ref = db.collection(collectionName).doc(String(item.id));
      const { id, ...data } = item;
      batch.set(ref, data, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

async function main() {
  const cities = readJson("data.cities.json");
  const districts = readJson("data.districts.json");
  const neighborhoods = readJson("data.neighborhoods.json");

  console.log("Seeding started...");
  console.log("cities:", await upsertMany("cities", cities));
  console.log("districts:", await upsertMany("districts", districts));
  console.log("neighborhoods:", await upsertMany("neighborhoods", neighborhoods));
  console.log("DONE ✅");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED ❌", e);
  process.exit(1);
});