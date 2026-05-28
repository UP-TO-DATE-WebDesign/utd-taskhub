export interface SprintCapacitySummary {
  userId: string;
  sprintId: string;
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  capacityHours: number;
  assignedHours: number;
  loggedHours: number;
  consumedHours: number;
  remainingHours: number;
  isOverbooked: boolean;
}
