import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import PublicLayout from "../layouts/PublicLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import ProtectedRoute from "../layouts/ProtectedRoute.jsx";

const HomePage = lazy(() => import("../pages/HomePage.jsx"));
const MarketplacePage = lazy(() => import("../pages/MarketplacePage.jsx"));
const ProductDetailsPage = lazy(
  () => import("../pages/ProductDetailsPage.jsx"),
);
const SellerDetailsPage = lazy(() => import("../pages/SellerDetailsPage.jsx"));
const CartPage = lazy(() => import("../pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage.jsx"));
const LoginPage = lazy(() =>
  import("../pages/AuthPages.jsx").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("../pages/AuthPages.jsx").then((m) => ({ default: m.RegisterPage })),
);
const VerificationCenterPage = lazy(() =>
  import("../pages/VerificationPages.jsx").then((m) => ({
    default: m.VerificationCenterPage,
  })),
);
const VerificationAdminPage = lazy(() =>
  import("../pages/VerificationPages.jsx").then((m) => ({
    default: m.VerificationAdminPage,
  })),
);
const OrdersPage = lazy(() =>
  import("../pages/OrdersPages.jsx").then((m) => ({ default: m.OrdersPage })),
);
const OrderDetailsPage = lazy(() =>
  import("../pages/OrdersPages.jsx").then((m) => ({
    default: m.OrderDetailsPage,
  })),
);
const OrderReviewPage = lazy(() =>
  import("../pages/ReviewPages.jsx").then((m) => ({
    default: m.OrderReviewPage,
  })),
);
const PlatformFeedbackPage = lazy(() =>
  import("../pages/ReviewPages.jsx").then((m) => ({
    default: m.PlatformFeedbackPage,
  })),
);
const NotificationsPage = lazy(() => import("../pages/NotificationsPage.jsx"));
const BulkHomePage = lazy(() =>
  import("../pages/BulkPages.jsx").then((m) => ({ default: m.BulkHomePage })),
);
const NewRequirementPage = lazy(() =>
  import("../pages/BulkPages.jsx").then((m) => ({
    default: m.NewRequirementPage,
  })),
);
const RequirementDetailsPage = lazy(() =>
  import("../pages/BulkPages.jsx").then((m) => ({
    default: m.RequirementDetailsPage,
  })),
);
const QuotationsPage = lazy(() =>
  import("../pages/BulkPages.jsx").then((m) => ({ default: m.QuotationsPage })),
);
const NegotiationPage = lazy(() =>
  import("../pages/BulkPages.jsx").then((m) => ({
    default: m.NegotiationPage,
  })),
);
const SellerDashboardPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.SellerDashboardPage,
  })),
);
const SellerProductsPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.SellerProductsPage,
  })),
);
const SellerOrdersPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.SellerOrdersPage,
  })),
);
const ProductFormPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.ProductFormPage,
  })),
);
const SellerRequestsPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.SellerRequestsPage,
  })),
);
const SellerQuotationsPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({
    default: m.SellerQuotationsPage,
  })),
);
const HarvestsPage = lazy(() =>
  import("../pages/SellerPages.jsx").then((m) => ({ default: m.HarvestsPage })),
);
const DemandBoardPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.DemandBoardPage,
  })),
);
const DemandForecastingPage = lazy(() =>
  import("../pages/DemandForecastingPage.jsx").then((m) => ({
    default: m.DemandForecastingPage,
  })),
);
const NewsPage = lazy(() =>
  import("../pages/NewsPage.jsx").then((m) => ({
    default: m.NewsPage,
  })),
);
const SurplusPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({ default: m.SurplusPage })),
);
const PriceIntelligencePage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.PriceIntelligencePage,
  })),
);
const QualityPassportPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.QualityPassportPage,
  })),
);
const FpoAggregationPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.FpoAggregationPage,
  })),
);
const SettlementsPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.SettlementsPage,
  })),
);
const FpoMembershipPage = lazy(() => import("../pages/FpoMembershipPage.jsx"));
const RecurringPage = lazy(
  () => import("../features/recurring/RecurringProcurementPage.jsx"),
);
const AnalyticsPage = lazy(() =>
  import("../pages/DomainPages.jsx").then((m) => ({
    default: m.AnalyticsPage,
  })),
);
const LogisticsDashboardPage = lazy(() =>
  import("../pages/LogisticsPages.jsx").then((m) => ({
    default: m.LogisticsDashboardPage,
  })),
);
const LogisticsPlannerPage = lazy(() =>
  import("../pages/LogisticsPages.jsx").then((m) => ({
    default: m.LogisticsPlannerPage,
  })),
);
const ShipmentDetailsPage = lazy(() =>
  import("../pages/LogisticsPages.jsx").then((m) => ({
    default: m.ShipmentDetailsPage,
  })),
);
const AdminPage = lazy(() =>
  import("../pages/LogisticsAdminPages.jsx").then((m) => ({
    default: m.AdminPage,
  })),
);
const FarmersPage = lazy(() =>
  import("../pages/StaticPages.jsx").then((m) => ({ default: m.FarmersPage })),
);
const ProfilePage = lazy(() =>
  import("../pages/AccountPages.jsx").then((m) => ({ default: m.ProfilePage })),
);
const SavedProductsPage = lazy(() =>
  import("../pages/AccountPages.jsx").then((m) => ({
    default: m.SavedProductsPage,
  })),
);
const UrbanStoresPage = lazy(() =>
  import("../pages/StorePages.jsx").then((m) => ({
    default: m.UrbanStoresPage,
  })),
);
const StoreOperationsPage = lazy(() =>
  import("../pages/StorePages.jsx").then((m) => ({
    default: m.StoreOperationsPage,
  })),
);
const PermissionDeniedPage = lazy(() =>
  import("../pages/StaticPages.jsx").then((m) => ({
    default: m.PermissionDeniedPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../pages/StaticPages.jsx").then((m) => ({ default: m.NotFoundPage })),
);
const SimpleDashboardPage = lazy(() =>
  import("../pages/StaticPages.jsx").then((m) => ({
    default: m.SimpleDashboardPage,
  })),
);

const buyerRoles = ["consumer", "business_buyer"];
const retailRoles = ["consumer"];
const producerRoles = ["farmer", "fpo_manager"];
const businessRoles = ["business_buyer"];
const logisticsRoles = ["driver", "logistics_partner", "logistics"];
const fleetRoles = ["logistics_partner", "logistics"];
const Protected = ({ roles, allowGuest, children }) => (
  <ProtectedRoute roles={roles} allowGuest={allowGuest}>
    {children}
  </ProtectedRoute>
);
export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton mt-5 h-64 w-full" />
        </div>
      }
    >
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route
            path="/demand-forecasting"
            element={<DemandForecastingPage />}
          />
          <Route
            path="/stores"
            element={
              <Protected roles={retailRoles} allowGuest={true}>
                <UrbanStoresPage />
              </Protected>
            }
          />
          <Route
            path="/marketplace"
            element={
              <Protected roles={retailRoles} allowGuest={true}>
                <MarketplacePage />
              </Protected>
            }
          />
          <Route
            path="/product/:id"
            element={
              <Protected roles={retailRoles} allowGuest={true}>
                <ProductDetailsPage />
              </Protected>
            }
          />
          <Route
            path="/sellers/:id"
            element={
              <Protected roles={retailRoles}>
                <SellerDetailsPage />
              </Protected>
            }
          />
          <Route
            path="/farmers"
            element={
              <Protected roles={retailRoles}>
                <FarmersPage />
              </Protected>
            }
          />
          <Route
            path="/fpo"
            element={
              <Protected roles={retailRoles}>
                <FarmersPage />
              </Protected>
            }
          />
          <Route
            path="/cart"
            element={
              <Protected roles={retailRoles}>
                <CartPage />
              </Protected>
            }
          />
          <Route
            path="/checkout"
            element={
              <Protected roles={retailRoles}>
                <CheckoutPage />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected roles={buyerRoles}>
                <OrdersPage />
              </Protected>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <Protected roles={buyerRoles}>
                <OrderDetailsPage />
              </Protected>
            }
          />
          <Route
            path="/orders/:id/review"
            element={
              <Protected roles={buyerRoles}>
                <OrderReviewPage />
              </Protected>
            }
          />
          <Route
            path="/feedback"
            element={
              <Protected>
                <PlatformFeedbackPage />
              </Protected>
            }
          />
          <Route
            path="/feedback/:orderId"
            element={
              <Protected>
                <PlatformFeedbackPage />
              </Protected>
            }
          />
          <Route
            path="/notifications"
            element={
              <Protected>
                <NotificationsPage />
              </Protected>
            }
          />
          <Route
            path="/bulk"
            element={
              <Protected roles={businessRoles}>
                <BulkHomePage />
              </Protected>
            }
          />
          <Route
            path="/bulk/new"
            element={
              <Protected roles={businessRoles}>
                <NewRequirementPage />
              </Protected>
            }
          />
          <Route
            path="/bulk/:id"
            element={
              <Protected roles={businessRoles}>
                <RequirementDetailsPage />
              </Protected>
            }
          />
          <Route
            path="/bulk/:id/quotations"
            element={
              <Protected roles={businessRoles}>
                <QuotationsPage />
              </Protected>
            }
          />
          <Route
            path="/negotiation/:quotationId"
            element={
              <Protected roles={["business_buyer", "farmer", "fpo_manager"]}>
                <NegotiationPage />
              </Protected>
            }
          />
          <Route
            path="/demand-board"
            element={
              <Protected roles={producerRoles}>
                <DemandBoardPage />
              </Protected>
            }
          />
          <Route
            path="/surplus"
            element={
              <Protected roles={producerRoles}>
                <SurplusPage />
              </Protected>
            }
          />
          <Route
            path="/price-intelligence/:productId"
            element={
              <Protected roles={producerRoles}>
                <PriceIntelligencePage />
              </Protected>
            }
          />
          <Route
            path="/lot/:lotId/passport"
            element={<QualityPassportPage />}
          />
          <Route
            path="/recurring-procurement"
            element={
              <Protected roles={businessRoles}>
                <RecurringPage />
              </Protected>
            }
          />
          <Route
            path="/logistics"
            element={
              <Protected roles={logisticsRoles}>
                <LogisticsDashboardPage />
              </Protected>
            }
          />
          <Route
            path="/shipments/:id"
            element={
              <Protected roles={logisticsRoles}>
                <ShipmentDetailsPage />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected roles={["admin"]}>
                <AdminPage />
              </Protected>
            }
          />
          <Route
            path="/admin/stores"
            element={
              <Protected roles={["admin"]}>
                <StoreOperationsPage />
              </Protected>
            }
          />
          <Route
            path="/admin/disputes"
            element={
              <Protected roles={["admin"]}>
                <AdminPage />
              </Protected>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <Protected roles={["admin"]}>
                <VerificationAdminPage />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="/saved"
            element={
              <Protected roles={retailRoles}>
                <SavedProductsPage />
              </Protected>
            }
          />
          <Route path="/permission-denied" element={<PermissionDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route
          path="/seller"
          element={
            <Protected roles={producerRoles}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route path="dashboard" element={<SellerDashboardPage />} />
          <Route path="products" element={<SellerProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="orders" element={<SellerOrdersPage />} />
          <Route path="bulk-requests" element={<SellerRequestsPage />} />
          <Route path="quotations" element={<SellerQuotationsPage />} />
          <Route path="payments" element={<SimpleDashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route
          path="/harvests"
          element={
            <Protected roles={producerRoles}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<HarvestsPage />} />
        </Route>
        <Route
          path="/fpo/aggregation"
          element={
            <Protected roles={["fpo_manager"]}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<FpoAggregationPage />} />
        </Route>
        <Route
          path="/fpo/settlements"
          element={
            <Protected roles={["fpo_manager"]}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<SettlementsPage />} />
        </Route>
        <Route
          path="/fpo/membership"
          element={
            <Protected roles={producerRoles}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<FpoMembershipPage />} />
        </Route>
        <Route
          path="/logistics/planner"
          element={
            <Protected roles={fleetRoles}>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<LogisticsPlannerPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/verification"
          element={
            <Protected>
              <VerificationCenterPage />
            </Protected>
          }
        />
      </Routes>
    </Suspense>
  );
}
