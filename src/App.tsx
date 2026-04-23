import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminPanel from "./admin-panel";
import AdminCreateBaker from "./AdminCreateBaker";
import AdminBakeries from "./AdminBakeries";
import AdminBakeryDetail from "./AdminBakeryDetail";
import AdminTransactions from "./AdminTransactions";
import AdminProducts from "./AdminProducts";
import FirinciLogin from "./firinci-login";
import FirinciPanel from "./firinci-panel";
import TabelaMode from "./admin/pages/TabelaMode";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin-login" replace />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPanel />} />
          <Route path="create-baker" element={<AdminCreateBaker />} />
          <Route path="bakeries" element={<AdminBakeries />} />
          <Route path="bakeries/:uid" element={<AdminBakeryDetail />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>

<Route path="/tabela/:bakeryId" element={<TabelaMode />} />
<Route path="/tabela" element={<TabelaMode />} />

        <Route path="/firinci-login" element={<FirinciLogin />} />
        <Route path="/firinci-panel" element={<FirinciPanel />} />

        <Route path="*" element={<Navigate to="/admin-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}