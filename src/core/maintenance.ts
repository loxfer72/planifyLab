import { Equipment } from "../types";
import { timeToMinutes } from "./utils";

export function isEquipmentAvailableForWindow(
  equipment: Equipment,
  startMinutes: number,
  endMinutes: number
): boolean {
  // ✅ Pas de maintenance définie → toujours disponible
  if (!equipment.maintenanceWindow) return true;

  const maintStart = timeToMinutes(equipment.maintenanceWindow.start);
  const maintEnd   = timeToMinutes(equipment.maintenanceWindow.end);

  const overlaps = startMinutes < maintEnd && endMinutes > maintStart;
  return !overlaps;
}

export function getAvailableAfterMaintenance(
  equipment: Equipment,
  requestedStart: number
): number {
  // ✅ Pas de maintenance définie → inchangé
  if (!equipment.maintenanceWindow) return requestedStart;

  const maintEnd   = timeToMinutes(equipment.maintenanceWindow.end);
  const maintStart = timeToMinutes(equipment.maintenanceWindow.start);

  if (requestedStart >= maintStart && requestedStart < maintEnd) {
    return maintEnd;
  }

  return requestedStart;
}