import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: "#111827" }}>
          Dashboard
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Askıda Ekmek yönetim ekranına hoş geldiniz.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <Link to="/admin/create-baker" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Fırıncı Ekle</div>
            <div style={descStyle}>Yeni fırıncı hesabı oluştur.</div>
          </div>
        </Link>

        <Link to="/admin/bakeries" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Fırınlar</div>
            <div style={descStyle}>Kayıtlı tüm fırınları görüntüle.</div>
          </div>
        </Link>

        <Link to="/admin/transactions" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={cardStyle}>
            <div style={titleStyle}>İşlem Geçmişi</div>
            <div style={descStyle}>Gelen ve verilen ekmek hareketlerini incele.</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
  cursor: "pointer",
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 10,
};

const descStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#6b7280",
};