import React, { useState } from "react";
import useNotifications from "../hooks/useNotifications";
import NotificationFilter from "../components/NotificationFilter";

const PRIORITY_LABEL = {
  Placement: { label: "Placement", color: "#4f46e5", bg: "#ede9fe" },
  Result: { label: "Result", color: "#0369a1", bg: "#e0f2fe" },
  Event: { label: "Event", color: "#065f46", bg: "#d1fae5" },
};

const NotificationsPage = () => {
  const [topN, setTopN] = useState(10);

  const {
    priorityInbox,
    readIds,
    loading,
    error,
    markAsRead,
  } = useNotifications(topN);

  const handleTopNChange = (value) => {
    setTopN(value);
  };

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Priority Inbox</h1>
          <p style={styles.subtitle}>
            Showing top {topN} unread notifications by priority
          </p>
        </div>

        {/* Filter */}
        <NotificationFilter topN={topN} onTopNChange={handleTopNChange} />

        {/* Loading */}
        {loading && (
          <div style={styles.centered}>
            <p style={styles.loadingText}>Loading notifications...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && priorityInbox.length === 0 && (
          <div style={styles.centered}>
            <p style={styles.emptyText}>No unread notifications found.</p>
          </div>
        )}

        {/* Notification List */}
        {!loading && !error && priorityInbox.length > 0 && (
          <div style={styles.list}>
            {priorityInbox.map((notification, index) => {
              const isRead = readIds.has(notification.ID);
              const typeStyle =
                PRIORITY_LABEL[notification.Type] || PRIORITY_LABEL["Event"];

              return (
                <div
                  key={notification.ID}
                  style={{
                    ...styles.card,
                    ...(isRead ? styles.cardRead : styles.cardUnread),
                  }}
                >
                  {/* Rank Badge */}
                  <div style={styles.rankBadge}>#{index + 1}</div>

                  {/* Card Body */}
                  <div style={styles.cardBody}>
                    <div style={styles.cardTop}>
                      {/* Type Badge */}
                      <span
                        style={{
                          ...styles.typeBadge,
                          color: typeStyle.color,
                          backgroundColor: typeStyle.bg,
                        }}
                      >
                        {typeStyle.label}
                      </span>

                      {/* Timestamp */}
                      <span style={styles.timestamp}>
                        {formatTimestamp(notification.Timestamp)}
                      </span>
                    </div>

                    {/* Message */}
                    <p style={styles.message}>{notification.Message}</p>

                    {/* ID */}
                    <p style={styles.idText}>ID: {notification.ID}</p>
                  </div>

                  {/* Mark as Read Button */}
                  <div style={styles.cardAction}>
                    {!isRead ? (
                      <button
                        style={styles.readButton}
                        onClick={() => handleMarkAsRead(notification.ID)}
                      >
                        Mark Read
                      </button>
                    ) : (
                      <span style={styles.readBadge}>Read</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f1f5f9",
    padding: "32px 16px",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e1b4b",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  centered: {
    textAlign: "center",
    padding: "48px 0",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "16px",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: "16px",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "16px",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "14px",
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    borderRadius: "10px",
    padding: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "all 0.2s ease",
  },
  cardUnread: {
    backgroundColor: "#ffffff",
    borderLeft: "4px solid #4f46e5",
  },
  cardRead: {
    backgroundColor: "#f9fafb",
    borderLeft: "4px solid #d1d5db",
    opacity: 0.75,
  },
  rankBadge: {
    minWidth: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    fontWeight: "700",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
    flexWrap: "wrap",
  },
  typeBadge: {
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 10px",
    borderRadius: "12px",
  },
  timestamp: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  message: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#111827",
    margin: "0 0 4px 0",
    textTransform: "capitalize",
  },
  idText: {
    fontSize: "11px",
    color: "#d1d5db",
    margin: 0,
    wordBreak: "break-all",
  },
  cardAction: {
    display: "flex",
    alignItems: "center",
  },
  readButton: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  readBadge: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#9ca3af",
    padding: "6px 12px",
    backgroundColor: "#f3f4f6",
    borderRadius: "6px",
  },
};

export default NotificationsPage;