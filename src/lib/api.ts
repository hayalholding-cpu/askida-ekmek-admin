const API_BASE = (import.meta.env.VITE_API_URL || "https://api.ekmek.com.tr").trim();

export const API = {
  root: `${API_BASE}/`,

  adminLogin: `${API_BASE}/admin-login`,
  bakeryLogin: `${API_BASE}/firinci-login`,
  bakeryLoginAlt: `${API_BASE}/bakery-login`,

  publicProducts: `${API_BASE}/products`,
  adminProducts: `${API_BASE}/admin/products`,
  adminTransactions: `${API_BASE}/admin/transactions`,
  adminBakeries: `${API_BASE}/admin/bakeries`,

  createBakerAccount: `${API_BASE}/create-baker-account`,
  bakerResetPassword: `${API_BASE}/admin/baker/reset-password`,

  bakerByUid: (uid: string) => `${API_BASE}/baker/${uid}`,
  bakerProductsByUid: (uid: string) => `${API_BASE}/baker/${uid}/products`,
  bakerTransactionsByUid: (uid: string) =>
    `${API_BASE}/baker/${uid}/transactions`,

  deliverSuspendedBread: `${API_BASE}/baker/deliver-suspended-bread`,
  bakeryDeliver: `${API_BASE}/bakery/deliver`,

  addBreadToBaker: `${API_BASE}/admin/add-bread-to-baker`,
  migrateBakeriesPreview: `${API_BASE}/admin/migrate-bakeries-preview`,
  migrateBakeriesApply: `${API_BASE}/admin/migrate-bakeries-apply`,

  paymentComplete: `${API_BASE}/mobile/payment-complete`,
  mobileCities: `${API_BASE}/mobile/cities`,
  mobileDistricts: `${API_BASE}/mobile/districts`,
  mobileNeighborhoods: `${API_BASE}/mobile/neighborhoods`,
  mobileBakeries: `${API_BASE}/mobile/bakeries`,
  mobileProducts: `${API_BASE}/mobile/products`,
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type DeliverProductType = "ekmek" | "pide";
export type DeliverSource = "bakery-panel" | "tabela-mode";

export type DeliverSuspendedProductPayload = {
  bakeryId: string;
  productType: DeliverProductType;
  count?: number;
  source?: DeliverSource;
  note?: string;
};

export type DeliverSuspendedProductResponse = {
  ok: boolean;
  message: string;
  data?: {
    bakeryId: string;
    bakeryName: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    productType: DeliverProductType;
    source: DeliverSource;
    count: number;
    pendingBefore: number;
    pendingAfter: number;
    deliveredBefore: number;
    deliveredAfter: number;
  };
};

function readTokenFromStorageObject(key: string): string {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "";

    const parsed = JSON.parse(raw);

    return (
      parsed?.token ||
      parsed?.idToken ||
      parsed?.accessToken ||
      parsed?.adminToken ||
      parsed?.user?.token ||
      parsed?.user?.idToken ||
      parsed?.user?.accessToken ||
      ""
    );
  } catch {
    return "";
  }
}

function getAdminToken(): string {
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("idToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("userToken") ||
    readTokenFromStorageObject("adminUser") ||
    readTokenFromStorageObject("admin") ||
    readTokenFromStorageObject("user") ||
    readTokenFromStorageObject("auth") ||
    ""
  );
}

async function request<T = any>(
  url: string,
  method: HttpMethod,
  body?: any,
  timeoutMs = 60000
): Promise<T> {
  if (!url) {
    throw new Error("API endpoint tanımsız.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log("[API BASE]", API_BASE);
    console.log("[API REQUEST]", method, url, body ?? null);

    const token = getAdminToken();

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const rawText = await res.text();

    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    console.log("[API RESPONSE]", method, url, res.status, data ?? rawText);

    if (!res.ok) {
      throw new Error(data?.message || `API hatası oluştu. (${res.status})`);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Sunucu zamanında cevap vermedi. İstek zaman aşımına uğradı.");
    }

    console.log("[API ERROR]", method, url, error);
    throw new Error(error?.message || "Ağ bağlantısı veya sunucu hatası oluştu.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiGet<T = any>(url: string): Promise<T> {
  return request<T>(url, "GET");
}

export async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  return request<T>(url, "POST", body);
}

export async function apiPut<T = any>(url: string, body?: any): Promise<T> {
  return request<T>(url, "PUT", body);
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  return request<T>(url, "DELETE");
}

async function wakeBackend() {
  try {
    console.log("[WAKE BACKEND] ping başladı:", API.root);
    await request(API.root, "GET", undefined, 60000);
    console.log("[WAKE BACKEND] ping başarılı");
  } catch (error) {
    console.log("[WAKE BACKEND] ping hata:", error);
    throw error;
  }
}

export async function deliverSuspendedProduct(
  payload: DeliverSuspendedProductPayload
): Promise<DeliverSuspendedProductResponse> {
  const bakeryId = String(payload?.bakeryId || "").trim();
  const productType = payload?.productType;
  const count = Math.max(1, Number(payload?.count || 1));
  const source = payload?.source || "bakery-panel";
  const note = String(payload?.note || "").trim();

  if (!bakeryId) {
    throw new Error("bakeryId zorunlu");
  }

  if (productType !== "ekmek" && productType !== "pide") {
    throw new Error("productType yalnızca 'ekmek' veya 'pide' olabilir");
  }

  if (source !== "bakery-panel" && source !== "tabela-mode") {
    throw new Error("source yalnızca 'bakery-panel' veya 'tabela-mode' olabilir");
  }

  console.log("[deliverSuspendedProduct] endpoint:", API.bakeryDeliver);
  console.log("[deliverSuspendedProduct] payload:", {
    bakeryId,
    productType,
    count,
    source,
    note,
  });

  await wakeBackend();

  return apiPost<DeliverSuspendedProductResponse>(API.bakeryDeliver, {
    bakeryId,
    productType,
    count,
    source,
    note,
  });
}

export default API_BASE;