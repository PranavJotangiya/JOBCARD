/** Manufacturer / Jobber master records (contacts). */
export interface Manufacturer {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Jobber {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface ContactStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dispatched: number;
  cancelled: number;
}
