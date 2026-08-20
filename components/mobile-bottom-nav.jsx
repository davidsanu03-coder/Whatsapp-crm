import React from 'react';

export default function MobileBottomNav({ active = 'dashboard', onNavigate = () => {}, onMore = () => {} }) {
  const items = [
    ['dashboard', '⌂', 'Home'],
    ['leads', '👥', 'Leads'],
    ['conversations', '💬', 'Messages'],
    ['ai', '✨', 'AI'],
    ['more', '☰', 'More'],
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 py-2">
        {items.map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => id === 'more' ? onMore() : onNavigate(id)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-xs ${active === id ? 'font-semibold' : 'text-gray-500'}`}
            aria-label={label}
          >
            <span className="mb-1 text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
