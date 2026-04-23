import { useEffect, useState, type CSSProperties } from "react";
import { API, apiDelete, apiGet, apiPost, apiPut } from "./lib/api";

type ProductItem = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
};

type ProductsResponse = {
  ok?: boolean;
  products?: any[];
};

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await apiGet<ProductsResponse>(API.adminProducts);

      const mappedProducts: ProductItem[] = Array.isArray(data?.products)
        ? data.products.map((item: any, index: number) => ({
            id: String(item?.id || `product_${index + 1}`),
            name: String(item?.name || "").trim(),
            price: Number(item?.price || 0),
            isActive: item?.isActive !== false,
          }))
        : [];

      setProducts(mappedProducts);
      setDeletedProductIds([]);
    } catch (error: any) {
      console.error("Ürünler alınamadı:", error);
      setErrorMessage(error?.message || "Backend bağlantısı kurulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const addProduct = () => {
    setErrorMessage("");
    setSuccessMessage("");

    const safeName = newName.trim();
    const safePrice = Number(newPrice || 0);

    if (!safeName) {
      setErrorMessage("Ürün adı boş bırakılamaz.");
      return;
    }

    if (safePrice < 0) {
      setErrorMessage("Fiyat 0'dan küçük olamaz.");
      return;
    }

    const alreadyExists = products.some(
      (item) =>
        item.name.trim().toLocaleLowerCase("tr-TR") ===
        safeName.toLocaleLowerCase("tr-TR")
    );

    if (alreadyExists) {
      setErrorMessage("Aynı isimde ürün zaten var.");
      return;
    }

    setProducts((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}`,
        name: safeName,
        price: safePrice,
        isActive: true,
      },
    ]);

    setNewName("");
    setNewPrice(0);
    setSuccessMessage("Yeni ürün listeye eklendi. Kaydetmeyi unutmayın.");
  };

  const removeProduct = (id: string) => {
    if (!id.startsWith("local_")) {
      setDeletedProductIds((prev) =>
        prev.includes(id) ? prev : [...prev, id]
      );
    }

    setProducts((prev) => prev.filter((item) => item.id !== id));
    setErrorMessage("");
    setSuccessMessage("Ürün listeden kaldırıldı. Kaydetmeyi unutmayın.");
  };

  const toggleActive = (id: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
    setErrorMessage("");
    setSuccessMessage("");
  };

  const updateProductField = (
    id: string,
    field: "name" | "price",
    value: string | number
  ) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "price"
                  ? Math.max(0, Number(value || 0))
                  : String(value || ""),
            }
          : item
      )
    );
    setErrorMessage("");
    setSuccessMessage("");
  };

  const saveProducts = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const cleaned = products.map((item, index) => ({
        id: String(item.id || "").trim(),
        name: String(item.name || "").trim(),
        price: Number(item.price || 0),
        isActive: !!item.isActive,
        sort: index + 1,
      }));

      if (cleaned.length === 0) {
        setErrorMessage("Kaydedilecek ürün bulunmuyor.");
        return;
      }

      const hasEmptyName = cleaned.some((item) => !item.name);
      if (hasEmptyName) {
        setErrorMessage("Ürün adı boş bırakılamaz.");
        return;
      }

      const hasInvalidPrice = cleaned.some((item) => item.price < 0);
      if (hasInvalidPrice) {
        setErrorMessage("Ürün fiyatı 0'dan küçük olamaz.");
        return;
      }

      const normalizedNames = cleaned.map((item) =>
        item.name.toLocaleLowerCase("tr-TR")
      );
      const hasDuplicateNames =
        new Set(normalizedNames).size !== normalizedNames.length;

      if (hasDuplicateNames) {
        setErrorMessage("Aynı isimde birden fazla ürün olamaz.");
        return;
      }

      for (const deletedId of deletedProductIds) {
        await apiDelete(`${API.adminProducts}/${deletedId}`);
      }

      for (const item of cleaned) {
        const payload = {
          name: item.name,
          price: item.price,
          isActive: item.isActive,
          sort: item.sort,
        };

        if (item.id.startsWith("local_")) {
          await apiPost(API.adminProducts, payload);
        } else {
          await apiPut(`${API.adminProducts}/${item.id}`, payload);
        }
      }

      setSuccessMessage("Ürün değişiklikleri Firestore'a kaydedildi.");
      await loadProducts();
    } catch (error: any) {
      console.error("Ürünler kaydedilemedi:", error);
      setErrorMessage(error?.message || "Backend bağlantısı kurulamadı.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <h1>Ürünler</h1>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Ürünler</h1>

      {errorMessage && <div style={errorBoxStyle}>{errorMessage}</div>}
      {successMessage && <div style={successBoxStyle}>{successMessage}</div>}

      <div style={cardStyle}>
        <h2>Yeni Ürün Ekle</h2>

        <div style={formRowStyle}>
          <input
            placeholder="Ürün adı"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            min={0}
            value={newPrice}
            onChange={(e) => setNewPrice(Number(e.target.value))}
            style={inputStyle}
          />

          <button onClick={addProduct} style={primaryButtonStyle}>
            Ekle
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <button
          onClick={saveProducts}
          disabled={saving}
          style={{
            ...primaryButtonStyle,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>

        {products.map((item) => (
          <div key={item.id} style={productRowStyle}>
            <input
              value={item.name}
              onChange={(e) =>
                updateProductField(item.id, "name", e.target.value)
              }
              style={inputStyle}
            />

            <input
              type="number"
              min={0}
              value={item.price}
              onChange={(e) =>
                updateProductField(item.id, "price", e.target.value)
              }
              style={inputStyle}
            />

            <button onClick={() => toggleActive(item.id)}>
              {item.isActive ? "Aktif" : "Pasif"}
            </button>

            <button
              onClick={() => removeProduct(item.id)}
              style={dangerButtonStyle}
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 16,
  marginBottom: 20,
  border: "1px solid #e5e7eb",
};

const formRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto",
  gap: 12,
};

const productRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto auto",
  gap: 12,
  marginTop: 10,
};

const inputStyle: CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const primaryButtonStyle: CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const errorBoxStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #ef4444",
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
};

const successBoxStyle: CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #10b981",
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
};