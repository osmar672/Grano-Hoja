import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ProductFormPage from './pages/ProductFormPage.jsx';
import InsumosPage from './pages/InsumosPage.jsx';
import InsumoFormPage from './pages/InsumoFormPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import NewOrderPage from './pages/NewOrderPage.jsx';
import PurchaseAssistantPage from './pages/PurchaseAssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<DashboardPage />} />
    <Route path="productos" element={<ProductsPage />} />
    <Route path="productos/nuevo" element={<ProductFormPage />} />
    <Route path="productos/:id/editar" element={<ProductFormPage />} />
    <Route path="productos/:id" element={<ProductDetailPage />} />
    <Route path="insumos" element={<InsumosPage />} />
    <Route path="insumos/nuevo" element={<InsumoFormPage />} />
    <Route path="insumos/:id/editar" element={<InsumoFormPage />} />
    <Route path="pedidos" element={<OrdersPage />} />
    <Route path="pedidos/nuevo" element={<NewOrderPage />} />
    <Route path="asistente-compras" element={<PurchaseAssistantPage />} />
    <Route path="404" element={<NotFoundPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route></Routes>;
}
