/**
 * LoadingSpinner Component
 * Glass-styled loading indicator used as Suspense fallback and transition states.
 * Renders a pulsing aurora orb with animated rings.
 */

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute w-24 h-24 rounded-full border border-[var(--accent-color)]/20 animate-ping" />

        {/* Middle rotating ring */}
        <div className="absolute w-16 h-16 rounded-full border-2 border-transparent border-t-[var(--accent-color)] border-r-[var(--accent-secondary)] animate-spin" />

        {/* Inner aurora orb */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] shadow-lg shadow-[#5e5ce6]/30 animate-pulse" />
      </div>
    </div>
  );
}
