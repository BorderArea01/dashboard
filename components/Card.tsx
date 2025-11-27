import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`relative bg-slate-800/50 border border-slate-700 backdrop-blur-sm rounded-lg flex flex-col ${className}`}>
        {/* Decorative corners */}
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-cyan-500 rounded-tl-lg"></div>
        <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg"></div>
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg"></div>
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-cyan-500 rounded-br-lg"></div>

        {/* Header */}
        <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
            {icon && <span className="text-cyan-400">{icon}</span>}
            <h3 className="text-sm font-semibold text-cyan-100 tracking-wider uppercase">{title}</h3>
            {/* Title Decoration */}
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent ml-2"></div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden relative">
            {children}
        </div>
    </div>
  );
};

export default Card;