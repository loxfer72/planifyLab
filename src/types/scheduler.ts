import { Priority } from "./enums";
import { Sample, Technician, Equipment } from "./entities";

export interface ScheduleEntry {
  sampleId: string;
  technicianId: string;
  equipmentId: string;
  startTime: string;          // "HH:MM"
  endTime: string;            // "HH:MM"
  priority: Priority;
}

export interface Metrics {
  totalTime: number;          // minutes
  efficiency: number;         // pourcentage 0-100
  conflicts: number;          // samples non schedulés
}

export interface SchedulerInput {
  samples: Sample[];
  technicians: Technician[];
  equipment: Equipment[];
}

export interface SchedulerOutput {
  schedule: ScheduleEntry[];
  metrics: Metrics;
}