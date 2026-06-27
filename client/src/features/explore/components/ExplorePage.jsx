/**
 * NexVault — Explore Page (DApp Browser)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineArrowTopRightOnSquare, HiOutlineArrowLeft } from 'react-icons/hi2';

const DAPP_CATEGORIES = ['All', 'DeFi', 'NFTs', 'Gaming', 'Social'];

const DAPPS = [
  {
    id: 'uniswap',
    name: 'Uniswap',
    description: 'Swap, earn, and build on the leading decentralized crypto trading protocol.',
    url: 'https://app.uniswap.org/',
    icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    category: 'DeFi',
    color: 'from-pink-500/20 to-pink-500/5'
  },
  {
    id: 'opensea',
    name: 'OpenSea',
    description: 'Discover, collect, and sell extraordinary NFTs on the world\'s first and largest NFT marketplace.',
    url: 'https://opensea.io/',
    icon: 'https://storage.googleapis.com/opensea-static/Logomark/Logomark-Blue.png',
    category: 'NFTs',
    color: 'from-blue-500/20 to-blue-500/5'
  },
  {
    id: 'aave',
    name: 'Aave',
    description: 'Earn interest, borrow assets, and build applications on an open-source protocol.',
    url: 'https://app.aave.com/',
    icon: 'https://cryptologos.cc/logos/aave-aave-logo.png',
    category: 'DeFi',
    color: 'from-purple-500/20 to-purple-500/5'
  },
  {
    id: 'pancakeswap',
    name: 'PancakeSwap',
    description: 'Trade, earn, and win crypto on the most popular decentralized platform in the galaxy.',
    url: 'https://pancakeswap.finance/',
    icon: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png',
    category: 'DeFi',
    color: 'from-cyan-500/20 to-cyan-500/5'
  },
  {
    id: 'blur',
    name: 'Blur',
    description: 'The NFT marketplace for pro traders. Fast, sweeping, and zero marketplace fees.',
    url: 'https://blur.io/',
    icon: 'https://blur.io/favicons/favicon-32x32.png',
    category: 'NFTs',
    color: 'from-orange-500/20 to-orange-500/5'
  },
  {
    id: '1inch',
    name: '1inch Network',
    description: 'The most efficient DeFi aggregator offering the best prices across multiple networks.',
    url: 'https://app.1inch.io/',
    icon: 'https://cryptologos.cc/logos/1inch-1inch-logo.png',
    category: 'DeFi',
    color: 'from-blue-600/20 to-blue-600/5'
  }
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeWebUrl, setActiveWebUrl] = useState(null);

  const filteredDApps = DAPPS.filter(dapp => {
    const matchesSearch = dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dapp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || dapp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const isUrlLike = (str) => {
    const trimmed = str.trim();
    if (!trimmed) return false;
    if (trimmed.includes(' ')) return false;
    return /^https?:\/\//i.test(trimmed) || (trimmed.includes('.') && trimmed.length > 3);
  };

  const handleOpenDApp = (url) => {
    // In a browser extension, we must open the DApp in a new tab.
    // Iframe injection fails due to X-Frame-Options and cross-origin provider injection blocks.
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const isSearchAUrl = isUrlLike(searchQuery);

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="px-5 pt-6 pb-2 shrink-0">
        <h1 className="text-2xl font-black text-white mb-1 tracking-tight">Explore</h1>
        <p className="text-sm text-surface-400 mb-6">Discover and connect to Web3 applications</p>

        {/* Search Bar */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <HiOutlineMagnifyingGlass className="h-5 w-5 text-surface-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DApps or paste URL..."
            className="w-full bg-surface-900/80 border border-surface-700/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary-500/50 focus:bg-surface-900 transition-all shadow-inner"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {DAPP_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === category 
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                  : 'bg-surface-800/50 text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar">
        {filteredDApps.length > 0 ? (
          <div className="space-y-3 mt-2">
            {filteredDApps.map((dapp, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={dapp.id}
                onClick={() => handleOpenDApp(dapp.url)}
                className="group relative p-4 rounded-2xl bg-surface-900/50 border border-surface-800 hover:border-surface-700/80 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                {/* Background glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${dapp.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                
                <div className="relative flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center p-2.5 shrink-0 shadow-sm border border-surface-200/10">
                    <img src={dapp.icon} alt={dapp.name} className="w-full h-full object-contain" />
                  </div>
                  
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-base font-bold text-white truncate pr-4">{dapp.name}</h3>
                      <HiOutlineArrowTopRightOnSquare className="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">
                      {dapp.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : isSearchAUrl ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 mt-8">
            <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mb-4 border border-primary-500/30">
              <HiOutlineArrowTopRightOnSquare className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Open Web Link</h3>
            <p className="text-sm text-surface-400 mb-6">
              You are about to open a custom URL.
            </p>
            <button
              onClick={() => handleOpenDApp(searchQuery)}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-primary-500/20"
            >
              Go to {searchQuery}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 mt-8">
            <div className="w-16 h-16 rounded-full bg-surface-800/50 flex items-center justify-center mb-4 border border-surface-700/50">
              <HiOutlineMagnifyingGlass className="w-8 h-8 text-surface-500" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No DApps Found</h3>
            <p className="text-sm text-surface-400">
              {searchQuery ? "We couldn't find any applications matching your search." : "No applications in this category."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
