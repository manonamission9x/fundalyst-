export default function Loading() {
  return (
    <div className="px-5 py-6">
      <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: 16, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 32, borderRadius: 4 }} />
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton flex-1" style={{ height: 120, borderRadius: 10 }} />
        ))}
      </div>
      <div className="skeleton w-full mt-4" style={{ height: 200, borderRadius: 10 }} />
    </div>
  );
}
