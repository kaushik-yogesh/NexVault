export default function Swaps() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Swap Analytics</h1>
        <p className="text-slate-400 mt-1">Monitor decentralized exchange volumes and fee generation.</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <h2 className="text-lg font-medium text-slate-300">Swap Indexer Syncing...</h2>
        <p className="text-slate-500 mt-2">Connecting to on-chain indexer for historical swap data.</p>
      </div>
    </div>
  );
}
