import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Activity, Users, GitCommit, FileText, TrendingUp, TrendingDown } from 'lucide-react'

export default function StatsPanel({ folderPath }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalCommits: 0,
    contributors: [],
    commitsByDay: [],
    linesAdded: 0,
    linesRemoved: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (folderPath) {
      loadStats()
    }
  }, [folderPath])

  const loadStats = async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const result = await window.electronAPI.getRepoStats(folderPath)
      if (result.success) {
        setStats(result.stats)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{title}</p>
        <p className="text-xl font-bold text-slate-200">{value}</p>
      </div>
    </div>
  )

  if (!folderPath) return null

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {loading ? (
        <div className="flex justify-center p-8"><Activity className="animate-spin text-brand-400" size={24} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title={t('analysis.stats.totalCommits', 'Total Commits')} 
              value={stats.totalCommits} 
              icon={GitCommit} 
              colorClass="bg-brand-500/20 text-brand-400" 
            />
            <StatCard 
              title={t('analysis.stats.contributors', 'Contributors')} 
              value={stats.contributors.length} 
              icon={Users} 
              colorClass="bg-indigo-500/20 text-indigo-400" 
            />
            <StatCard 
              title={t('analysis.stats.linesAdded', 'Lines Added')} 
              value={`+${stats.linesAdded.toLocaleString()}`} 
              icon={TrendingUp} 
              colorClass="bg-emerald-500/20 text-emerald-400" 
            />
            <StatCard 
              title={t('analysis.stats.linesRemoved', 'Lines Removed')} 
              value={`-${stats.linesRemoved.toLocaleString()}`} 
              icon={TrendingDown} 
              colorClass="bg-rose-500/20 text-rose-400" 
            />
          </div>

          {stats.commitsByDay.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {t('analysis.stats.activityChart', 'Activity (Last 30 Days)')}
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.commitsByDay}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#38bdf8' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.contributors.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {t('analysis.stats.topContributors', 'Top Contributors')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.contributors.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      cursor={{ fill: '#1e293b' }}
                    />
                    <Bar dataKey="commits" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
