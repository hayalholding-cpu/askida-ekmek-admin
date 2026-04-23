export default function AdminUsers() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: "#111827" }}>
          Admin Yönetimi
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Ana admin burada yeni admin ekleyebilecek ve yetki atayabilecek.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            color: "#1e3a8a",
            padding: 14,
            borderRadius: 10,
            lineHeight: 1.6,
          }}
        >
          Bu alan bir sonraki adımda geliştirilecek.
          <br />
          Burada ana admin başka admin oluşturacak ve şu yetkileri verecek:
          görüntüleme, düzenleme, silme, tam yetki.
        </div>
      </div>
    </div>
  );
}