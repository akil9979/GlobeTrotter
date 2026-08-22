import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../hooks/useAuth";

export const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Loading…" />;
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
  return isAuthenticated ? <Navigate to={destination} replace /> : <Outlet />;
};
