import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from './Button.js';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon = <HelpCircle size={48} className="text-text-silver" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-dark-surface rounded-lg min-h-[300px] border border-dashed border-border-gray">
      <div className="mb-4 flex items-center justify-center p-4 bg-mid-dark rounded-full">
        {icon}
      </div>
      <h3 className="text-lg font-title font-bold text-text-base mb-2">{title}</h3>
      <p className="text-sm text-text-silver max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
