'use client';

import { StageCard } from './StageCard';
import { JobType, JobStatus } from '@/types/pipeline';

interface PipelineJob {
  jobType: JobType;
  status: JobStatus;
  durationMs?: number;
  errorMessage?: string;
  outputSummary?: Record<string, any>;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

interface PipelineTimelineProps {
  jobs: PipelineJob[];
}

export function PipelineTimeline({ jobs }: PipelineTimelineProps) {
  // Ordered list of stages
  const STAGES_ORDER: JobType[] = [
    'ip_enrichment',
    'identity_lookup',
    'company_enrichment',
    'domain_discovery',
    'email_generation',
    'email_verification',
  ];

  // Map jobs by jobType for fast lookup
  const jobsMap = new Map<JobType, PipelineJob>();
  for (const j of jobs) {
    jobsMap.set(j.jobType, j);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0' }}>
          Pipeline Execution Timeline
        </h2>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {jobs.filter((j) => j.status === 'complete').length} / {STAGES_ORDER.length} stages complete
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
          paddingLeft: '20px',
        }}
      >
        {/* Vertical Line track */}
        <div
          style={{
            position: 'absolute',
            left: '4px',
            top: '24px',
            bottom: '24px',
            width: '2px',
            background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, rgba(255,255,255,0.05) 100%)',
            zIndex: 0,
          }}
        />

        {STAGES_ORDER.map((stageType) => {
          const job = jobsMap.get(stageType) || {
            jobType: stageType,
            status: 'queued' as JobStatus,
          };

          // Circle indicator color
          let circleBg = 'rgba(255,255,255,0.1)';
          let circleBorder = 'rgba(255,255,255,0.08)';
          if (job.status === 'complete') {
            circleBg = '#10b981';
            circleBorder = 'rgba(16, 185, 129, 0.4)';
          } else if (job.status === 'running') {
            circleBg = '#3b82f6';
            circleBorder = 'rgba(59, 130, 246, 0.4)';
          } else if (job.status === 'failed') {
            circleBg = '#ef4444';
            circleBorder = 'rgba(239, 68, 68, 0.4)';
          }

          return (
            <div key={stageType} style={{ position: 'relative', zIndex: 1 }}>
              {/* Circle Connector Node */}
              <div
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '22px',
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: circleBg,
                  border: `2px solid ${circleBorder}`,
                  boxShadow: job.status === 'running' || job.status === 'complete' ? `0 0 8px ${circleBg}` : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              <StageCard
                stageType={job.jobType}
                status={job.status}
                durationMs={job.durationMs}
                errorMessage={job.errorMessage}
                outputSummary={job.outputSummary}
                startedAt={job.startedAt}
                completedAt={job.completedAt}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
