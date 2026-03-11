export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{ minHeight: '100vh', background: '#050D1F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 56, animation: 'spin 1s linear infinite' }}>🚛</div>
      <p style={{ color: '#888', fontSize: 16 }}>{message}</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
