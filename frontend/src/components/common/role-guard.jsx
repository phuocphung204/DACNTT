import { useMemo } from "react";
import { useSelector } from "react-redux";

const RoleGuard = ({ allowRoles = [], children, fallback = null }) => {
  const currentRole = useSelector((state) => state.auth?.role);
  const allowed = useMemo(() => {
    if (!allowRoles) return [];
    return Array.isArray(allowRoles) ? allowRoles : [allowRoles];
  }, [allowRoles]);

  if (allowed.length === 0) return fallback;
  if (allowed.includes(currentRole)) {
    return children;
  }
  return fallback;
};

export default RoleGuard;
