import React, { useRef, useState, useEffect } from 'react'
import { useVirtualization } from '../hooks/useVirtualization'
import { GitCommit, User, Calendar, Tag } from 'lucide-react'

export default function VirtualizedCommitList({ commits = [], onSelectCommit, selectedCommitId, height = 500 }) {
  const containerRef = useRef(null)
  const [containerHeight, setContainerHeight] = useState(height)
  const ITEM_HEIGHT = 72

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || height)
    }
  }, [height])

  const { virtualItems, totalHeight, handleScroll } = useVirtualization({
    itemCount: commits.length,
    itemHeight: ITEM_HEIGHT,
    containerHeight
  })

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-y-auto w-full custom-scrollbar bg-slate-900/40 rounded-xl border border-slate-700/50"
      style={{ height: `${height}px` }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
        {virtualItems.map(({ index, style }) => {
          const commit = commits[index]
          if (!commit) return null
          const isSelected = selectedCommitId === commit.id

          return (
            <div key={commit.id || index} style={style} className="px-2 py-1">
              <button
                onClick={() => onSelectCommit?.(commit)}
                className={`w-full h-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-teal-500/20 text-white border-teal-500/40 shadow-lg shadow-teal-500/10'
                    : 'bg-slate-800/40 text-slate-300 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-teal-500/30 text-teal-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    <GitCommit size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-teal-400 font-semibold">{commit.id ? commit.id.substring(0, 7) : '-------'}</span>
                      <span className="text-xs font-medium text-slate-200 truncate">{commit.message}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate flex items-center gap-1"><User size={10} /> {commit.author}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar size={10} /> {commit.time || commit.date}</span>
                    </div>
                  </div>
                </div>

                {commit.branch && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700/60 text-slate-300 border border-slate-600/40 flex-shrink-0">
                    {commit.branch}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
