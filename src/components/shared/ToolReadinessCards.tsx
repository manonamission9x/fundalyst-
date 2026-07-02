'use client';

import Link from 'next/link';
import { ANALYSIS_TOOLS } from '@/lib/tool-metadata';
import { useGlobalDataStore } from '@/store/global-data-store';

interface ToolReadinessCardsProps {
  className?: string;
  limit?: number;
}

export default function ToolReadinessCards({ className, limit }: ToolReadinessCardsProps) {
  const getToolReadiness = useGlobalDataStore((s) => s.getToolReadiness);
  const tools = limit ? ANALYSIS_TOOLS.slice(0, limit) : ANALYSIS_TOOLS;

  return (
    <div className={className || 'tool-readiness-grid'}>
      {tools.map((tool) => {
        const readiness = getToolReadiness(tool.id);
        const missing = readiness.missingMetrics;

        return (
          <Link key={tool.id} href={tool.href} className="workspace-quick-link">
            <div className="flex items-center justify-between">
              <span>{tool.label}</span>
              <span className={`text-2xs ${readiness.ready ? 'text-primary' : 'text-muted'}`}>
                {readiness.ready ? 'Ready' : `${missing.length} missing`}
              </span>
            </div>
            <div className="text-xs text-muted font-mono mt-1">
              {readiness.ready
                ? tool.answer
                : missing.length > 0
                  ? `Needs: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '...' : ''}`
                  : tool.description}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
