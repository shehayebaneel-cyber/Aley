import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { About } from "./pages/About";
import { BusinessProfile } from "./pages/BusinessProfile";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Contact } from "./pages/Contact";
import { MyOrders } from "./pages/MyOrders";
import { OrderTracking } from "./pages/OrderTracking";
import { Events } from "./pages/Events";
import { Explore } from "./pages/Explore";
import { Home } from "./pages/Home";
import { MapPage } from "./pages/MapPage";
import { NotFound } from "./pages/NotFound";
import { Offers } from "./pages/Offers";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Saved } from "./pages/Saved";
import { AdminBusinesses } from "./pages/admin/AdminBusinesses";
import { AdminBusinessEdit } from "./pages/admin/AdminBusinessEdit";
import { AdminCategories } from "./pages/admin/AdminCategories";
import { AdminCities } from "./pages/admin/AdminCities";
import { AdminContent } from "./pages/admin/AdminContent";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminEventsOffers } from "./pages/admin/AdminEventsOffers";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminMarketplace } from "./pages/admin/AdminMarketplace";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminReviews } from "./pages/admin/AdminReviews";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { BusinessDashboard } from "./pages/owner/BusinessDashboard";
import { OwnerHome } from "./pages/owner/OwnerHome";
import { OwnerLayout } from "./pages/owner/OwnerLayout";
import { OwnerLogin } from "./pages/owner/OwnerLogin";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          {/* Categories merged into Explore's browse-by-category landing — keep old links working */}
          <Route path="/categories" element={<Navigate to="/explore" replace />} />
          <Route path="/business/:slug" element={<BusinessProfile />} />
          <Route path="/events" element={<Events />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          {/* Love Aley merged into Community Projects — keep old links working */}
          <Route path="/love-aley" element={<Navigate to="/projects" replace />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:number" element={<OrderTracking />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Business owner dashboard (own chrome, no public layout) */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<OwnerHome />} />
          <Route path="b/:id" element={<BusinessDashboard />} />
        </Route>

        {/* Admin panel */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="businesses/:id" element={<AdminBusinessEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="events-offers" element={<AdminEventsOffers />} />
          <Route path="cities" element={<AdminCities />} />
          <Route path="marketplace" element={<AdminMarketplace />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </>
  );
}
