import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActionType = "cash-add" | "drop-from-shelf" | "mobile-add" | "admin-add";

type RollbackContext<TSuccess = unknown> = {
  result: TSuccess;
  type: ActionType;
  count: number;
  productType: "ekmek" | "pide";
  bakeryId: string;
  label: string;
};

type ExecuteActionParams<TSuccess = unknown> = {
  type: ActionType;
  count: number;
  productType: "ekmek" | "pide";
  bakeryId: string;
  label?: string;

  // Asıl işlem burada yapılır.
  // Örn: bakery_transactions yaz, bakery doc update et, vs.
  perform: () => Promise<TSuccess>;

  // Geri alma mantığı burada yapılır.
  // Artık perform sonucunu da alır.
  rollback: (context: RollbackContext<TSuccess>) => Promise<void>;
};

type UndoEntry = {
  id: string;
  type: ActionType;
  count: number;
  productType: "ekmek" | "pide";
  bakeryId: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  rollback: () => Promise<void>;
};

type SafeTabelaOptions = {
  undoWindowMs?: number;
  duplicateBlockMs?: number;
  largeCountThreshold?: number;
  onToast?: (message: string, kind?: "success" | "error" | "warning" | "info") => void;
  onLargeCountConfirm?: (params: {
    type: ActionType;
    count: number;
    productType: "ekmek" | "pide";
    label: string;
  }) => Promise<boolean> | boolean;
};

type ActionState =
  | "idle"
  | "processing"
  | "success"
  | "error"
  | "offline"
  | "undoing";

function buildFingerprint(params: {
  type: ActionType;
  count: number;
  productType: "ekmek" | "pide";
  bakeryId: string;
}) {
  return `${params.bakeryId}__${params.type}__${params.productType}__${params.count}`;
}

function defaultLargeCountConfirm(params: {
  type: ActionType;
  count: number;
  productType: "ekmek" | "pide";
  label: string;
}) {
  return window.confirm(
    `${params.count} adet ${params.productType} için işlem yapılacak.\n\nİşlem: ${params.label}\nDevam etmek istiyor musunuz?`
  );
}

export function useSafeTabelaActions(options: SafeTabelaOptions = {}) {
  const {
    undoWindowMs = 8000,
    duplicateBlockMs = 1500,
    largeCountThreshold = 20,
    onToast,
    onLargeCountConfirm = defaultLargeCountConfirm,
  } = options;

  const [state, setState] = useState<ActionState>("idle");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string>("");
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [remainingUndoMs, setRemainingUndoMs] = useState(0);

  const lastFingerprintRef = useRef<string>("");
  const lastActionAtRef = useRef<number>(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!undoEntry) {
      setRemainingUndoMs(0);
      return;
    }

    const tick = () => {
      const left = Math.max(0, undoEntry.expiresAt - Date.now());
      setRemainingUndoMs(left);

      if (left <= 0) {
        setUndoEntry(null);
      }
    };

    tick();
    const timer = window.setInterval(tick, 200);

    return () => window.clearInterval(timer);
  }, [undoEntry]);

  const clearMessages = useCallback(() => {
    setErrorMessage("");
    setLastSuccessMessage("");
  }, []);

  const executeAction = useCallback(
    async <TSuccess,>(params: ExecuteActionParams<TSuccess>) => {
      clearMessages();

      if (!online) {
        setState("offline");
        setErrorMessage("Bağlantı yok. İşlem başlatılmadı.");
        onToast?.("Bağlantı yok. İşlem başlatılmadı.", "warning");
        return { ok: false as const, reason: "offline" as const };
      }

      if (busy) {
        onToast?.("İşlem zaten devam ediyor. Lütfen bekleyin.", "info");
        return { ok: false as const, reason: "busy" as const };
      }

      const fingerprint = buildFingerprint({
        type: params.type,
        count: params.count,
        productType: params.productType,
        bakeryId: params.bakeryId,
      });

      const now = Date.now();
      const blockedByDuplicate =
        lastFingerprintRef.current === fingerprint &&
        now - lastActionAtRef.current < duplicateBlockMs;

      if (blockedByDuplicate) {
        onToast?.("Aynı işlem çok hızlı tekrarlandı. İşlem engellendi.", "warning");
        return { ok: false as const, reason: "duplicate" as const };
      }

      if (params.count <= 0) {
        setState("error");
        setErrorMessage("Adet 0'dan büyük olmalıdır.");
        onToast?.("Adet 0'dan büyük olmalıdır.", "error");
        return { ok: false as const, reason: "invalid-count" as const };
      }

      const label =
        params.label ||
        (params.type === "drop-from-shelf"
          ? "Askıdan düş"
          : params.type === "cash-add"
          ? "Nakit ekle"
          : params.type === "mobile-add"
          ? "Mobil ekleme"
          : "Admin ekleme");

      if (params.count >= largeCountThreshold) {
        const confirmed = await Promise.resolve(
          onLargeCountConfirm({
            type: params.type,
            count: params.count,
            productType: params.productType,
            label,
          })
        );

        if (!confirmed) {
          onToast?.("Büyük adet işlemi iptal edildi.", "info");
          return { ok: false as const, reason: "cancelled" as const };
        }
      }

      try {
        setBusy(true);
        setState("processing");

        const result = await params.perform();

        lastFingerprintRef.current = fingerprint;
        lastActionAtRef.current = Date.now();

        const successMessage = `${params.count} adet ${params.productType} için "${label}" işlemi tamamlandı.`;
        setLastSuccessMessage(successMessage);
        setState("success");
        onToast?.(successMessage, "success");

        const undoId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const createdAt = Date.now();
        const expiresAt = createdAt + undoWindowMs;

        const rollbackContext: RollbackContext<TSuccess> = {
          result,
          type: params.type,
          count: params.count,
          productType: params.productType,
          bakeryId: params.bakeryId,
          label,
        };

        setUndoEntry({
          id: undoId,
          type: params.type,
          count: params.count,
          productType: params.productType,
          bakeryId: params.bakeryId,
          label,
          createdAt,
          expiresAt,
          rollback: async () => {
            await params.rollback(rollbackContext);
          },
        });

        return {
          ok: true as const,
          result,
          undoAvailableUntil: expiresAt,
        };
      } catch (error: any) {
        const message =
          error?.message || "İşlem sırasında beklenmeyen bir hata oluştu.";
        setState("error");
        setErrorMessage(message);
        onToast?.(message, "error");

        return {
          ok: false as const,
          reason: "error" as const,
          error,
        };
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      clearMessages,
      duplicateBlockMs,
      largeCountThreshold,
      onLargeCountConfirm,
      onToast,
      online,
      undoWindowMs,
    ]
  );

  const undoLastAction = useCallback(async () => {
    if (!undoEntry) {
      onToast?.("Geri alınacak aktif işlem bulunamadı.", "info");
      return { ok: false as const, reason: "no-undo" as const };
    }

    if (Date.now() > undoEntry.expiresAt) {
      setUndoEntry(null);
      onToast?.("Geri alma süresi doldu.", "warning");
      return { ok: false as const, reason: "expired" as const };
    }

    if (!online) {
      setState("offline");
      onToast?.("Bağlantı yok. Geri alma yapılamadı.", "warning");
      return { ok: false as const, reason: "offline" as const };
    }

    if (busy) {
      onToast?.("Şu anda başka bir işlem sürüyor.", "info");
      return { ok: false as const, reason: "busy" as const };
    }

    try {
      setBusy(true);
      setState("undoing");

      await undoEntry.rollback();

      const msg = `${undoEntry.count} adet ${undoEntry.productType} için "${undoEntry.label}" işlemi geri alındı.`;
      setLastSuccessMessage(msg);
      setErrorMessage("");
      setUndoEntry(null);
      setState("success");
      onToast?.(msg, "success");

      return { ok: true as const };
    } catch (error: any) {
      const message =
        error?.message || "Geri alma sırasında beklenmeyen bir hata oluştu.";
      setState("error");
      setErrorMessage(message);
      onToast?.(message, "error");

      return { ok: false as const, reason: "error" as const, error };
    } finally {
      setBusy(false);
    }
  }, [busy, online, onToast, undoEntry]);

  const undoSeconds = useMemo(
    () => Math.ceil(remainingUndoMs / 1000),
    [remainingUndoMs]
  );

  const statusText = useMemo(() => {
    if (!online) return "Bağlantı yok";
    if (state === "processing") return "İşlem kaydediliyor...";
    if (state === "undoing") return "İşlem geri alınıyor...";
    if (state === "error") return errorMessage || "İşlem hatası";
    if (state === "success") return lastSuccessMessage || "İşlem başarılı";
    return "Hazır";
  }, [online, state, errorMessage, lastSuccessMessage]);

  return {
    state,
    busy,
    online,
    statusText,
    errorMessage,
    lastSuccessMessage,

    undoEntry,
    undoSeconds,
    canUndo: !!undoEntry && remainingUndoMs > 0 && !busy && online,

    executeAction,
    undoLastAction,
    clearMessages,
  };
}

/* -------------------------------------------------------
   KULLANIM ÖRNEĞİ
   -------------------------------------------------------
   const {
     busy,
     online,
     statusText,
     canUndo,
     undoSeconds,
     executeAction,
     undoLastAction
   } = useSafeTabelaActions({
     onToast: (msg, kind) => {
       console.log(kind, msg);
     }
   });

   const handleDrop = async () => {
     await executeAction({
       type: "drop-from-shelf",
       count: keypadValue,
       productType: selectedProductType,
       bakeryId,
       label: "Askıdan düş",

       perform: async () => {
         // örnek dönüş:
         // return { transactionId: newTxRef.id, dailyDocId: `${bakeryId}_${todayKey()}` };
         return {};
       },

       rollback: async ({ result, bakeryId, count }) => {
         console.log(result, bakeryId, count);
         // await rollbackDropFromShelf(...)
       }
     });
   };

   const handleCashAdd = async () => {
     await executeAction({
       type: "cash-add",
       count: keypadValue,
       productType: selectedProductType,
       bakeryId,
       label: "Nakit ekle",

       perform: async () => {
         // örnek dönüş:
         // return { transactionId: newTxRef.id };
         return {};
       },

       rollback: async ({ result, bakeryId, count }) => {
         console.log(result, bakeryId, count);
         // await rollbackCashAdd(...)
       }
     });
   };
*/