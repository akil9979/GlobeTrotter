import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { AppLayout } from "../layouts/AppLayout";
import { ActivitySearchPage } from "../pages/ActivitySearchPage";
import { BudgetPage } from "../pages/BudgetPage";
import { CalendarPage } from "../pages/CalendarPage";
import { CitySearchPage } from "../pages/CitySearchPage";
import { CreateTripPage } from "../pages/CreateTripPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ItineraryBuilderPage } from "../pages/ItineraryBuilderPage";
import { ItineraryViewPage } from "../pages/ItineraryViewPage";
import { LoginPage } from "../pages/LoginPage";
import { MyTripsPage } from "../pages/MyTripsPage";
import { TripDetailsPage } from "../pages/TripDetailsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { SharedTripPage } from "../pages/SharedTripPage";
import { SignupPage } from "../pages/SignupPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";

export const AppRoutes = () => (
  <Routes>
    <Route path="/share/:shareToken" element={<SharedTripPage />} />
    <Route element={<PublicOnlyRoute />}>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<MyTripsPage />} />
        <Route path="/trips/new" element={<CreateTripPage />} />
        <Route path="/trips/:tripId" element={<TripDetailsPage />} />
        <Route path="/trips/:tripId/builder" element={<ItineraryBuilderPage />} />
        <Route path="/trips/:tripId/cities" element={<CitySearchPage />} />
        <Route path="/trips/:tripId/activities" element={<ActivitySearchPage />} />
        <Route path="/trips/:tripId/itinerary" element={<ItineraryViewPage />} />
        <Route path="/trips/:tripId/budget" element={<BudgetPage />} />
        <Route path="/trips/:tripId/calendar" element={<CalendarPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
