import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireRole from './components/RequireRole.jsx';
import { ROLE } from './auth/permissions.js';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ProductFormPage from './pages/ProductFormPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import NewOrderPage from './pages/NewOrderPage.jsx';
import PurchaseAssistantPage from './pages/PurchaseAssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import InsumosPage from './pages/InsumosPage.jsx';
import InsumoFormPage from './pages/InsumoFormPage.jsx';

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
      <Route index element={<DashboardPage />} />
      <Route path="admin" element={<RequireRole roles={[ROLE.ADMIN]}><AdminPage /></RequireRole>} />
      <Route path="productos" element={<ProductsPage />} />
      <Route path="insumos" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER]}><InsumosPage /></RequireRole>} />
      <Route path="insumos/nuevo" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER]}><InsumoFormPage /></RequireRole>} />
      <Route path="insumos/:id/editar" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER]}><InsumoFormPage /></RequireRole>} />
      <Route path="inventario" element={<Navigate to="/insumos" replace />} />
      <Route path="productos/nuevo" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER]}><ProductFormPage /></RequireRole>} />
      <Route path="productos/:id/editar" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER]}><ProductFormPage /></RequireRole>} />
      <Route path="productos/:id" element={<ProductDetailPage />} />
      <Route path="pedidos" element={<OrdersPage />} />
      <Route path="pedidos/nuevo" element={<NewOrderPage />} />
      <Route path="asistente-compras" element={<RequireRole roles={[ROLE.ADMIN, ROLE.MANAGER]}><PurchaseAssistantPage /></RequireRole>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
