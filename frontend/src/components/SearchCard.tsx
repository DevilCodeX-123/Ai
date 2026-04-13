import React from 'react';
import { ExternalLink, Search } from 'lucide-react';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SearchCardProps {
  query: string;
  results: SearchResult[];
}

export const SearchCard: React.FC<SearchCardProps> = ({ query, results }) => {
  return (
    <div className="w-full max-w-md bg-black/40 backdrop-blur-md border border-devil-gold/20 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 bg-gradient-to-r from-devil-gold/20 to-transparent flex items-center gap-3 border-b border-devil-gold/10">
        <div className="p-2 bg-devil-gold/10 rounded-lg">
          <Search size={18} className="text-devil-gold" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-devil-gold tracking-widest uppercase">Internet Scan Report</h3>
          <p className="text-[10px] text-devil-gold/60 font-mono truncate max-w-[200px]">QUERY: {query}</p>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {Array.isArray(results) && results.length > 0 ? (
          results.slice(0, 3).map((res, i) => (
            <div key={i} className="group p-3 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-devil-gold/10">
              <a 
                href={res.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2"
              >
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-devil-gold mb-1 group-hover:underline line-clamp-1">{res.title}</h4>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{res.snippet}</p>
                </div>
                <ExternalLink size={12} className="text-devil-gold/40 group-hover:text-devil-gold" />
              </a>
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500 italic">No direct matches found in current scan cycle.</p>
          </div>
        )}
      </div>
      
      <div className="px-4 py-2 bg-devil-gold/5 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-gray-500 tracking-tighter">
        <span>STATUS: SCAN COMPLETE</span>
        <span>PROTOCOL: ZERO-API</span>
      </div>
    </div>
  );
};
