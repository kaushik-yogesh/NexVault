export default function Settings() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Platform Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Fee Configuration</h2>
        
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Global Platform Fee (%)
            </label>
            <input 
              type="number" 
              step="0.1" 
              defaultValue="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treasury Wallet Address
            </label>
            <input 
              type="text" 
              defaultValue="0xAdminTreasuryWalletAddress..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
            />
          </div>

          <div className="pt-4">
            <button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
