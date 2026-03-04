import { Sample, Technician, Equipment } from "../types";

/**
 * Convertit "HH:MM" en minutes depuis minuit
 * @example timeToMinutes("09:30") => 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convertit des minutes depuis minuit en "HH:MM"
 * @example minutesToTime(570) => "09:30"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Vérifie la compatibilité technicien + équipement avec un échantillon
 * Règle : GENERAL peut tout faire, sinon les types doivent matcher
 */
export function isCompatible(
  sample: Sample,
  technician: Technician,
  equipment: Equipment
): boolean {
  const techOk =
    technician.speciality === "GENERAL" ||
    technician.speciality === sample.type;

  const equipOk = equipment.type === sample.type;

  return techOk && equipOk;
}