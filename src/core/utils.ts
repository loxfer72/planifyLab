import { Sample, Technician, Equipment } from "../types";
import { resolveAnalysisType } from "./analysisMapping";

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Calcule la durée ajustée selon le coefficient d'efficacité du technicien.
 * Formule officielle : Math.round(durée_base / coefficient)
 */
export function adjustedDuration(baseDuration: number, efficiency: number): number {
  return Math.round(baseDuration / efficiency);
}

/**
 * Vérifie la compatibilité par analysisType (v2) :
 * Le technicien doit avoir la spécialité dans son tableau specialty[].
 * L'équipement doit avoir le même type que l'analysisType de l'échantillon.
 * Résout l'analysisType depuis une string libre si nécessaire.
 */
export function isCompatibleV2(
  sample: Sample,
  technician: Technician,
  equipment: Equipment
): boolean {
  const resolvedType = resolveAnalysisType(sample.analysisType);

  if (!resolvedType) return false;

  const techOk  = technician.specialty.includes(resolvedType);
  const equipOk = equipment.type === resolvedType;

  return techOk && equipOk;
}


/**
 * Compatibilité v1 conservée pour rétrocompatibilité.
 */
export function isCompatible(
  sample: Sample,
  technician: Technician,
  equipment: Equipment
): boolean {
  // Si le technicien a un tableau specialty v2 → déléguer à v2
  if (technician.specialty && technician.specialty.length > 0) {
    return isCompatibleV2(sample, technician, equipment);
  }

  // Fallback v1 : GENERAL ou même type
  const techOk =
    technician.speciality === "GENERAL" ||
    technician.speciality === sample.type;
  const equipOk = equipment.type === sample.analysisType || equipment.type === sample.type;
  return techOk && equipOk;
}

/**
 * Vérifie si un équipement a de la capacité disponible à un instant t.
 * currentUsage = nombre d'analyses actives sur cet équipement à cet instant.
 */
export function hasCapacity(equipment: Equipment, currentUsage: number): boolean {
  return currentUsage < equipment.capacity;
}

/**
 * Compte le nombre d'analyses actives sur un équipement à un instant donné.
 */
export function getEquipmentUsageAt(
  equipmentId: string,
  atMinute: number,
  schedule: Array<{ equipmentId: string; startTime: string; endTime: string }>
): number {
  return schedule.filter((entry) => {
    if (entry.equipmentId !== equipmentId) return false;
    const start = timeToMinutes(entry.startTime);
    const end   = timeToMinutes(entry.endTime);
    return atMinute >= start && atMinute < end;
  }).length;
}