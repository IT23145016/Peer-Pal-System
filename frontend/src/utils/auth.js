export const getStoredAuth = () => {
  const raw = localStorage.getItem("auth");
  return raw ? JSON.parse(raw) : null;
};

export const setStoredAuth = (data) => {
  localStorage.setItem("auth", JSON.stringify(data));
};

export const clearStoredAuth = () => {
  localStorage.removeItem("auth");
};

export const getCurrentRole = () => {
  const auth = getStoredAuth();
  return auth?.user?.role || null;
};

export const getDashboardPathByRole = (role) => {
  return role === "admin" ? "/admin/dashboard" : "/dashboard";
};
