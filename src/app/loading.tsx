export default function Loading() {
  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: 16, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 32, borderRadius: 4 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 10 }} />
        ))}
      </div>
      <div className="skeleton" style={{ width: '100%', height: 200, marginTop: 16, borderRadius: 10 }} />
    </div>
  );
}
