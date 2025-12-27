import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const isAuthenticated = useSelector((state) => Boolean(state.auth?.isAuthenticated));
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace state={{ from: location }} />;
  }

  return children;
}