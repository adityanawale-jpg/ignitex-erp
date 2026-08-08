import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wrench, Gem, ArrowLeft, HardHat } from 'lucide-react';
import { useAppDispatch } from '@/hooks';
import { closeAllTabs } from '@/redux/slices/tabsSlice';

const UnderConstruction: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();

  const handleGoHome = () => {
    dispatch(closeAllTabs());
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">

      {/* Decorative ring */}
      <div className="relative mb-8">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(201,151,58,0.08)', border: '2px dashed rgba(201,151,58,0.3)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(201,151,58,0.12)' }}
          >
            <HardHat className="w-10 h-10" style={{ color: '#C9973A' }} />
          </div>
        </div>
        {/* Small wrench badge */}
        <div
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '2px solid var(--border-color)' }}
        >
          <Wrench className="w-4 h-4" style={{ color: '#C9973A' }} />
        </div>
      </div>

      {/* Heading */}
      <h2
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
      >
        Under Construction
      </h2>

      {/* Path badge */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono mb-3"
        style={{ background: 'rgba(201,151,58,0.1)', color: '#C9973A', border: '1px solid rgba(201,151,58,0.2)' }}
      >
        <Gem className="w-3 h-3" />
        {location.pathname}
      </div>

      <p
        className="text-sm max-w-xs leading-relaxed mb-8"
        style={{ color: 'var(--text-muted)' }}
      >
        This module is currently being developed and will be available soon. Check back later.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'rgba(201,151,58,0.15)',
            border: '1px solid rgba(201,151,58,0.3)',
            color: '#C9973A',
          }}
        >
          <Gem className="w-4 h-4" />
          Home
        </button>
      </div>
    </div>
  );
};

export default UnderConstruction;
