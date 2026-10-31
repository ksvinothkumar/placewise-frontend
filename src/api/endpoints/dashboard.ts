import { http } from '../http';
import type { CandidateRef } from './applications';

export interface DashboardData {
  kpis: { openJobs: number; openings: number; activePipeline: number; candidates: number; placements: number; billed?: number | null; forecast?: number | null; avgTimeToFill: number | null };
  funnel: { stage: string; count: number }[];
  sources: { name: string; value: number }[];
  atRisk: { id: string; title: string; client: string; days: number; live: number; advanced: number; risk: number }[];
  interviews: { id: string; when: string; round?: string; mode: string; interviewer: string; application: { candidate: Pick<CandidateRef, 'name'> } }[];
  tasks?: { open: number; overdue: number; today: number; next: { id: string; title: string; due?: string; candidate?: { id: string; name: string } | null }[] };
  activity: { id: string; text: string; kind?: string; createdAt: string }[];
}

export const dashboardKey = ['dashboard'] as const;
export const dashboardApi = { get: () => http.get<DashboardData>('/dashboard') };
