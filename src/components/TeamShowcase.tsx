import { useState } from 'react';
import { motion } from 'framer-motion';
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Abu Hurayra',
    role: 'Sonargaon University',
    image: '/team/Abu Hurayra.jpg',
  },
  {
    id: '2',
    name: 'Kholipha Ahmmad Al-Amin',
    role: 'Atish Dipankar University of Science & Technology',
    image: '/team/Kholipha Ahmmad Al-Amin.jpeg',
  },
  {
    id: '4',
    name: 'Jannatul Nayeem',
    role: 'Lakshmipur Polytechnic Institute',
    image: '/team/Jannatul Nayeem.jpg',
  },
  {
    id: '5',
    name: 'Sandipta Karmakar',
    role: 'Govt. Science College',
    image: '/team/Sandipta Karmakar.jpg',
  },
  {
    id: '6',
    name: 'Sanzida Rahman',
    role: 'Khulna Mohila Polytechnic Institute',
    image: '/team/Sanzida Rahman.jpg',
  },
];

export function TeamShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const col1 = TEAM_MEMBERS.filter((_, i) => i % 3 === 0);
  const col2 = TEAM_MEMBERS.filter((_, i) => i % 3 === 1);
  const col3 = TEAM_MEMBERS.filter((_, i) => i % 3 === 2);

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 w-full h-full justify-center">
      {/* ── Left: photo grid ── */}
      <div className="flex gap-3 md:gap-4 flex-shrink-0 relative">
        <div className="absolute inset-0 bg-accent/10 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Column 1 */}
        <div className="flex flex-col gap-3 md:gap-4 -mt-8 md:-mt-12">
          {col1.map((member) => (
            <PhotoCard key={member.id} member={member} hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-3 md:gap-4 mt-8 md:mt-12">
          {col2.map((member) => (
            <PhotoCard key={member.id} member={member} hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-3 md:gap-4 mt-0 md:mt-0">
          {col3.map((member) => (
            <PhotoCard key={member.id} member={member} hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>
      </div>

      {/* ── Right: member name list ── */}
      <div className="flex flex-col gap-4 md:gap-6 w-full max-w-sm mt-8 md:mt-0">
        {TEAM_MEMBERS.map((member) => (
          <MemberRow key={member.id} member={member} hoveredId={hoveredId} onHover={setHoveredId} />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({ member, hoveredId, onHover }: { member: TeamMember; hoveredId: string | null; onHover: (id: string | null) => void; }) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl md:rounded-[2rem] cursor-pointer flex-shrink-0 transition-all duration-500 shadow-xl border border-line/50 hover:border-accent/50 hover:shadow-glow hover:-translate-y-2 w-[110px] h-[130px] sm:w-[130px] sm:h-[150px] md:w-[150px] md:h-[180px] lg:w-[170px] lg:h-[200px] ${
        isDimmed ? 'opacity-40 scale-95 blur-[2px]' : 'opacity-100 scale-100 blur-0 z-10'
      }`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
      whileTap={{ scale: 0.95 }}
    >
      <img
        src={member.image}
        alt={member.name}
        className="w-full h-full object-cover transition-all duration-700"
        style={{
          filter: isActive ? 'grayscale(0) brightness(1.1) contrast(1.05)' : 'grayscale(1) brightness(0.6) contrast(1.2)',
        }}
      />
      <div className={`absolute inset-0 bg-gradient-to-t from-surface-strong/90 via-surface-strong/20 to-transparent transition-opacity duration-500 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
    </motion.div>
  );
}

function MemberRow({ member, hoveredId, onHover }: { member: TeamMember; hoveredId: string | null; onHover: (id: string | null) => void; }) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;

  return (
    <div
      className={`group cursor-pointer transition-all duration-500 flex items-center gap-4 ${isDimmed ? 'opacity-30 translate-x-0' : isActive ? 'opacity-100 translate-x-2' : 'opacity-80 translate-x-0'}`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={`h-0.5 rounded-full transition-all duration-500 ${isActive ? 'w-8 bg-accent shadow-[0_0_10px_rgba(var(--color-accent),0.8)]' : 'w-3 bg-ink-soft/40'}`} />
      
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className={`text-lg md:text-xl font-bold tracking-tight transition-colors duration-300 ${isActive ? 'text-ink drop-shadow-md' : 'text-ink-soft'}`}>
            {member.name}
          </span>
        </div>
        <p className={`text-xs font-semibold uppercase tracking-widest mt-1 transition-colors duration-300 ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
          {member.role}
        </p>
      </div>
    </div>
  );
}
