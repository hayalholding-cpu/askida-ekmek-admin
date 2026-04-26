import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import { useSafeTabelaActions } from "../../hooks/useSafeTabelaActions";

type BakeryDoc = {
  id: string;
  uid?: string;
  bakeryName?: string;
  bakeryCode?: string;
  pendingEkmek?: number;
  pendingPide?: number;
  deliveredEkmek?: number;
  deliveredPide?: number;
  isActive?: boolean;
};

type DeliveryDailyDoc = {
  deliveredEkmek?: number;
  deliveredPide?: number;
};

type TabelaSummary = {
  pendingEkmek: number;
  pendingPide: number;
  todayIncomingEkmek: number;
  todayIncomingPide: number;
  todayDeliveredEkmek: number;
  todayDeliveredPide: number;
};

type TransactionItem = {
  id: string;
  type?: string;
  productType?: string;
  productName?: string;
  bakeryId?: string;
  bakeryUid?: string;
  bakeryName?: string;
  uid?: string;
  count?: number;
  quantity?: number;
  adet?: number;
  amount?: number;
  piece?: number;
  createdAt?: any;
  paymentType?: string;
  source?: string;
  reversible?: boolean;
  reversed?: boolean;
  reversedAt?: any;
  reverseOf?: string | null;
  isReverse?: boolean;
};

type KeypadTarget = "add-ekmek" | "deliver-ekmek" | "deliver-pide" | null;
type KioskMode = "compact" | "standard" | "wide";
type DialogKind = "info" | "warning" | "error" | "success" | "confirm";

type DialogState = {
  open: boolean;
  kind: DialogKind;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (() => void) | null;
  onCancel?: (() => void) | null;
};

type SuccessPopupState = {
  open: boolean;
  title: string;
  message: string;
};

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function txTimeToDate(createdAt: any): Date | null {
  if (!createdAt) return null;

  try {
    if (createdAt?.toDate) return createdAt.toDate();
    if (createdAt?.seconds) return new Date(createdAt.seconds * 1000);

    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return d;

    return null;
  } catch {
    return null;
  }
}

function formatClock(date: Date | null) {
  if (!date) return "--:--";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isTodayDate(date: Date | null) {
  if (!date) return false;
  return date >= startOfToday();
}

function isBreadLike(productType: any, productName: any) {
  const p1 = String(productType || "").toLowerCase().trim();
  const p2 = String(productName || "").toLowerCase().trim();

  if (!p1 && !p2) return true;
  if (p1.includes("pide") || p2.includes("pide")) return false;

  return true;
}

function normalizeCount(tx: any) {
  return Math.max(
    1,
    safeNumber(
      tx?.count ?? tx?.quantity ?? tx?.adet ?? tx?.amount ?? tx?.piece ?? 1,
      1
    )
  );
}

function isIncomingType(type: string) {
  const t = String(type || "").toLowerCase().trim();

  return (
    t === "mobile-payment" ||
    t === "payment" ||
    t === "incoming" ||
    t === "mobile" ||
    t === "admin-add-bread" ||
    t === "manual-cash-add" ||
    t.includes("askiya") ||
    t.includes("askıya") ||
    t.includes("mobile") ||
    t.includes("payment") ||
    t.includes("admin-add") ||
    t.includes("manual")
  );
}

function getProductLabel(productType: "ekmek" | "pide") {
  return productType === "pide" ? "Pide" : "Ekmek";
}

function getInventoryFields(productType: "ekmek" | "pide") {
  if (productType === "pide") {
    return {
      pendingField: "pendingPide",
      deliveredField: "deliveredPide",
      dailyDeliveredField: "deliveredPide",
      addType: "manual-cash-add-pide",
      deliverType: "askidan-pide-verildi",
      reverseAddType: "reverse-manual-cash-add-pide",
      reverseDeliverType: "reverse-delivery-pide",
    } as const;
  }

  return {
    pendingField: "pendingEkmek",
    deliveredField: "deliveredEkmek",
    dailyDeliveredField: "deliveredEkmek",
    addType: "manual-cash-add",
    deliverType: "askidan-ekmek-verildi",
    reverseAddType: "reverse-manual-cash-add",
    reverseDeliverType: "reverse-delivery",
  } as const;
}

function formatTransactionLabel(item: TransactionItem) {
  const count = normalizeCount(item);
  const product = getProductLabel(
    isBreadLike(item.productType, item.productName) ? "ekmek" : "pide"
  );
  const type = String(item.type || "").toLowerCase().trim();

  if (type.includes("reverse")) return `${count} ${product} geri alındı`;
  if (isIncomingType(type)) return `${count} ${product} askıya eklendi`;
  return `${count} ${product} askıdan verildi`;
}

function resolveBakeryIdFromLocalStorage() {
  try {
    const direct = localStorage.getItem("tabelaBakeryId");
    if (direct) return direct;
  } catch {
    //
  }

  const possibleKeys = ["tabelaBakery", "bakeryAuth", "bakeryUser", "bakery", "user"];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const id =
        (parsed as any)?.id ||
        (parsed as any)?.uid ||
        (parsed as any)?.bakeryId ||
        (parsed as any)?.bakeryUid;

      if (id) return String(id);
    } catch {
      //
    }
  }

  return "";
}

function normalizeKeypadValue(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return String(Number(digits));
}

function isVisibleOperationalTx(item: TransactionItem) {
  if (item?.reversed) return false;
  if (item?.isReverse) return false;
  if (item?.reverseOf) return false;
  return true;
}

function getKioskMode(width: number, height: number): KioskMode {
  if (width >= 1700 && height >= 900) return "wide";
  if (width < 1180 || height < 760) return "compact";
  return "standard";
}

function dialogIcon(kind: DialogKind) {
  if (kind === "success") return "✓";
  if (kind === "error") return "!";
  if (kind === "warning") return "!";
  if (kind === "confirm") return "?";
  return "i";
}

export default function TabelaMode() {
  const { bakeryId: routeBakeryId } = useParams();

  const [bakeryId, setBakeryId] = useState<string>("");
  const [bakery, setBakery] = useState<BakeryDoc | null>(null);
  const [bakeryLoaded, setBakeryLoaded] = useState(false);
  const [daily, setDaily] = useState<DeliveryDailyDoc | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successPopup, setSuccessPopup] = useState<SuccessPopupState>({
    open: false,
    title: "",
    message: "",
  });
  const [liveTime, setLiveTime] = useState(new Date());
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1366,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  }));

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState<KeypadTarget>(null);
  const [keypadValue, setKeypadValue] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    kind: "info",
    title: "",
    message: "",
    confirmText: "Tamam",
    cancelText: "Vazgeç",
    onConfirm: null,
    onCancel: null,
  });

  const closeDialog = useCallback(() => {
    setDialog((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
      onCancel: null,
    }));
  }, []);

  const showSuccessPopup = useCallback((message: string, title = "İşlem Tamamlandı") => {
    setSuccessPopup({
      open: true,
      title,
      message,
    });
  }, []);

  const showActionSuccessPopup = useCallback(
    (message: string) => {
      const completedMatch = message.match(
        /^(\d+) adet (ekmek|pide) için "([^"]+)" işlemi tamamlandı\.$/
      );

      if (completedMatch) {
        const [, count, productType, label] = completedMatch;

        if (label === "Nakit ekle") {
          showSuccessPopup(`${count} adet ${productType} askıya eklendi.`);
          return;
        }

        if (label === "Askıdan düş") {
          showSuccessPopup(`${count} adet ${productType} askıdan düşürüldü.`);
          return;
        }
      }

      const undoMatch = message.match(/^(\d+) adet (ekmek|pide) için "([^"]+)" işlemi geri alındı\.$/);

      if (undoMatch) {
        const [, count, productType, label] = undoMatch;
        showSuccessPopup(
          `${count} adet ${productType} için ${label.toLowerCase()} işlemi geri alındı.`,
          "İşlem Geri Alındı"
        );
        return;
      }

      showSuccessPopup(message);
    },
    [showSuccessPopup]
  );

  const showMessageDialog = useCallback(
    (
      kind: Exclude<DialogKind, "confirm">,
      title: string,
      message: string,
      confirmText = "Tamam"
    ) => {
      setDialog({
        open: true,
        kind,
        title,
        message,
        confirmText,
        cancelText: "",
        onConfirm: () => {
          closeDialog();
        },
        onCancel: null,
      });
    },
    [closeDialog]
  );

  const showConfirmDialog = useCallback(
    ({
      title,
      message,
      confirmText = "Devam Et",
      cancelText = "Vazgeç",
    }: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setDialog({
          open: true,
          kind: "confirm",
          title,
          message,
          confirmText,
          cancelText,
          onConfirm: () => {
            closeDialog();
            resolve(true);
          },
          onCancel: () => {
            closeDialog();
            resolve(false);
          },
        });
      });
    },
    [closeDialog]
  );

  const {
    busy,
    online,
    statusText,
    canUndo,
    undoSeconds,
    executeAction,
    undoLastAction,
  } = useSafeTabelaActions({
    onToast: (message, kind) => {
      if (kind !== "success") return;
      showActionSuccessPopup(message);
    },
    onLargeCountConfirm: async ({ count, productType, label }) => {
      return await showConfirmDialog({
        title: "İşlem Onayı",
        message: `${count} adet ${productType} için işlem yapılacak.\n\nİşlem: ${label}`,
        confirmText: "Evet, Devam Et",
        cancelText: "İptal",
      });
    },
  });

  const kioskMode = useMemo(
    () => getKioskMode(viewport.width, viewport.height),
    [viewport.height, viewport.width]
  );

  const isCompact = kioskMode === "compact";
  const isWide = kioskMode === "wide";

  useEffect(() => {
  const id = String(routeBakeryId || resolveBakeryIdFromLocalStorage() || "").trim();

  if (id) {
    localStorage.setItem("tabelaBakeryId", id);
    localStorage.setItem(
      "tabelaBakery",
      JSON.stringify({
        bakeryId: id,
        bakeryUid: id,
        uid: id,
        id,
      })
    );
  }

  setBakeryId(id);
}, [routeBakeryId]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!successPopup.open) return;

    const timer = window.setTimeout(() => {
      setSuccessPopup((prev) => ({
        ...prev,
        open: false,
      }));
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [successPopup.open]);

  useEffect(() => {
    if (!bakeryId) return;

    const bakeryRef = doc(db, "bakeries", bakeryId);

    const unsub = onSnapshot(
      bakeryRef,
      (snap) => {
        if (!snap.exists()) {
          setBakery(null);
          setErrorMessage("Fırın kaydı bulunamadı.");
          return;
        }

        const data = snap.data() || {};
        setBakery({
          id: snap.id,
          uid: data.uid || snap.id,
          bakeryName: data.bakeryName || "",
          bakeryCode: data.bakeryCode || "",
          pendingEkmek: safeNumber(data.pendingEkmek),
          pendingPide: safeNumber(data.pendingPide),
          deliveredEkmek: safeNumber(data.deliveredEkmek),
          deliveredPide: safeNumber(data.deliveredPide),
          isActive: !!data.isActive,
        });
        setErrorMessage("");
      },
      () => {
        setErrorMessage("Fırın bilgileri alınamadı.");
      }
    );

    return () => unsub();
  }, [bakeryId]);

  useEffect(() => {
    if (!bakeryId) return;

    const dailyId = `${bakeryId}_${todayKey()}`;
    const dailyRef = doc(db, "deliveries_daily", dailyId);

    const unsub = onSnapshot(
      dailyRef,
      (snap) => {
        if (!snap.exists()) {
          setDaily({
            deliveredEkmek: 0,
            deliveredPide: 0,
          });
          return;
        }

        const data = snap.data() || {};
        setDaily({
          deliveredEkmek: safeNumber(data.deliveredEkmek),
          deliveredPide: safeNumber(data.deliveredPide),
        });
      },
      () => {
        setDaily({
          deliveredEkmek: 0,
        });
      }
    );

    return () => unsub();
  }, [bakeryId]);

  useEffect(() => {
    if (!bakeryId) return;

    const q = query(
      collection(db, "bakery_transactions"),
      orderBy("createdAt", "desc"),
      limit(250)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: TransactionItem[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((item) => {
            const sameBakery =
              item?.bakeryId === bakeryId ||
              item?.bakeryUid === bakeryId ||
              item?.uid === bakeryId;

            if (!sameBakery) return false;

            const dt = txTimeToDate(item.createdAt);
            if (!isTodayDate(dt)) return false;
            if (!isVisibleOperationalTx(item)) return false;

            return true;
          });

        setTransactions(rows);
      },
      () => {
        setTransactions([]);
      }
    );

    return () => unsub();
  }, [bakeryId]);

  const summary = useMemo<TabelaSummary>(() => {
    let todayIncomingEkmek = 0;
    let todayIncomingPide = 0;

    for (const tx of transactions) {
      const type = String(tx.type || "").toLowerCase().trim();
      if (!isIncomingType(type)) continue;

      if (isBreadLike(tx.productType, tx.productName)) {
        todayIncomingEkmek += normalizeCount(tx);
      } else {
        todayIncomingPide += normalizeCount(tx);
      }
    }

    return {
      pendingEkmek: bakery ? safeNumber(bakery.pendingEkmek) : null,
      pendingPide: bakery ? safeNumber(bakery.pendingPide) : null,
      todayIncomingEkmek,
      todayIncomingPide,
      todayDeliveredEkmek: safeNumber(daily?.deliveredEkmek),
      todayDeliveredPide: safeNumber(daily?.deliveredPide),
    };
  }, [bakery?.pendingEkmek, bakery?.pendingPide, daily?.deliveredEkmek, daily?.deliveredPide, transactions]);

  const visibleHistory = useMemo(() => transactions.slice(0, 24), [transactions]);

  function openKeypad(target: KeypadTarget) {
    setKeypadTarget(target);
    setKeypadValue("");
    setKeypadOpen(true);
  }

  function closeKeypad() {
    setKeypadOpen(false);
    setKeypadTarget(null);
    setKeypadValue("");
  }

  function handleKeypadDigit(digit: string) {
    setKeypadValue((prev) => {
      const next = normalizeKeypadValue(`${prev}${digit}`);
      return next;
    });
  }

  function handleKeypadBackspace() {
    setKeypadValue((prev) => {
      const next = prev.slice(0, -1);
      return normalizeKeypadValue(next);
    });
  }

  function handleKeypadClear() {
    setKeypadValue("");
  }

  async function performInventoryTransaction({
    productType,
    type,
    count,
  }: {
    productType: "ekmek" | "pide";
    type: "add" | "deliver";
    count: number;
  }) {
    if (!bakeryId || !bakery) {
      throw new Error("Fırın bilgisi bulunamadı.");
    }

    if (count <= 0) {
      throw new Error(`Lütfen geçerli bir ${productType} adedi gir.`);
    }

    const fields = getInventoryFields(productType);
    const actionKey = `${type}-${productType}`;
    const dailyDocId = `${bakeryId}_${todayKey()}`;

    try {
      setBusyAction(actionKey);

      return await runTransaction(db, async (transaction) => {
        const bakeryRef = doc(db, "bakeries", bakeryId);
        const bakerySnap = await transaction.get(bakeryRef);

        if (!bakerySnap.exists()) {
          throw new Error("Fırın kaydı bulunamadı.");
        }

        const bakeryData = bakerySnap.data() || {};
        const currentPending = safeNumber((bakeryData as any)[fields.pendingField]);
        const currentDelivered = safeNumber((bakeryData as any)[fields.deliveredField]);
        const txRef = doc(collection(db, "bakery_transactions"));

        if (type === "deliver") {
          if (currentPending <= 0) {
            throw new Error(`Askıda bekleyen ${productType} yok.`);
          }

          if (currentPending < count) {
            throw new Error(`Askıda yeterli ${productType} yok. Mevcut: ${currentPending}`);
          }

          const dailyRef = doc(db, "deliveries_daily", dailyDocId);
          const dailySnap = await transaction.get(dailyRef);
          const dailyData = dailySnap.exists() ? dailySnap.data() || {} : {};
          const currentDailyDelivered = safeNumber(
            (dailyData as any)[fields.dailyDeliveredField]
          );

          transaction.update(bakeryRef, {
            [fields.pendingField]: currentPending - count,
            [fields.deliveredField]: currentDelivered + count,
          });

          transaction.set(
            dailyRef,
            {
              bakeryId,
              date: todayKey(),
              deliveredEkmek: safeNumber((dailyData as any).deliveredEkmek),
              deliveredPide: safeNumber((dailyData as any).deliveredPide),
              [fields.dailyDeliveredField]: currentDailyDelivered + count,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          transaction.set(txRef, {
            bakeryId,
            bakeryUid: bakery.uid || bakeryId,
            bakeryName: bakery.bakeryName || "",
            type: fields.deliverType,
            productType,
            count,
            source: "tabela-mode",
            reversible: true,
            reversed: false,
            reversedAt: null,
            reverseOf: null,
            isReverse: false,
            createdAt: serverTimestamp(),
          });

          return {
            transactionId: txRef.id,
            dailyDocId,
          };
        }

        transaction.update(bakeryRef, {
          [fields.pendingField]: currentPending + count,
        });

        transaction.set(txRef, {
          bakeryId,
          bakeryUid: bakery.uid || bakeryId,
          bakeryName: bakery.bakeryName || "",
          type: fields.addType,
          productType,
          count,
          paymentType: "cash",
          source: "tabela-mode",
          reversible: true,
          reversed: false,
          reversedAt: null,
          reverseOf: null,
          isReverse: false,
          createdAt: serverTimestamp(),
        });

        return {
          transactionId: txRef.id,
        };
      });
    } catch (error) {
      console.error("Tabela Modu işlem hatası:", error);
      throw error instanceof Error ? error : new Error("İşlem sırasında hata oluştu.");
    } finally {
      setBusyAction(null);
    }
  }

  async function rollbackInventoryTransaction({
    productType,
    type,
    count,
    result,
  }: {
    productType: "ekmek" | "pide";
    type: "add" | "deliver";
    count: number;
    result: { transactionId?: string; dailyDocId?: string };
  }) {
    const originalTxId = result?.transactionId;

    if (!originalTxId) {
      throw new Error("Geri alma için işlem kaydı bulunamadı.");
    }

    const fields = getInventoryFields(productType);
    const actionKey = `rollback-${type}-${productType}`;

    try {
      setBusyAction(actionKey);

      await runTransaction(db, async (transaction) => {
        const bakeryRef = doc(db, "bakeries", bakeryId);
        const bakerySnap = await transaction.get(bakeryRef);

        if (!bakerySnap.exists()) {
          throw new Error("Fırın kaydı bulunamadı.");
        }

        const bakeryData = bakerySnap.data() || {};
        const currentPending = safeNumber((bakeryData as any)[fields.pendingField]);
        const currentDelivered = safeNumber((bakeryData as any)[fields.deliveredField]);
        const originalTxRef = doc(db, "bakery_transactions", originalTxId);
        const reverseTxRef = doc(collection(db, "bakery_transactions"));

        transaction.update(originalTxRef, {
          reversed: true,
          reversedAt: serverTimestamp(),
        });

        if (type === "deliver") {
          if (!result.dailyDocId) {
            throw new Error("Geri alma için teslim kayıt bilgisi bulunamadı.");
          }

          const dailyRef = doc(db, "deliveries_daily", result.dailyDocId);
          const dailySnap = await transaction.get(dailyRef);
          const dailyData = dailySnap.exists() ? dailySnap.data() || {} : {};
          const currentDailyDelivered = safeNumber(
            (dailyData as any)[fields.dailyDeliveredField]
          );

          transaction.update(bakeryRef, {
            [fields.pendingField]: currentPending + count,
            [fields.deliveredField]: Math.max(0, currentDelivered - count),
          });

          transaction.set(
            dailyRef,
            {
              bakeryId,
              date: todayKey(),
              deliveredEkmek: safeNumber((dailyData as any).deliveredEkmek),
              deliveredPide: safeNumber((dailyData as any).deliveredPide),
              [fields.dailyDeliveredField]: Math.max(0, currentDailyDelivered - count),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          transaction.set(reverseTxRef, {
            bakeryId,
            bakeryUid: bakery?.uid || bakeryId,
            bakeryName: bakery?.bakeryName || "",
            type: fields.reverseDeliverType,
            productType,
            count,
            source: "tabela-mode",
            reverseOf: originalTxId,
            isReverse: true,
            createdAt: serverTimestamp(),
          });

          return;
        }

        transaction.update(bakeryRef, {
          [fields.pendingField]: Math.max(0, currentPending - count),
        });

        transaction.set(reverseTxRef, {
          bakeryId,
          bakeryUid: bakery?.uid || bakeryId,
          bakeryName: bakery?.bakeryName || "",
          type: fields.reverseAddType,
          productType,
          count,
          paymentType: "cash",
          source: "tabela-mode",
          reverseOf: originalTxId,
          isReverse: true,
          createdAt: serverTimestamp(),
        });
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTransaction({
    productType,
    type,
    count,
  }: {
    productType: "ekmek" | "pide";
    type: "deliver" | "add";
    count: number;
  }) {
    const result = await executeAction({
      type: type === "add" ? "cash-add" : "drop-from-shelf",
      count,
      productType,
      bakeryId,
      label: type === "add" ? "Nakit ekle" : "Askıdan düş",
      perform: async () => {
        return await performInventoryTransaction({ productType, type, count });
      },
      rollback: async ({ result }) => {
        await rollbackInventoryTransaction({ productType, type, count, result });
      },
    });

    if (result.ok) {
      closeKeypad();
    }

    return result;
  }

  async function handleKeypadConfirm() {
    const finalCount = safeNumber(normalizeKeypadValue(keypadValue), 0);

    if (finalCount <= 0) {
      showMessageDialog("warning", "Geçersiz Adet", "Lütfen geçerli bir adet gir.");
      return;
    }

    if (keypadTarget === "add-ekmek") {
      await handleTransaction({ productType: "ekmek", type: "add", count: finalCount });
      return;
    }

    if (keypadTarget === "deliver-ekmek") {
      await handleTransaction({ productType: "ekmek", type: "deliver", count: finalCount });
      return;
    }

    if (keypadTarget === "deliver-pide") {
      await handleTransaction({ productType: "pide", type: "deliver", count: finalCount });
      return;
    }

    closeKeypad();
  }

  const layoutVars = useMemo(() => {
    return {
      pageGap: isCompact ? 10 : isWide ? 18 : 14,
      shellPadding: isCompact ? "8px" : isWide ? "18px" : "12px",
      headerPadding: isCompact ? "14px 14px" : isWide ? "24px 26px" : "18px 20px",
      cardPadding: isCompact ? 18 : isWide ? 26 : 20,
      actionCardPadding: isCompact ? 14 : isWide ? 24 : 18,
      heroRows:
        isCompact
          ? "minmax(0, 0.8fr) minmax(0, 1.1fr) minmax(0, 0.8fr)"
          : isWide
          ? "minmax(0, 0.92fr) minmax(0, 1.08fr) minmax(0, 0.84fr)"
          : "minmax(0, 0.86fr) minmax(0, 1.08fr) minmax(0, 0.82fr)",
      headerTitleSize: isCompact ? "clamp(30px, 4.2vw, 42px)" : "clamp(42px, 5vw, 72px)",
      heroNumberSize:
        isCompact
          ? "clamp(56px, 8.5vw, 86px)"
          : isWide
          ? "clamp(82px, 7.4vw, 126px)"
          : "clamp(66px, 7.8vw, 104px)",
      clockSize: isCompact ? "clamp(22px, 3.2vw, 30px)" : "clamp(26px, 3vw, 38px)",
      actionButtonMinHeight: isCompact ? 120 : isWide ? 212 : 164,
      summaryNumberSize: isCompact ? "clamp(38px, 5vw, 56px)" : "clamp(48px, 5vw, 76px)",
      statusWrapGap: isCompact ? 8 : 10,
      keypadWidth: isCompact ? 420 : 470,
      keypadPadding: isCompact ? 12 : 14,
      keypadGap: isCompact ? 8 : 10,
      keypadBtnHeight: isCompact ? 54 : 62,
    };
  }, [isCompact, isWide]);

  const liveHourRotation = ((liveTime.getHours() % 12) + liveTime.getMinutes() / 60) * 30;
  const liveMinuteRotation = (liveTime.getMinutes() + liveTime.getSeconds() / 60) * 6;
  const liveSecondRotation = liveTime.getSeconds() * 6;

    if (!bakeryId) {
  return (
    <div style={styles.screen}>
      <div style={styles.centerBox}>
        <div style={styles.title}>Tabela Modu</div>
        <div style={styles.infoText}>Fırın kimliği bulunamadı.</div>
        <div style={styles.subtleText}>
          Bu ekranı <b>/tabela/:bakeryId</b> ile aç.
        </div>
      </div>
    </div>
  );
}

if (historyOpen) {
  return (
    <div style={styles.screen}>
      <div style={styles.bgGlowOne} />
      <div style={styles.bgGlowTwo} />
      <div
        style={{
          ...styles.appShell,
          padding: layoutVars.shellPadding,
          gap: layoutVars.pageGap,
        }}
      >
        <div
          style={{
            ...styles.header,
            padding: layoutVars.headerPadding,
          }}
        >
          <div style={styles.headerTopLine} />
          <div style={styles.headerMain}>
            <div style={styles.headerLeft}>
              <div style={styles.headerKicker}>TABELA MODU</div>
              <div
                style={{
                  ...styles.title,
                  fontSize: layoutVars.headerTitleSize,
                }}
              >
                İşlem Geçmişi
              </div>
              <div style={styles.titleAccent} />
              <div style={styles.headerUtilityRow}>
                <div style={styles.headerMetaPill}>{bakery?.bakeryName || '-'}</div>
                <div style={styles.headerMetaPill}>{todayKey()}</div>
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                style={styles.historyBackButton}
              >
                TABELAYA DÖN
              </button>
            </div>
          </div>
        </div>

        <div style={styles.historyPageCard}>
          <div style={styles.cardTopLine} />
          <div style={styles.historyPageList}>
            {visibleHistory.length === 0 ? (
              <div style={styles.historyEmpty}>Bugün işlem kaydı bulunmuyor.</div>
            ) : (
              visibleHistory.map((item) => {
                const itemDate = txTimeToDate(item.createdAt);
                const productType = isBreadLike(item.productType, item.productName)
                  ? "ekmek"
                  : "pide";

                return (
                  <div key={item.id} style={styles.historyRow}>
                    <div style={styles.historyRowLeft}>
                      <div style={styles.historyTitle}>{formatTransactionLabel(item)}</div>
                      <div style={styles.historyMeta}>
                        {formatClock(itemDate)} • {getProductLabel(productType)}
                      </div>
                    </div>

                    <div style={styles.historyBadge}>{normalizeCount(item)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

return (
  <div style={styles.screen}>
    <div style={styles.bgGlowOne} />
    <div style={styles.bgGlowTwo} />

      {successPopup.open ? (
        <div style={styles.successPopupOverlay}>
          <div style={styles.successPopupCard}>
            <div style={styles.successPopupGlow} />
            <div style={styles.successPopupIcon}>✓</div>
            <div style={styles.successPopupTitle}>{successPopup.title}</div>
            <div style={styles.successPopupMessage}>{successPopup.message}</div>
          </div>
        </div>
      ) : null}

      {keypadOpen ? (
        <div style={styles.overlay}>
          <div
            style={{
              ...styles.compactKeypadModal,
              width: `min(94vw, ${layoutVars.keypadWidth}px)`,
              padding: layoutVars.keypadPadding,
            }}
          >
            <div style={styles.modalTopBar} />
            <div style={styles.compactKeypadHeader}>
              <div>
                <div style={styles.compactKeypadTitle}>
                  {keypadTarget === "add-ekmek" ? "Eklenecek Adet" : keypadTarget === "deliver-pide" ? "Verilecek Pide" : "Düşürülecek Adet"}
                </div>
                <div style={styles.compactKeypadSubTitle}>
                  Rakam girip işlemi onayla
                </div>
              </div>

              <button type="button" onClick={closeKeypad} style={styles.modalCloseButton}>
                ✕
              </button>
            </div>

            <div style={styles.compactKeypadDisplay}>{keypadValue || "0"}</div>

            <div
              style={{
                ...styles.compactKeypadGrid,
                gap: layoutVars.keypadGap,
              }}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadDigit(digit)}
                  style={{
                    ...styles.compactKeypadButton,
                    minHeight: layoutVars.keypadBtnHeight,
                  }}
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                style={{
                  ...styles.compactKeypadAltButton,
                  minHeight: layoutVars.keypadBtnHeight,
                }}
              >
                TEMİZLE
              </button>

              <button
                type="button"
                onClick={() => handleKeypadDigit("0")}
                style={{
                  ...styles.compactKeypadButton,
                  minHeight: layoutVars.keypadBtnHeight,
                }}
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                style={{
                  ...styles.compactKeypadAltButton,
                  minHeight: layoutVars.keypadBtnHeight,
                }}
              >
                SİL
              </button>
            </div>

            <div style={styles.compactKeypadActions}>
              <button type="button" onClick={closeKeypad} style={styles.modalSecondaryButton}>
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleKeypadConfirm}
                disabled={busy || busyAction !== null}
                style={{
                  ...styles.modalPrimaryButton,
                  ...(busy || busyAction !== null ? styles.buttonDisabled : {}),
                }}
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog.open ? (
        <div style={styles.overlay}>
          <div style={styles.dialogModal}>
            <div style={styles.modalTopBar} />
            <div
              style={{
                ...styles.dialogIconWrap,
                ...(dialog.kind === "error"
                  ? styles.dialogIconError
                  : dialog.kind === "warning"
                  ? styles.dialogIconWarning
                  : dialog.kind === "success"
                  ? styles.dialogIconSuccess
                  : dialog.kind === "confirm"
                  ? styles.dialogIconConfirm
                  : styles.dialogIconInfo),
              }}
            >
              {dialogIcon(dialog.kind)}
            </div>

            <div style={styles.dialogTitle}>{dialog.title}</div>
            <div style={styles.dialogMessage}>
              {dialog.message.split("\n").map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>

            <div style={styles.dialogActions}>
              {dialog.kind === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => dialog.onCancel?.()}
                    style={styles.modalSecondaryButton}
                  >
                    {dialog.cancelText || "Vazgeç"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dialog.onConfirm?.()}
                    style={styles.modalPrimaryButton}
                  >
                    {dialog.confirmText || "Devam Et"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => dialog.onConfirm?.()}
                  style={styles.modalPrimaryButton}
                >
                  {dialog.confirmText || "Tamam"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          ...styles.appShell,
          padding: layoutVars.shellPadding,
          gap: layoutVars.pageGap,
        }}
      >
        <div
          style={{
            ...styles.header,
            padding: layoutVars.headerPadding,
          }}
        >
          <div style={styles.headerTopLine} />
          <div style={styles.headerMain}>
            <div style={styles.headerLeft}>
              <div style={styles.headerKicker}>TABELA MODU</div>
              <div
                style={{
                  ...styles.title,
                  fontSize: layoutVars.headerTitleSize,
                }}
              >
                {bakery?.bakeryName || "Tabela Modu"}
              </div>
              <div style={styles.titleAccent} />

              <div style={styles.headerUtilityRow}>
                <div
                  style={{
                    ...styles.headerMetaPill,
                    fontSize: "18px",
                    fontWeight: 900,
                    background: "#fff3cd",
                    color: "#7a4b00",
                    padding: "12px 16px",
                  }}
                >
                  FIRIN KODU: {bakery ? (bakery.bakeryCode || "-") : "..."}
                </div>

                <div style={styles.headerMetaPill}>{todayKey()}</div>

                <div style={styles.liveBadge}>CANLI</div>

                <div
                  style={{
                    ...styles.statusBadge,
                    ...(online ? styles.statusBadgeOnline : styles.statusBadgeOffline),
                  }}
                >
                  {online ? "BAĞLANTI VAR" : "BAĞLANTI YOK"}
                </div>
              </div>

              <div
                style={{
                  ...styles.statusRow,
                  gap: layoutVars.statusWrapGap,
                }}
              >
                <div style={styles.statusText}>{statusText}</div>
                {canUndo ? (
                  <button type="button" onClick={undoLastAction} style={styles.undoButton}>
                    GERİ AL ({undoSeconds})
                  </button>
                ) : null}
                <button type="button" onClick={() => setHistoryOpen(true)} style={styles.undoButton}>
                  İŞLEM GEÇMİŞİ
                </button>
              </div>
            </div>

            <div style={styles.headerRight}>
              <div style={styles.clockPanel}>
                <div style={styles.clockLabel}>SAAT</div>
                <div style={styles.analogClock}>
                  <div style={styles.analogClockRing} />
                  <div style={styles.analogTickTop} />
                  <div style={styles.analogTickRight} />
                  <div style={styles.analogTickBottom} />
                  <div style={styles.analogTickLeft} />
                  <div
                    style={{
                      ...styles.analogHandHour,
                      transform: `translateX(-50%) rotate(${liveHourRotation}deg)`,
                    }}
                  />
                  <div
                    style={{
                      ...styles.analogHandMinute,
                      transform: `translateX(-50%) rotate(${liveMinuteRotation}deg)`,
                    }}
                  />
                  <div
                    style={{
                      ...styles.analogHandSecond,
                      transform: `translateX(-50%) rotate(${liveSecondRotation}deg)`,
                    }}
                  />
                  <div style={styles.analogClockCenter} />
                </div>
                <div
                  style={{
                    ...styles.clock,
                    fontSize: layoutVars.clockSize,
                  }}
                >
                  {formatClock(liveTime)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

        <div
          style={{
            ...styles.dashboardGrid,
            gridTemplateRows: layoutVars.heroRows,
            gap: layoutVars.pageGap,
          }}
        >
          <div
            style={{
              ...styles.heroCard,
              padding: layoutVars.cardPadding,
            }}
          >
            <div style={styles.cardTopLine} />
            <div style={styles.heroInner}>
              <div style={styles.heroBoard}>
                <div style={{ ...styles.heroWord, ...styles.heroWordLeft }}>ASKIDA</div>
                <div
                  style={{
                    ...styles.heroNumberBadge,
                    fontSize: layoutVars.heroNumberSize,
                  }}
                >
                 {summary.pendingEkmek ?? "..."}
                </div>
                <div style={{ ...styles.heroWord, ...styles.heroWordRight }}>EKMEK</div>
              </div>
              <div style={styles.heroLeft}>
                <div style={styles.heroLabel}>ASKIDAKİ EKMEK</div>
                <div
                  style={{
                    ...styles.heroNumber,
                    fontSize: layoutVars.heroNumberSize,
                  }}
                >
                  {summary.pendingEkmek ?? "..."}
                </div>
                <div style={styles.heroHint}>Güncel askı bakiyesi</div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.middleGrid,
              gap: layoutVars.pageGap,
            }}
          >
            <div
              style={{
                ...styles.actionCard,
                padding: layoutVars.actionCardPadding,
              }}
            >
              <div style={styles.cardTopLine} />
              <button
                type="button"
                onClick={() => openKeypad("add-ekmek")}
                disabled={busy || busyAction !== null}
                style={{
                  ...styles.kioskActionButton,
                  ...styles.kioskAddButton,
                  minHeight: layoutVars.actionButtonMinHeight,
                  ...(busy || busyAction !== null ? styles.buttonDisabled : {}),
                }}
              >
                <span style={styles.kioskActionTop}>NAKİT İŞLEM</span>
                <span style={styles.kioskActionMain}>ASKIYA EKLE</span>
                <span style={styles.kioskActionBottom}>Tuştan adet gir</span>
              </button>
            </div>

            <div
              style={{
                ...styles.actionCard,
                padding: layoutVars.actionCardPadding,
              }}
            >
              <div style={styles.cardTopLine} />
              <button
                type="button"
                onClick={() => openKeypad("deliver-ekmek")}
                disabled={busy || busyAction !== null}
                style={{
                  ...styles.kioskActionButton,
                  ...styles.kioskGiveButton,
                  minHeight: layoutVars.actionButtonMinHeight,
                  ...(busy || busyAction !== null ? styles.buttonDisabled : {}),
                }}
              >
                <span style={styles.kioskActionTop}>HIZLI TESLİM</span>
                <span style={styles.kioskActionMain}>ASKIDAN DÜŞ</span>
                <span style={styles.kioskActionBottom}>Tuştan adet gir</span>
              </button>
            </div>
          </div>

          <div
            style={{
              ...styles.lowerGrid,
              gap: layoutVars.pageGap,
            }}
          >
            <div
              style={{
                ...styles.summaryGrid,
                gap: layoutVars.pageGap,
              }}
            >
              <div
                style={{
                  ...styles.summaryCard,
                  padding: layoutVars.cardPadding,
                }}
              >
                <div style={styles.cardTopLine} />
                <div style={styles.summaryLabel}>BUGÜN GELEN</div>
                <div
                  style={{
                    ...styles.summaryNumber,
                    fontSize: layoutVars.summaryNumberSize,
                  }}
                >
                  {summary.todayIncomingEkmek + summary.todayIncomingPide}
                </div>
                <div style={styles.summaryFoot}>Ekmek: {summary.todayIncomingEkmek} • Pide: {summary.todayIncomingPide}</div>
              </div>

              <div
                style={{
                  ...styles.summaryCard,
                  padding: layoutVars.cardPadding,
                }}
              >
                <div style={styles.cardTopLine} />
                <div style={styles.summaryLabel}>BUGÜN VERİLEN</div>
                <div
                  style={{
                    ...styles.summaryNumber,
                    fontSize: layoutVars.summaryNumberSize,
                  }}
                >
                  {summary.todayDeliveredEkmek + summary.todayDeliveredPide}
                </div>
                <div style={styles.summaryFoot}>Ekmek: {summary.todayDeliveredEkmek} • Pide: {summary.todayDeliveredPide}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    height: "100dvh",
    minHeight: "100dvh",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top left, #fff9f0 0%, #f8efdf 40%, #f1e2cc 100%)",
    color: "#3f2a1d",
    boxSizing: "border-box",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: "rgba(39, 26, 16, 0.48)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
  },
  appShell: {
    position: "relative",
    zIndex: 2,
    height: "100%",
    width: "100%",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    overflow: "hidden",
  },
  dashboardGrid: {
    minHeight: 0,
    display: "grid",
    overflow: "hidden",
  },
  lowerGrid: {
    minHeight: 0,
    display: "grid",
    overflow: "hidden",
  },
  bgGlowOne: {
    position: "fixed",
    top: -120,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "rgba(217, 164, 65, 0.12)",
    filter: "blur(18px)",
    pointerEvents: "none",
  },
  bgGlowTwo: {
    position: "fixed",
    bottom: -120,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(184, 92, 56, 0.08)",
    filter: "blur(18px)",
    pointerEvents: "none",
  },
  centerBox: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 12,
    padding: 20,
  },
  successPopupOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    pointerEvents: "none",
  },
  successPopupCard: {
    position: "relative",
    width: "min(92vw, 460px)",
    padding: "26px 24px 22px",
    borderRadius: 999,
    textAlign: "center",
    background: "linear-gradient(180deg, #fffefb 0%, #f5fbe9 100%)",
    border: "1px solid rgba(136, 170, 56, 0.22)",
    boxShadow:
      "0 34px 90px rgba(70, 96, 22, 0.22), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflow: "hidden",
  },
  successPopupGlow: {
    position: "absolute",
    top: -40,
    left: "50%",
    transform: "translateX(-50%)",
    width: 220,
    height: 120,
    borderRadius: "50%",
    background: "rgba(156, 196, 65, 0.18)",
    filter: "blur(18px)",
    pointerEvents: "none",
  },
  successPopupIcon: {
    position: "relative",
    width: 72,
    height: 72,
    margin: "0 auto 14px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    fontWeight: 900,
    color: "#ffffff",
    background: "linear-gradient(180deg, #8ebb2f 0%, #688d1f 100%)",
    border: "1px solid rgba(255,255,255,0.36)",
    boxShadow: "0 16px 34px rgba(101, 134, 29, 0.28)",
  },
  successPopupTitle: {
    position: "relative",
    fontSize: "clamp(24px, 2.3vw, 30px)",
    lineHeight: 1.08,
    fontWeight: 900,
    letterSpacing: -0.6,
    color: "#355112",
    marginBottom: 8,
  },
  successPopupMessage: {
    position: "relative",
    fontSize: "clamp(18px, 1.8vw, 22px)",
    lineHeight: 1.3,
    fontWeight: 800,
    color: "#4b3822",
    whiteSpace: "pre-wrap",
  },
  compactKeypadModal: {
    position: "relative",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 22,
    boxShadow:
      "0 28px 70px rgba(70, 42, 17, 0.26), inset 0 1px 0 rgba(255,255,255,0.88)",
    overflow: "hidden",
  },
  modalTopBar: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, #d9a441 0%, #f0c86c 50%, #c98531 100%)",
  },
  compactKeypadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  compactKeypadTitle: {
    fontSize: "clamp(18px, 2vw, 22px)",
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#3f2a1d",
    letterSpacing: -0.3,
  },
  compactKeypadSubTitle: {
    marginTop: 4,
    fontSize: "clamp(11px, 1vw, 13px)",
    lineHeight: 1.3,
    fontWeight: 600,
    color: "#8a6a45",
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(196, 154, 81, 0.28)",
    background: "linear-gradient(180deg, #f8edd8 0%, #f2dfba 100%)",
    color: "#7b4b20",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },
  compactKeypadDisplay: {
    minHeight: 70,
    borderRadius: 16,
    border: "1px solid rgba(196, 154, 81, 0.28)",
    background: "linear-gradient(180deg, #fffdfa 0%, #fff7ee 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    fontSize: "clamp(30px, 5vw, 48px)",
    fontWeight: 800,
    letterSpacing: -1.5,
    color: "#3f2a1d",
    marginBottom: 10,
  },
  compactKeypadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    marginBottom: 10,
  },
  compactKeypadButton: {
    borderRadius: 16,
    border: "1px solid rgba(196, 154, 81, 0.28)",
    background: "linear-gradient(180deg, #fffdf9 0%, #f9efe0 100%)",
    color: "#3f2a1d",
    fontSize: "clamp(22px, 3vw, 30px)",
    fontWeight: 800,
    letterSpacing: -0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(111, 78, 36, 0.08)",
  },
  compactKeypadAltButton: {
    borderRadius: 16,
    border: "1px solid rgba(196, 154, 81, 0.28)",
    background: "linear-gradient(180deg, #f7ead4 0%, #efd7a8 100%)",
    color: "#7b4b20",
    fontSize: "clamp(11px, 1.1vw, 14px)",
    fontWeight: 800,
    letterSpacing: 0.2,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(111, 78, 36, 0.08)",
  },
  compactKeypadActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  dialogModal: {
    position: "relative",
    width: "min(92vw, 460px)",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 24,
    padding: "22px 18px 18px",
    boxShadow:
      "0 34px 90px rgba(70, 42, 17, 0.30), inset 0 1px 0 rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  dialogIconWrap: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    margin: "0 auto 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 900,
    border: "1px solid transparent",
  },
  dialogIconInfo: {
    background: "rgba(88, 118, 171, 0.12)",
    color: "#46618d",
    borderColor: "rgba(88, 118, 171, 0.2)",
  },
  dialogIconWarning: {
    background: "rgba(217, 164, 65, 0.14)",
    color: "#9a6b1d",
    borderColor: "rgba(217, 164, 65, 0.2)",
  },
  dialogIconError: {
    background: "rgba(184, 92, 56, 0.12)",
    color: "#a14a2b",
    borderColor: "rgba(184, 92, 56, 0.2)",
  },
  dialogIconSuccess: {
    background: "rgba(111, 148, 39, 0.12)",
    color: "#5a7a18",
    borderColor: "rgba(111, 148, 39, 0.2)",
  },
  dialogIconConfirm: {
    background: "rgba(123, 75, 32, 0.1)",
    color: "#7b4b20",
    borderColor: "rgba(123, 75, 32, 0.18)",
  },
  dialogTitle: {
    fontSize: "clamp(20px, 2vw, 26px)",
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#3f2a1d",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: "clamp(14px, 1.4vw, 16px)",
    lineHeight: 1.5,
    color: "#6f5538",
    fontWeight: 600,
    marginBottom: 18,
    whiteSpace: "pre-wrap",
  },
  dialogActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  modalPrimaryButton: {
    minHeight: 50,
    borderRadius: 16,
    border: "1px solid rgba(72, 99, 17, 0.18)",
    background: "linear-gradient(180deg, #7fa32c 0%, #678721 100%)",
    color: "#fffef8",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(85, 112, 23, 0.18)",
  },
  modalSecondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    border: "1px solid rgba(196, 154, 81, 0.28)",
    background: "linear-gradient(180deg, #fffdf9 0%, #f5ebdd 100%)",
    color: "#7b4b20",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  header: {
    position: "relative",
    minHeight: 0,
    background: "rgba(255, 250, 242, 0.90)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 30,
    boxShadow:
      "0 20px 50px rgba(111, 78, 36, 0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
    overflow: "hidden",
  },
  headerMain: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 18,
    minHeight: 0,
  },
  headerLeft: {
    minWidth: 0,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
  },
  headerTopLine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, #d9a441 0%, #f0c86c 50%, #c98531 100%)",
  },
  headerRight: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    lineHeight: 0.88,
    fontWeight: 900,
    letterSpacing: -2.2,
    color: "#2a170c",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    textShadow: "0 2px 0 rgba(255,255,255,0.52), 0 14px 28px rgba(95, 57, 24, 0.08)",
    maxWidth: "100%",
  },
  headerKicker: {
    fontSize: "clamp(11px, 0.95vw, 13px)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: 2.4,
    color: "#9a6b1d",
    textTransform: "uppercase",
  },
  titleAccent: {
    width: "clamp(110px, 12vw, 180px)",
    height: 5,
    borderRadius: 999,
    background: "linear-gradient(90deg, #d9a441 0%, #f0c86c 55%, rgba(240, 200, 108, 0) 100%)",
    boxShadow: "0 8px 18px rgba(201, 133, 49, 0.18)",
  },
  headerUtilityRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  headerMetaPill: {
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: "clamp(12px, 1.2vw, 15px)",
    lineHeight: 1,
    fontWeight: 800,
    color: "#6b4a2d",
    background: "rgba(123, 75, 32, 0.08)",
    border: "1px solid rgba(123, 75, 32, 0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
  },
  statusRow: {
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
  },
  statusBadge: {
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    border: "1px solid transparent",
  },
  statusBadgeOnline: {
    background: "rgba(111, 148, 39, 0.12)",
    color: "#56721a",
    borderColor: "rgba(111, 148, 39, 0.18)",
  },
  statusBadgeOffline: {
    background: "rgba(184, 92, 56, 0.10)",
    color: "#9d4627",
    borderColor: "rgba(184, 92, 56, 0.16)",
  },
  statusText: {
    fontSize: "clamp(13px, 1.35vw, 15px)",
    lineHeight: 1.35,
    color: "#7a5a3a",
    fontWeight: 700,
  },
  undoButton: {
    border: "1px solid rgba(63, 42, 29, 0.12)",
    background: "linear-gradient(180deg, #ffffff 0%, #f4ead9 100%)",
    color: "#4f3321",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.2,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(111, 78, 36, 0.08)",
  },
  historyBackButton: {
    minHeight: 54,
    border: "1px solid rgba(63, 42, 29, 0.12)",
    background: "linear-gradient(180deg, #ffffff 0%, #f4ead9 100%)",
    color: "#4f3321",
    borderRadius: 16,
    padding: "0 18px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.3,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(111, 78, 36, 0.08)",
  },
  historyPageCard: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 30,
    boxShadow:
      "0 24px 55px rgba(111, 78, 36, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
    overflow: "hidden",
    padding: "24px 22px 22px",
  },
  historyPageList: {
    minHeight: 0,
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingTop: 12,
  },
  historyModal: {
    width: "min(92vw, 720px)",
    maxHeight: "78vh",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 24,
    boxShadow:
      "0 34px 90px rgba(70, 42, 17, 0.30), inset 0 1px 0 rgba(255,255,255,0.88)",
    padding: "22px 18px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  historyList: {
    maxHeight: "60vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingRight: 4,
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(221, 197, 161, 0.85)",
  },
  historyRowLeft: {
    minWidth: 0,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  historyTitle: {
    fontSize: "clamp(16px, 1.6vw, 20px)",
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#3f2a1d",
  },
  historyMeta: {
    fontSize: "clamp(12px, 1.1vw, 14px)",
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#7a5a3a",
  },
  historyBadge: {
    minWidth: 56,
    height: 56,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #d64545 0%, #b62020 100%)",
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.8,
    flexShrink: 0,
  },
  historyEmpty: {
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontSize: "clamp(18px, 1.8vw, 24px)",
    fontWeight: 800,
    color: "#7a5a3a",
  },
  clockPanel: {
    minWidth: "clamp(132px, 13vw, 168px)",
    padding: "12px 14px 14px",
    borderRadius: 28,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,234,217,0.98) 100%)",
    border: "1px solid rgba(196, 154, 81, 0.28)",
    boxShadow: "0 22px 40px rgba(111, 78, 36, 0.14), inset 0 1px 0 rgba(255,255,255,0.82)",
  },
  clockLabel: {
    fontSize: "clamp(11px, 1vw, 13px)",
    fontWeight: 800,
    letterSpacing: 1.6,
    color: "#8b5b1f",
    marginBottom: 0,
  },
  analogClock: {
    position: "relative",
    width: 74,
    height: 74,
    borderRadius: "50%",
    background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(248,239,224,0.96) 58%, rgba(228,205,171,0.98) 100%)",
    border: "2px solid rgba(183, 135, 67, 0.38)",
    boxShadow: "0 12px 24px rgba(111, 78, 36, 0.16), inset 0 2px 4px rgba(255,255,255,0.84)",
  },
  analogClockRing: {
    position: "absolute",
    inset: 6,
    borderRadius: "50%",
    border: "1px solid rgba(181, 136, 73, 0.28)",
  },
  analogTickTop: {
    position: "absolute",
    top: 8,
    left: "50%",
    width: 3,
    height: 10,
    borderRadius: 999,
    background: "#9a5a1b",
    transform: "translateX(-50%)",
  },
  analogTickRight: {
    position: "absolute",
    right: 8,
    top: "50%",
    width: 10,
    height: 3,
    borderRadius: 999,
    background: "#9a5a1b",
    transform: "translateY(-50%)",
  },
  analogTickBottom: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    width: 3,
    height: 10,
    borderRadius: 999,
    background: "#9a5a1b",
    transform: "translateX(-50%)",
  },
  analogTickLeft: {
    position: "absolute",
    left: 8,
    top: "50%",
    width: 10,
    height: 3,
    borderRadius: 999,
    background: "#9a5a1b",
    transform: "translateY(-50%)",
  },
  analogHandHour: {
    position: "absolute",
    left: "50%",
    bottom: "50%",
    width: 5,
    height: 19,
    borderRadius: 999,
    background: "#5d3417",
    transformOrigin: "center bottom",
    boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
  },
  analogHandMinute: {
    position: "absolute",
    left: "50%",
    bottom: "50%",
    width: 3,
    height: 25,
    borderRadius: 999,
    background: "#8b4d1f",
    transformOrigin: "center bottom",
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  analogHandSecond: {
    position: "absolute",
    left: "50%",
    bottom: "50%",
    width: 2,
    height: 29,
    borderRadius: 999,
    background: "#c64532",
    transformOrigin: "center bottom",
    opacity: 0.92,
  },
  analogClockCenter: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#fff7eb",
    border: "3px solid #9a5a1b",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  clock: {
    fontWeight: 900,
    letterSpacing: -1.1,
    color: "#6a3d18",
    minWidth: 84,
    textAlign: "center",
    textShadow: "0 1px 0 rgba(255,255,255,0.65)",
  },
  liveBadge: {
    background: "linear-gradient(135deg, #ecd08d 0%, #d9a441 100%)",
    color: "#4b2e1f",
    fontWeight: 700,
    fontSize: 13,
    padding: "12px 16px",
    borderRadius: 16,
    letterSpacing: 0.4,
    border: "1px solid rgba(143, 100, 40, 0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
  },
  errorBox: {
    background: "#fff1ec",
    color: "#a1451f",
    border: "1px solid #efc4b1",
    padding: "12px 14px",
    borderRadius: 18,
    fontSize: 15,
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(161, 69, 31, 0.08)",
  },
  infoText: {
    fontSize: 22,
    fontWeight: 700,
  },
  subtleText: {
    fontSize: 16,
    color: "#7a5a3a",
    maxWidth: 680,
  },
  heroCard: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 30,
    boxShadow:
      "0 24px 55px rgba(111, 78, 36, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  cardTopLine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, #d9a441 0%, #f0c86c 50%, #c98531 100%)",
  },
  heroInner: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
    minHeight: 0,
    textAlign: "center",
  },
  heroBoard: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: 8,
  },
  heroWord: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    fontSize: "clamp(64px, 8vw, 120px)",
    lineHeight: 0.88,
    fontWeight: 800,
    letterSpacing: -2.2,
    color: "#3f2a1d",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  heroWordLeft: {
    justifySelf: "stretch",
    justifyContent: "flex-end",
    textAlign: "right",
  },
  heroWordRight: {
    justifySelf: "stretch",
    justifyContent: "flex-start",
    textAlign: "left",
  },
  heroNumberBadge: {
    minWidth: "clamp(148px, 18vw, 248px)",
    minHeight: "clamp(82px, 10.5vw, 126px)",
    padding: "10px 28px",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #d64545 0%, #b62020 100%)",
    color: "#ffffff",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: -2.4,
    boxShadow: "0 24px 44px rgba(160, 24, 24, 0.24)",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  heroLeft: {
    display: "none",
    gridTemplateRows: "auto 1fr auto",
    alignItems: "center",
    justifyItems: "center",
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    height: "100%",
  },
  heroLabel: {
    fontSize: "clamp(16px, 1.6vw, 22px)",
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: 0.1,
    color: "#7b4b20",
  },
  heroNumber: {
    lineHeight: 0.92,
    fontWeight: 800,
    letterSpacing: -4,
    color: "#3f2a1d",
    textShadow: "0 2px 0 rgba(255,255,255,0.45)",
  },
  heroHint: {
    fontSize: "clamp(11px, 1.1vw, 13px)",
    lineHeight: 1.25,
    fontWeight: 600,
    color: "#8a6a45",
    maxWidth: 320,
  },
  middleGrid: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    overflow: "hidden",
  },
  actionCard: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(231, 215, 189, 0.95)",
    borderRadius: 28,
    boxShadow:
      "0 20px 50px rgba(111, 78, 36, 0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: "clamp(18px, 2vw, 24px)",
    lineHeight: 1.04,
    fontWeight: 800,
    letterSpacing: 0.08,
    color: "#7b4b20",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: "clamp(12px, 1.1vw, 15px)",
    lineHeight: 1.25,
    color: "#8a6a45",
    fontWeight: 700,
    marginBottom: 14,
    minHeight: 18,
    maxHeight: 22,
    overflow: "hidden",
  },
  kioskActionButton: {
    width: "100%",
    flex: 1,
    borderRadius: 30,
    border: "2px solid rgba(255,255,255,0.34)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    boxShadow: "0 28px 56px rgba(63,42,29,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
    textAlign: "center",
    padding: "14px 12px",
    position: "relative",
    overflow: "hidden",
  },
  kioskAddButton: {
    background: "linear-gradient(180deg, #95c33a 0%, #5b8113 100%)",
    color: "#fffef8",
  },
  kioskGiveButton: {
    background: "linear-gradient(180deg, #df7647 0%, #a92a18 100%)",
    color: "#fffef8",
  },
  kioskActionTop: {
    fontSize: "clamp(11px, 1.05vw, 14px)",
    fontWeight: 800,
    letterSpacing: 0.6,
    opacity: 1,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.28)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
    display: "block",
    maxWidth: "100%",
    whiteSpace: "normal",
    lineHeight: 1.15,
  },
  kioskActionMain: {
    fontSize: "clamp(24px, 2.7vw, 34px)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: -0.6,
    textShadow: "0 3px 12px rgba(0,0,0,0.16)",
    display: "block",
    maxWidth: "100%",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
  },
  kioskActionBottom: {
    fontSize: "clamp(11px, 1.05vw, 14px)",
    fontWeight: 700,
    opacity: 0.98,
    padding: "6px 10px",
    borderRadius: 14,
    background: "rgba(35,22,14,0.16)",
    display: "block",
    maxWidth: "100%",
    whiteSpace: "normal",
    lineHeight: 1.15,
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  summaryGrid: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    overflow: "hidden",
  },
  summaryCard: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%)",
    border: "1px solid rgba(221, 197, 161, 0.95)",
    borderRadius: 26,
    boxShadow:
      "0 24px 54px rgba(111, 78, 36, 0.12), inset 0 1px 0 rgba(255,255,255,0.88)",
    overflow: "hidden",
  },
  summaryLabel: {
    fontSize: "clamp(15px, 1.6vw, 20px)",
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: 0.12,
    color: "#7b4b20",
  },
  summaryNumber: {
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: -2.4,
    color: "#352115",
    textShadow: "0 1px 0 rgba(255,255,255,0.4), 0 10px 20px rgba(95, 57, 24, 0.08)",
  },
  summaryFoot: {
    fontSize: "clamp(13px, 1.15vw, 16px)",
    lineHeight: 1.28,
    fontWeight: 700,
    color: "#6f5538",
    display: "block",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    padding: "8px 12px",
    borderRadius: 14,
    background: "rgba(123, 75, 32, 0.08)",
  },
};
