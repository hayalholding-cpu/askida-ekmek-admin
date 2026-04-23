import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 30, color: "#111827" }}>
            Ana Admin Paneli
          </h1>
          <p style={{ color: "#6b7280", marginTop: 8 }}>
            Tüm yönetim işlemlerini buradan yönetin.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <Link
            to="/admin/create-baker"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 22,
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 10,
               