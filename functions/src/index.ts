import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

type CreateBakerAccountRequest = {
  bakeryId: string;
  email: string;
  password: string;
};

export const createBakerAccount = onCall<CreateBakerAccountRequest>(
  async (request) => {
    const data = request.data;

    const bakeryId = String(data?.bakeryId || "").trim();
    const email = String(data?.email || "").trim().toLowerCase();
    const password = String(data?.password || "");

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Önce giriş yapmalısınız.");
    }

    if (!bakeryId) {
      throw new HttpsError("invalid-argument", "bakeryId zorunludur.");
    }

    if (!email) {
      throw new HttpsError("invalid-argument", "email zorunludur.");
    }

    if (!password || password.length < 6) {
      throw new HttpsError("invalid-argument", "Şifre en az 6 karakter olmalıdır.");
    }

    const db = getFirestore();
    const auth = getAuth();

    const bakeryRef = db.collection("bakeries").doc(bakeryId);
    const bakerySnap = await bakeryRef.get();

    if (!bakerySnap.exists) {
      throw new HttpsError("not-found", "Fırın kaydı bulunamadı.");
    }

    const bakeryData = bakerySnap.data() || {};

    if (bakeryData.bakerUid) {
      throw new HttpsError(
        "already-exists",
        "Bu fırına zaten bir fırıncı hesabı bağlanmış."
      );
    }

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });
    } catch (err: any) {
      if (err?.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Bu e-posta ile zaten bir kullanıcı var."
        );
      }
      throw new HttpsError(
        "internal",
        err?.message || "Kullanıcı oluşturulamadı."
      );
    }

    await bakeryRef.update({
      bakerUid: userRecord.uid,
      bakerEmail: email,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      uid: userRecord.uid,
      email,
      bakeryId,
    };
  }
);