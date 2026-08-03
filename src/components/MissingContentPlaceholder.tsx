import React from 'react';

export function MissingContentPlaceholder({ title, description }: { title: string; description?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="my-8 rounded border-l-4 border-yellow-500 bg-yellow-500/10 p-4 text-yellow-700 dark:text-yellow-400">
      <div className="flex items-start">
        <div className="ml-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">{title} (TODO/BLOCKED)</h3>
          {description && (
            <div className="mt-2 text-sm">
              <p>{description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
