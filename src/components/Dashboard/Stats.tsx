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

interface StatsProps {
  books: Book[];
}

const COLORS = ['#1a1a1a', '#3d5a44', '#d9d5ce', '#e0ddd8', '#1a1a1a', '#3d5a44'];

export default function Stats({ books }: StatsProps) {
  const stats = useMemo(() => {
    const total = books.length;
    const read = books.filter(b => b.readingStatus === 'Gelezen').length;
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
      { name: 'Gelezen', value: read },
      { name: 'Bezig', value: reading },
      { name: 'Ongelezen', value: total - read - reading }
    ].filter(d => d.value > 0);

    return { total, read, reading, wishlist, genreData, statusData };
  }, [books]);

  return (
    <div className="space-y-12 pb-12 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <StatCard 
          icon={<BookOpen size={18} />} 
          label="Catalogus" 
          value={stats.total} 
          subText="Totaal aantal boekwerken"
        />
        <StatCard 
          icon={<CheckCircle2 size={18} />} 
          label="Gelezen" 
          value={stats.read} 
          subText={`${Math.round((stats.read / stats.total) * 100) || 0}% van de collectie`}
        />
        <StatCard 
          icon={<Bookmark size={18} />} 
          label="Prioriteit" 
          value={stats.wishlist} 
          subText="Items op verlanglijst"
        />
        <StatCard 
          icon={<Trophy size={18} />} 
          label="Leesdoel 2026" 
          value={24} 
          subText="Nog 8 te gaan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm">
          <div className="flex items-center justify-between mb-10 border-b border-editorial-border pb-4">
            <h3 className="text-xl font-serif italic italic-bold">Populaire Genres</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 italic">Bibliotheek Focus</span>
          </div>
          <div className="h-64 min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.genreData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="0" horizontal={false} vertical={true} stroke="#e0ddd8" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight={700}
                  tick={{ fill: '#1a1a1a', textAnchor: 'end' }}
                  width={120}
                />
                <Tooltip 
                  cursor={{ fill: '#fdfbf7' }}
                  contentStyle={{ border: '1px solid #e0ddd8', borderRadius: '0', boxShadow: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#3d5a44" radius={0} barSize={20}>
                  <LabelList dataKey="value" position="right" offset={10} className="font-mono text-[10px] font-bold" fill="#1a1a1a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-10 border-b border-editorial-border pb-4">
             <h3 className="text-xl font-serif italic italic-bold">Collectie Status</h3>
             <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 italic">Data Overzicht</span>
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
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-6">
               {stats.statusData.map((d, i) => (
                 <div key={d.name} className="flex items-center gap-4">
                   <div className="w-2 h-6" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{d.name}</span>
                     <span className="text-lg font-serif italic">{d.value}</span>
                   </div>
                   <span className="text-xs font-bold ml-auto opacity-20">{Math.round((d.value / stats.total) * 100)}%</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subText }: { icon: React.ReactNode, label: string, value: number, subText: string }) {
  return (
    <div className="bg-white p-8 rounded-none border border-editorial-border shadow-sm group hover:border-editorial-text transition-all duration-300">
      <div className="text-editorial-accent mb-6 opacity-40 group-hover:opacity-100 transition-opacity">
        {icon}
      </div>
      <div>
        <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest mb-3 italic">{label}</p>
        <div className="flex items-baseline gap-2">
           <h4 className="text-5xl font-serif font-black italic">{value}</h4>
        </div>
        <p className="text-black/30 text-[10px] font-bold uppercase tracking-widest mt-4 italic">{subText}</p>
      </div>
    </div>
  );
}
