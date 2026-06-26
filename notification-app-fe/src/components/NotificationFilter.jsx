import React from "react";

const TOP_N_OPTIONS = [10, 15, 20];

const NotificationFilter = ({ topN, onTopNChange }) => {
  return (
    <div style={styles.container}>
      <span style={styles.label}>Show Top:</span>
      <div style={styles.buttonGroup}>
        {TOP_N_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onTopNChange(option)}
            style={{
              ...styles.button,
              ...(topN === option ? styles.activeButton : styles.inactiveButton),
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "16px",
    border: "1px solid #e0e0e0",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  button: {
    padding: "6px 16px",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  activeButton: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    boxShadow: "0 2px 6px rgba(79, 70, 229, 0.4)",
  },
  inactiveButton: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
  },
};

export default NotificationFilter;