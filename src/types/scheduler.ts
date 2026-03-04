import { Priority } from "./enums";
import { Sample, Technician, Equipment, LaboratoryInfo, Constraints } from "./entities";

export interface ScheduleEntry {
  sampleId: string;
  technicianId: string;
  equipmentId: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  adjustedDuration: number;           // Durée réelle après coefficient
  wasStatInterrupt?: boolean;         // true si a interrompu une pause
}

// Suivi interne de la pause déjeuner d'un technicien
export interface LunchState {
  technicianId: string;
  plannedStart: number;               // En minutes
  plannedEnd: number;
  takenMinutes: number;               // Minutes de pause déjà prises
  remainingMinutes: number;           // Minutes restantes à prendre
  interrupted: boolean;
  resumeAfter?: number;               // Reprise prévue (en minutes)
}

export interface WaitingTimeByPriority {
  STAT: number;
  URGENT: number;
  ROUTINE: number;
}

export interface Metrics {
  // v1 conservées
  totalTime: number;
  efficiency: number;                 // Formule officielle : Σ(occupation) / nb_tech / totalTime * 100
  conflicts: number;

  // v2 nouvelles
  averageWaitingTime: WaitingTimeByPriority;
  technicianUtilization: Record<string, number>;   // techId → % utilisation
  parallelismRate: number;            // % du temps où ≥2 analyses sont parallèles
  lunchInterruptions: number;         // Nb de pauses interrompues par STAT
}

export interface SchedulerInput {
  laboratory?: LaboratoryInfo;
  samples: Sample[];
  technicians: Technician[];
  equipment: Equipment[];
  constraints?: Constraints;
}

export interface SchedulerOutput {
  schedule: ScheduleEntry[];
  metrics: Metrics;
}