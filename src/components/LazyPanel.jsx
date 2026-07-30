import React, { useState, useEffect, useRef } from 'react'

export default function LazyPanel({ title, loader, children, threshold = 0.1 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !data && !loading) {
          setLoading(true)
          try {
            const result = await loader?.()
            setData(result || true)
          } catch (e) {
            console.error('LazyPanel load error:', e)
          } finally {
            setLoading(false)
          }
        }
      },
      { threshold }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [data, loading, loader, threshold])

  return (
    <div ref={ref} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
      {title && <h3 className="font-semibold text-white text-sm mb-3">{title}</h3>}
      {loading && (
        <div className="flex items-center justify-center p-8 text-slate-400 text-xs">
          <div className="w-4 h-4 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mr-2" />
          Cargando datos...
        </div>
      )}
      {data && (typeof children === 'function' ? children(data) : children)}
      {!data && !loading && (
        <div className="h-28 bg-slate-800/60 rounded-lg animate-pulse border border-slate-700/30" />
      )}
    </div>
  )
}
