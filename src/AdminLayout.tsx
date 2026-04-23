import { Link, Outlet, useLocation } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "Fırıncı Ekle", path: "/admin/create-baker" },
  { label: "Fırın Listesi", path: "/admin/bakeries" },
  { label: "İşlem Geçmişi", path: "/admin/transactions" },
  { label: "Ürünler", path: "/admin/products" },
  { label: "Admin Yönetimi", path: "/admin/admin-users" },
];

export default function AdminLayout() {
  const location = useLocation();

  function isActivePath(path: string) {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f4f6f8",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          width: 260,
          background: "#111827",
          color: "#ffffff",
          padding: 24,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Askıda Ekmek
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#9ca3af",
              lineHeight: 1.5,
            }}
          >
            Admin Yönetim Paneli
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menuItems.map((item) => {
            const active = isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: "none",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: active ? "#1f2937" : "transparent",
                  color: active ? "#ffffff" : "#d1d5db",
                  fontWeight: active ? 700 : 500,
                  border: active ? "1px solid #374151" : "1px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            color: "#9ca3af",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Bu panelden fırınlar, ürünler, işlemler ve admin yetkileri yönetilecektir.
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            height: 72,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            boxSizing: "border-box",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Yönetim Paneli
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginTop: 4,
              }}
            >
              Tüm işlemler tek merkezden yönetilir
            </div>
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#374151",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              padding: "10px 14px",
              borderRadius: 10,
            }}
          >
            Ana Admin
          </div>
        </header>

        <div style={{ padding: 24, boxSizing: "border-box" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}