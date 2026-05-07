import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { Book } from '../../services/bookService';
import { BookOpen, CheckCircle2, Bookmark, Star, Clock, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/LanguageContext';
import { translateStatus } from '../../translations';

interface StatsProps {
  books: Book[];
  isDarkMode?: boolean;
  readingGoal?: number;
}

const COLORS = ['#1a1a1a', '#3d5a44', '#d9d5ce', '#e0ddd8', '#1a1a1a', '#3d5a44'];

export default function Stats({ books, isDarkMode, readingGoal = 24 }: StatsProps) {
  const { t, language } = useLanguage();
  const stats = useMemo(() => {
    const total = books.length;
    const currentYear = new Date().getFullYear();
    const read = books.filter(b => b.readingStatus === 'Gelezen').length;
    const goalProgressCount = books.filter(b => {
      if (b.readingStatus !== 'Gelezen') return false;
      if (!b.endDate || !b.startDate) return false;
      try {
        const endYear = new Date(b.endDate).getFullYear();
        return endYear === currentYear;
      } catch (e) {
        return false;
      }
    }).length;
    const reading = books.filter(b => b.readingStatus === 'Bezig').length;
    const wishlist = books.filter(b => b.readingStatus === 'Wil ik lezen').length;
    
    // Genre distribution
    const genres: Record<string, number> = {};
    books.forEach(b => {
      b.genre.forEach(g => {
        genres[g] = (genres[g] || 0) + 1;
      });
    });
    
    const genreData = Object.entries(genres)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Reading status data
    const statusData = [
      { name: translateStatus('Gelezen', language), value: read },
      { name: translateStatus('Bezig', language), value: reading },
      { name: translateStatus('Ongelezen', language), value: total - read - reading }
    ].filter(d => d.value > 0);

    return { total, read, reading, wishlist, genreData, statusData, goalProgressCount };
  }, [books, language]);

  return (
    <div className="space-y-12 pb-12 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <StatCard 
          icon={<BookOpen size={18} />} 
          label={t('dashboard.catalog')} 
          value={stats.total} 
          subText={t('dashboard.totalBooksDesc')}
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={<CheckCircle2 size={18} />} 
          label={translateStatus('Gelezen', language)} 
          value={stats.read} 
          subText={t('dashboard.collectionPct', { pct: (Math.round((stats.read / stats.total) * 100) || 0) })}
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={<Bookmark size={18} />} 
          label={t('dashboard.priority')} 
          value={stats.wishlist} 
          subText={t('dashboard.watchlistItems')}
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={<Trophy size={18} />} 
          label={t('dashboard.readingGoal')} 
          value={stats.goalProgressCount} 
          subText={t('dashboard.stillToGo', { count: Math.max(0, readingGoal - stats.goalProgressCount) })}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className={cn("p-10 rounded-none border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
          <div className={cn("flex items-center justify-between mb-10 border-b pb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
            <h3 className={cn("text-xl font-serif font-black italic", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")}>{t('dashboard.popularGenres')}</h3>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-white/40" : "text-black/40")}>{t('dashboard.libraryFocus')}</span>
          </div>
          <div className="h-64 min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.genreData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="0" horizontal={false} vertical={true} stroke={isDarkMode ? "#27272a" : "#e0ddd8"} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight={700}
                  tick={{ fill: isDarkMode ? '#ffffff99' : '#1a1a1a', textAnchor: 'end' }}
                  width={120}
                />
                <Tooltip 
                  cursor={{ fill: isDarkMode ? '#18181b' : '#fdfbf7' }}
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#18181b' : '#fff',
                    border: isDarkMode ? '1px solid #27272a' : '1px solid #e0ddd8', 
                    borderRadius: '0', 
                    boxShadow: 'none', 
                    fontSize: '12px',
                    color: isDarkMode ? '#ffffff' : '#1a1a1a'
                  }}
                  itemStyle={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                />
                <Bar dataKey="value" fill={isDarkMode ? "var(--color-editorial-accent-bright)" : "var(--color-editorial-accent)"} radius={0} barSize={20}>
                  <LabelList dataKey="value" position="right" offset={10} className="font-mono text-[10px] font-bold" fill={isDarkMode ? '#ffffffcc' : '#1a1a1a'} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn("p-10 rounded-none border shadow-sm flex flex-col", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
          <div className={cn("flex items-center justify-between mb-10 border-b pb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
             <h3 className={cn("text-xl font-serif font-black italic", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")}>{t('dashboard.collectionStatus')}</h3>
             <span className={cn("text-[10px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-white/40" : "text-black/40")}>{t('dashboard.dataOverview')}</span>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 h-64 min-w-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                      data={stats.statusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke={isDarkMode ? "#18181b" : "#fff"}
                      strokeWidth={2}
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={isDarkMode ? (index === 0 ? 'var(--color-editorial-accent-bright)' : (index === 1 ? '#e2e2e2' : '#525252')) : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#18181b' : '#fff',
                      border: isDarkMode ? '1px solid #27272a' : '1px solid #e0ddd8',
                      borderRadius: '0',
                      fontSize: '12px',
                      color: isDarkMode ? '#ffffff' : '#1a1a1a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-6">
               {stats.statusData.map((d, i) => (
                 <div key={d.name} className="flex items-center gap-4">
                   <div className="w-2 h-6" style={{ backgroundColor: isDarkMode ? (i === 0 ? 'var(--color-editorial-accent-bright)' : (i === 1 ? '#e2e2e2' : '#525252')) : COLORS[i % COLORS.length] }} />
                   <div className="flex flex-col">
                     <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-white/40" : "text-black/40")}>{d.name}</span>
                     <span className="text-lg font-serif italic">{d.value}</span>
                   </div>
                   <span className={cn("text-xs font-bold ml-auto", isDarkMode ? "text-white/20" : "opacity-20")}>{Math.round((d.value / stats.total) * 100)}%</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subText, isDarkMode }: { icon: React.ReactNode, label: string, value: number, subText: string, isDarkMode?: boolean }) {
  return (
    <div className={cn(
      "p-8 rounded-none border shadow-sm group transition-all duration-300",
      isDarkMode 
        ? "bg-zinc-900 border-zinc-800 hover:border-zinc-600" 
        : "bg-white border-editorial-border hover:border-editorial-text"
    )}>
      <div className={cn("mb-6 transition-opacity", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent opacity-40 group-hover:opacity-100")}>
        {icon}
      </div>
      <div>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 italic", isDarkMode ? "text-white/60" : "text-black/40")}>{label}</p>
        <div className="flex items-baseline gap-2">
           <h4 className="text-5xl font-serif font-black italic">{value}</h4>
        </div>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-4 italic", isDarkMode ? "text-white/40" : "text-black/30")}>{subText}</p>
      </div>
    </div>
  );
}
