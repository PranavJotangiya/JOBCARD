import { Types } from 'mongoose';
import { JobCard } from '../jobcards/jobcard.model';
import { WorkStatus } from '../jobcards/jobcard.constants';
import { jobCardService } from '../jobcards/jobcard.service';
import { Jobber } from '../jobbers/jobber.model';
import { Manufacturer } from '../manufacturers/manufacturer.model';
import { Role } from '../../constants/roles';
import type { AuthenticatedUser } from '../../types/common.types';

/**
 * Role-aware dashboard payloads.
 *
 * Jobber   -> "which Manufacturer's work do I have to do?"  (summary + recent + per-manufacturer)
 * Manufacturer -> "which Jobber has my work?"               (summary + My Jobbers with counts)
 */
export interface DashboardSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dispatched: number;
  cancelled: number;
}

async function contactBreakdown(
  matchField: 'jobberId' | 'manufacturerId',
  scope: Record<string, unknown>,
): Promise<Map<string, DashboardSummary>> {
  const rows = await JobCard.aggregate<{
    _id: Types.ObjectId;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    dispatched: number;
    cancelled: number;
  }>([
    { $match: { ...scope, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: `$${matchField}`,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $in: ['$workStatus', [WorkStatus.DRAFT, WorkStatus.READY]] }, 1, 0] },
        },
        inProgress: { $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.IN_PROGRESS] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.COMPLETED] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.CANCELLED] }, 1, 0] } },
        dispatched: { $sum: { $cond: [{ $eq: ['$dispatchStatus', 'DISPATCHED'] }, 1, 0] } },
      },
    },
  ]);

  const map = new Map<string, DashboardSummary>();
  for (const r of rows) {
    map.set(String(r._id), {
      total: r.total,
      pending: r.pending,
      inProgress: r.inProgress,
      completed: r.completed,
      dispatched: r.dispatched,
      cancelled: r.cancelled,
    });
  }
  return map;
}

const emptySummary = (): DashboardSummary => ({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  dispatched: 0,
  cancelled: 0,
});

export const dashboardService = {
  async forJobber(actor: AuthenticatedUser) {
    const [summary, recent, manufacturers, breakdown] = await Promise.all([
      jobCardService.summaryFor(actor),
      jobCardService.recentFor(actor, 6),
      Manufacturer.find({ linkedJobberIds: actor.jobberId }).select('name').sort({ name: 1 }),
      contactBreakdown('manufacturerId', { jobberId: new Types.ObjectId(actor.jobberId!) }),
    ]);

    return {
      role: Role.JOBBER,
      greetingName: actor.name,
      summary,
      recent,
      manufacturers: manufacturers.map((m) => ({
        id: m.id,
        name: m.name,
        stats: breakdown.get(m.id) ?? emptySummary(),
      })),
    };
  },

  async forManufacturer(actor: AuthenticatedUser) {
    const [summary, jobbers, breakdown] = await Promise.all([
      jobCardService.summaryFor(actor),
      Jobber.find({ linkedManufacturerIds: actor.manufacturerId }).select('name').sort({ name: 1 }),
      contactBreakdown('jobberId', { manufacturerId: new Types.ObjectId(actor.manufacturerId!) }),
    ]);

    return {
      role: Role.MANUFACTURER,
      greetingName: actor.name,
      summary,
      jobbers: jobbers.map((j) => ({
        id: j.id,
        name: j.name,
        stats: breakdown.get(j.id) ?? emptySummary(),
      })),
    };
  },

  async forAdmin(actor: AuthenticatedUser) {
    const [summary, recent] = await Promise.all([
      jobCardService.summaryFor(actor),
      jobCardService.recentFor(actor, 8),
    ]);
    return { role: Role.ADMIN, greetingName: actor.name, summary, recent };
  },
};
