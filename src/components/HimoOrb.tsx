import { motion, AnimatePresence } from "motion/react";

interface HimoOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  appearance?: {
    orbColor?: string;
    orbShape?: string;
    particleEffect?: string;
  };
}

export default function HimoOrb({ isListening, isSpeaking, appearance }: HimoOrbProps) {
  const status = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';
  
  const orbColor = appearance?.orbColor || 'pink';
  const orbShape = appearance?.orbShape || 'circle';
  const particleEffect = appearance?.particleEffect || 'orbit';

  const getColorClasses = (type: 'bg' | 'border' | 'glow' | 'wave') => {
    const colors: Record<string, any> = {
      pink: { bg: 'bg-pink-500', border: 'border-pink-400', glow: 'rgba(236, 72, 153, 0.5)', wave: 'bg-pink-300' },
      cyan: { bg: 'bg-cyan-500', border: 'border-cyan-400', glow: 'rgba(6, 182, 212, 0.5)', wave: 'bg-cyan-300' },
      purple: { bg: 'bg-purple-600', border: 'border-purple-400', glow: 'rgba(147, 51, 234, 0.5)', wave: 'bg-purple-300' },
      gold: { bg: 'bg-yellow-500', border: 'border-yellow-400', glow: 'rgba(234, 179, 8, 0.5)', wave: 'bg-yellow-200' },
      emerald: { bg: 'bg-emerald-500', border: 'border-emerald-400', glow: 'rgba(16, 185, 129, 0.5)', wave: 'bg-emerald-300' },
      crimson: { bg: 'bg-red-600', border: 'border-red-400', glow: 'rgba(220, 38, 38, 0.5)', wave: 'bg-red-300' },
    };
    
    const activeColor = colors[orbColor] || colors.pink;
    const idleColor = colors.purple; // Default idle

    if (status === 'idle') return type === 'glow' ? activeColor.glow.replace('0.5', '0.2') : activeColor[type];
    return activeColor[type];
  };

  const getShapeClass = () => {
    switch (orbShape) {
      case 'square': return 'rounded-3xl';
      case 'diamond': return 'rounded-none rotate-45';
      case 'hexagon': return 'rounded-none [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]';
      default: return 'rounded-full';
    }
  };

  return (
    <div className="relative w-72 h-72 flex items-center justify-center">
      {/* Outer Glow Layer 1 */}
      <motion.div
        animate={{
          scale: status === 'speaking' ? [1, 1.3, 1] : status === 'listening' ? [1, 1.15, 1] : 1,
          opacity: status === 'speaking' ? [0.4, 0.7, 0.4] : status === 'listening' ? [0.3, 0.5, 0.3] : 0.1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 blur-3xl transition-colors duration-500 ${getShapeClass()} ${getColorClasses('bg')}`}
      />

      {/* Outer Glow Layer 2 (Rotating) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className={`absolute inset-[-20px] border border-dashed opacity-20 transition-colors duration-500 ${getShapeClass()} ${getColorClasses('border')}`}
      />

      {/* Main Orb Container */}
      <motion.div
        animate={{
          scale: status === 'speaking' ? [1, 1.05, 1] : 1,
          boxShadow: `0 0 50px ${getColorClasses('glow')}`
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`relative w-56 h-56 bg-gradient-to-br shadow-2xl flex items-center justify-center overflow-hidden border-2 backdrop-blur-md transition-all duration-500 ${getShapeClass()} ${
          status === 'speaking' 
            ? `from-${orbColor}-500/40 via-purple-600/40 to-indigo-700/40 ${getColorClasses('border')}/50` 
            : status === 'listening' 
            ? `from-${orbColor}-500/40 via-blue-600/40 to-purple-700/40 ${getColorClasses('border')}/50` 
            : 'from-gray-800/40 via-gray-900/40 to-black/40 border-white/10'
        }`}
      >
        {/* Dynamic Waveform Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center gap-1 px-8 ${orbShape === 'diamond' ? '-rotate-45' : ''}`}>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: status === 'speaking' 
                  ? [10, Math.random() * 60 + 20, 10] 
                  : status === 'listening' 
                  ? [5, Math.random() * 30 + 10, 5] 
                  : 4
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.05,
              }}
              className={`w-1.5 rounded-full transition-colors duration-500 ${
                status === 'idle' ? 'bg-white/20' : getColorClasses('wave')
              }`}
            />
          ))}
        </div>

        {/* Inner Core Light */}
        <motion.div
          animate={{
            opacity: status === 'idle' ? 0.2 : [0.4, 0.8, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"
        />
      </motion.div>

      {/* Orbiting Particles */}
      <AnimatePresence>
        {(status === 'speaking' || status === 'listening') && particleEffect !== 'none' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  x: particleEffect === 'float' ? (Math.random() - 0.5) * 100 : (Math.random() - 0.5) * 250,
                  y: particleEffect === 'float' ? -Math.random() * 200 : (Math.random() - 0.5) * 250,
                }}
                transition={{
                  duration: particleEffect === 'sparkle' ? 1 : 2.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
                className={`absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full blur-[1px] ${getColorClasses('bg')} opacity-60`}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
