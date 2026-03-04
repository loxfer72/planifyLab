import { SampleType, AnalysisType, Priority } from "./enums";

export interface PatientInfo {
  age: number;
  service: string;
  diagnosis: string;
}

export interface Sample {
  id: string;
  type: SampleType;                   // BLOOD | URINE | TISSUE (biologique)
  analysisType: AnalysisType;         // BLOOD | CHEMISTRY | ... (médical)
  priority: Priority;
  analysisTime: number;               // Durée de base en minutes
  arrivalTime: string;                // "HH:MM"
  patientId?: string;                 // v1 compat
  patientInfo?: PatientInfo;          // v2
}

export interface LunchBreak {
  start: string;    // "HH:MM"
  end: string;      // "HH:MM"
}

export interface Technician {
  id: string;
  name: string;
  specialty: AnalysisType[];          // Tableau (polyvalents possibles)
  speciality?: string;                // v1 compat (GENERAL, BLOOD...)
  efficiency: number;                 // Coefficient 0.8 - 1.2
  startTime: string;
  endTime: string;
  lunchBreak: LunchBreak | string;
}

export interface MaintenanceWindow {
  start: string;    // "HH:MM"
  end: string;      // "HH:MM"
}

export interface Equipment {
  id: string;
  name: string;
  type: AnalysisType;                 // Type principal
  compatibleTypes: string[];          // Noms d'analyses compatibles
  capacity: number;                   // Analyses simultanées max
  available?: boolean;                // v1 compat
  maintenanceWindow: MaintenanceWindow;
  cleaningTime: number;               // Minutes entre deux analyses
}

export interface LaboratoryInfo {
  name: string;
  openingHours: string;
  date: string;
}

export interface Constraints {
  maxProcessingTime: number;
  priorityRules: Priority[];
  contaminationPrevention: boolean;
  parallelProcessing: boolean;
}