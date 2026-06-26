const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://4.224.186.213";
const API_ENDPOINT = `${API_BASE_URL}/evaluation-service/notifications`;

const getAuthHeaders = () => {
  const token =
    import.meta.env.VITE_API_TOKEN || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchNotifications = async () => {
  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch notifications: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data;
  }

  return data.notifications ?? [];
};
