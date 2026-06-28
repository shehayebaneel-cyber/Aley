import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { About } from "./pages/About";
import { AiPage } from "./pages/AiPage";
import { Announcements } from "./pages/Announcements";
import { BusinessProfile } from "./pages/BusinessProfile";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Contact } from "./pages/Contact";
import { Delivery } from "./pages/Delivery";
import { DeliveryTracking } from "./pages/DeliveryTracking";
import { MyOrders } from "./pages/MyOrders";
import { MyBookings } from "./pages/MyBookings";
import { OrderTracking } from "./pages/OrderTracking";
import { Events } from "./pages/Events";
import { Explore } from "./pages/Explore";
import { Home } from "./pages/Home";
import { LostFound } from "./pages/LostFound";
import { MapPage } from "./pages/MapPage";
import { NotFound } from "./pages/NotFound";
import { Offers } from "./pages/Offers";
import { CommunitySoon } from "./pages/CommunitySoon";
import { Saved } from "./pages/Saved";
import { AdminAi } from "./pages/admin/AdminAi";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminAnnouncements } from "./pages/admin/AdminAnnouncements";
import { AdminBusinesses } from "./pages/admin/AdminBusinesses";
import { AdminBusinessEdit } from "./pages/admin/AdminBusinessEdit";
import { AdminCategories } from "./pages/admin/AdminCategories";
import { AdminLostFound } from "./pages/admin/AdminLostFound";
import { AdminCities } from "./pages/admin/AdminCities";
import { AdminClaims } from "./pages/admin/AdminClaims";
import { AdminNotifications } from "./pages/admin/AdminNotifications";
import { AdminContent } from "./pages/admin/AdminContent";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminDelivery } from "./pages/admin/AdminDelivery";
import { AdminDrivers } from "./pages/admin/AdminDrivers";
import { AdminEventsOffers } from "./pages/admin/AdminEventsOffers";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminMarketplace } from "./pages/admin/AdminMarketplace";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminReviews } from "./pages/admin/AdminReviews";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { BusinessDashboard } from "./pages/owner/BusinessDashboard";
import { OwnerHome } from "./pages/owner/OwnerHome";
import { OwnerLayout } from "./pages/owner/OwnerLayout";
import { OwnerLogin } from "./pages/owner/OwnerLogin";
import { DriverHome } from "./pages/driver/DriverHome";
import { DriverLayout } from "./pages/driver/DriverLayout";
import { DriverLogin } from "./pages/driver/DriverLogin";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

// Per-route browser/SEO title for static pages. Dynamic pages (business, project,
// order) set their own title via useTitle once their data loads.
const TITLES: Record<string, string> = {
  "/explore": "Explore Aley",
  "/events": "Events in Aley",
  "/offers": "Offers & deals",
  "/community": "Improve Aley",
  "/lost-found": "Lost & Found",
  "/notices": "Public Notices",
  "/delivery": "Delivery Service",
  "/ai": "Aley AI",
  "/map": "Map of Aley",
  "/about": "About",
  "/contact": "Contact",
  "/cart": "Your cart",
  "/checkout": "Checkout",
  "/orders": "My orders",
  "/bookings": "My appointments",
  "/saved": "Saved places",
};
function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === "/") document.title = "Aley — your city, online";
    else if (TITLES[pathname]) document.title = `${TITLES[pathname]} · Aley`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <TitleManager />
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
          {/* Community Projects moved to a future dedicated non-profit site. */}
          <Route path="/community" element={<CommunitySoon />} />
          <Route path="/projects" element={<Navigate to="/community" replace />} />
          <Route path="/projects/:slug" element={<Navigate to="/community" replace />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/notices" element={<Announcements />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/delivery/track/:number" element={<DeliveryTracking />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/love-aley" element={<Navigate to="/community" replace />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:number" element={<OrderTracking />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/bookings" element={<MyBookings />} />
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

        {/* Driver app (own chrome) */}
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<DriverHome />} />
        </Route>

        {/* Admin panel */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="ai" element={<AdminAi />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="businesses/:id" element={<AdminBusinessEdit />} />
          <Route path="claims" element={<AdminClaims />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="lost-found" element={<AdminLostFound />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="delivery" element={<AdminDelivery />} />
          <Route path="drivers" element={<AdminDrivers />} />
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
