export default function LoadingSpinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#050D1F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ fontSize: "56px", animation: "spin 1s linear infinite" }}>🚛</div>
      <p style={{ color: "#888", fontSize: "16px" }}>Loading APTrucking...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
