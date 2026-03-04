import { SampleType, Priority, SpecialityType } from "./enums";

export interface Sample {
  id: string;
  type: SampleType;
  priority: Priority;
  analysisTime: number;       // minutes
  arrivalTime: string;        // "HH:MM"
  patientId: string;
}

export interface Technician {
  id: string;
  name: string;
  speciality: SpecialityType;
  startTime: string;          // "HH:MM"
  endTime: string;            // "HH:MM"
}

export interface Equipment {
  id: string;
  name: string;
  type: SampleType;
  available: boolean;
}