export default function Security() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Center</h1>
        <p className="text-slate-400 mt-1">Immutable audit logs and system security events.</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-lg font-medium text-white">Recent Security Events</h2>
          <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs rounded-full font-medium">All Systems Nominal</span>
        </div>
        <div className="p-6 text-center">
          <p className="text-slate-500">No high-severity security events detected in the last 24 hours.</p>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-lg font-medium text-white">Audit Log Feed</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-slate-500">Loading immutable audit ledger...</p>
        </div>
      </div>
    </div>
  );
}
