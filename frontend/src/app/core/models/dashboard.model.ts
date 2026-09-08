import type { Role } from './auth.model';
import type { JobCard } from './jobcard.model';
import type { ContactStats } from './contact.model';

export interface DashboardSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dispatched: number;
  cancelled: number;
}

export interface ContactBreakdown {
  id: string;
  name: string;
  stats: ContactStats;
}

/** Union of the three role-specific payloads from GET /dashboard. */
export interface DashboardData {
  role: Role;
  greetingName: string;
  summary: DashboardSummary;
  recent?: JobCard[];
  /** Jobber view: "which Manufacturer's work do I have?" */
  manufacturers?: ContactBreakdown[];
  /** Manufacturer view: "which Jobber has my work?" */
  jobbers?: ContactBreakdown[];
}
