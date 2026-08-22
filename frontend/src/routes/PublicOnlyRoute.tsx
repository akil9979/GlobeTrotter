import { Navigate, Outlet } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../hooks/useAuth";

export const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingState label="Loading…" />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
