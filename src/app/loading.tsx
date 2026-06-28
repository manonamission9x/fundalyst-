export default function Loading() {
  return (
    <div className="page">
      {/* Branded nav skeleton (darker, matches nav style) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
          <div className="skeleton" style={{ width: 80, height: 13, borderRadius: 4 }} />
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <div key={i} className="skeleton" style={{ width: 45, height: 13, borderRadius: 4 }} />
          ))}
        </div>
      </div>

      {/* Page title area skeleton */}
      <div className="page-hero">
        <div className="skeleton" style={{ width: '55%', height: 28, borderRadius: 6, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '38%', height: 14, borderRadius: 4 }} />
      </div>

      {/* Card grid skeleton (matches home-grid layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 140, borderRadius: 8 }} />
        ))}
      </div>

      {/* Full-width content skeleton */}
      <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 16 }} />
    </div>
  );
}
