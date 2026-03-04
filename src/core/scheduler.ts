import {
  Sample, Technician, Equipment,
  SchedulerInput, SchedulerOutput, ScheduleEntry, Metrics, LunchState,
  WaitingTimeByPriority,
} from "../types";
import {
  timeToMinutes, minutesToTime, adjustedDuration,
  isCompatibleV2, getEquipmentUsageAt,
} from "./utils";
import {
  isEquipmentAvailableForWindow, getAvailableAfterMaintenance,
} from "./maintenance";
import {
  initLunchStates, adjustForLunch, interruptLunchForStat,
} from "./lunch";
import { resolveAnalysisType } from "./analysisMapping";

const PRIORITY_ORDER: Record<string, number> = {
  STAT: 0, URGENT: 1, ROUTINE: 2,
};

// ─── Tri ──────────────────────────────────────────────────────────────────────

function sortSamples(samples: Sample[]): Sample[] {
  return [...samples].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    // À priorité égale → heure d'arrivée croissante
    return timeToMinutes(a.arrivalTime) - timeToMinutes(b.arrivalTime);
  });
}

// ─── Calcul du créneau ────────────────────────────────────────────────────────

function computeStartTime(
  sample: Sample,
  tech: Technician,
  equip: Equipment,
  techFreeAt: number,
  equipFreeAt: number,
  lunchState: LunchState,
  duration: number,
  currentSchedule: ScheduleEntry[]
): number {
  // 1. Earliest possible = max de toutes les contraintes de base
  let start = Math.max(
    timeToMinutes(sample.arrivalTime),
    timeToMinutes(tech.startTime),
    techFreeAt,
    equipFreeAt,
  );

  // 2. Contrainte maintenance équipement
  start = getAvailableAfterMaintenance(equip, start);

  // Si l'analyse chevauche encore la maintenance après décalage → avancer après
  while (!isEquipmentAvailableForWindow(equip, start, start + duration)) {
    start = timeToMinutes(equip.maintenanceWindow.end);
  }

  // 3. Contrainte pause déjeuner (sauf STAT qui peut interrompre)
  if (sample.priority !== "STAT") {
    start = adjustForLunch(lunchState, start, duration);
  }

  // 4. Capacité équipement : si plein, décaler à la fin de la première analyse libérée
  let attempts = 0;
  while (
    getEquipmentUsageAt(equip.id, start, currentSchedule) >= equip.capacity
    && attempts < 100
  ) {
    start++;
    attempts++;
  }

  // 5. Nettoyage : ajouter cleaningTime après la dernière analyse sur cet équipement
  const lastEquipEnd = currentSchedule
    .filter((e) => e.equipmentId === equip.id)
    .map((e) => timeToMinutes(e.endTime))
    .sort((a, b) => b - a)[0];

  if (lastEquipEnd !== undefined && start < lastEquipEnd + equip.cleaningTime) {
    const cleanedStart = lastEquipEnd + equip.cleaningTime;
    start = Math.max(start, cleanedStart);
  }

  return start;
}

// ─── Métriques ────────────────────────────────────────────────────────────────

function computeMetrics(
  schedule: ScheduleEntry[],
  technicians: Technician[],
  conflicts: number,
  lunchInterruptions: number,
  samples: Sample[]
): Metrics {
  if (schedule.length === 0) {
    const empty: WaitingTimeByPriority = { STAT: 0, URGENT: 0, ROUTINE: 0 };
    return { totalTime: 0, efficiency: 0, conflicts, averageWaitingTime: empty,
             technicianUtilization: {}, parallelismRate: 0, lunchInterruptions };
  }

  const allStarts = schedule.map((e) => timeToMinutes(e.startTime));
  const allEnds   = schedule.map((e) => timeToMinutes(e.endTime));
  const planStart = Math.min(...allStarts);
  const planEnd   = Math.max(...allEnds);
  const totalTime = planEnd - planStart;

  // Efficacité officielle : Σ(occupation_technicien) / nb_tech / totalTime * 100
  const techOccupation: Record<string, number> = {};
  for (const entry of schedule) {
    const dur = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
    techOccupation[entry.technicianId] = (techOccupation[entry.technicianId] ?? 0) + dur;
  }

  const sumOccupation = Object.values(techOccupation).reduce((a, b) => a + b, 0);
  const efficiency = totalTime > 0
    ? Math.round((sumOccupation / technicians.length / totalTime) * 1000) / 10
    : 0;

  // Utilisation par technicien
  const technicianUtilization: Record<string, number> = {};
  for (const tech of technicians) {
    const occ = techOccupation[tech.id] ?? 0;
    technicianUtilization[tech.id] = totalTime > 0
      ? Math.round((occ / totalTime) * 1000) / 10
      : 0;
  }

  // Temps d'attente moyen par priorité
  const waitByPriority: Record<string, number[]> = { STAT: [], URGENT: [], ROUTINE: [] };
  for (const entry of schedule) {
    const sample = samples.find((s) => s.id === entry.sampleId);
    if (!sample) continue;
    const wait = timeToMinutes(entry.startTime) - timeToMinutes(sample.arrivalTime);
    waitByPriority[entry.priority].push(Math.max(0, wait));
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const averageWaitingTime = {
    STAT:    avg(waitByPriority.STAT),
    URGENT:  avg(waitByPriority.URGENT),
    ROUTINE: avg(waitByPriority.ROUTINE),
  };

  // Taux de parallélisme : % des minutes où ≥2 analyses tournent simultanément
  let parallelMinutes = 0;
  for (let t = planStart; t < planEnd; t++) {
    const active = schedule.filter((e) => {
      const s = timeToMinutes(e.startTime);
      const end = timeToMinutes(e.endTime);
      return t >= s && t < end;
    }).length;
    if (active >= 2) parallelMinutes++;
  }
  const parallelismRate = totalTime > 0
    ? Math.round((parallelMinutes / totalTime) * 1000) / 10
    : 0;

  return {
    totalTime, efficiency, conflicts,
    averageWaitingTime, technicianUtilization,
    parallelismRate, lunchInterruptions,
  };
}

// ─── Algorithme principal ─────────────────────────────────────────────────────

export function schedule(input: SchedulerInput): SchedulerOutput {
  const { samples, technicians, equipment } = input;

  const sorted = sortSamples(samples);

  // Trackers de disponibilité
  const techFreeAt  = new Map<string, number>(
    technicians.map((t) => [t.id, timeToMinutes(t.startTime)])
  );
const equipFreeAt = new Map<string, number>(
  equipment.map((e) => [
    e.id,
    e.maintenanceWindow ? timeToMinutes(e.maintenanceWindow.end) : 0,
  ])
);

  const lunchStates = initLunchStates(technicians);
  const result: ScheduleEntry[] = [];
  let conflicts         = 0;
  let lunchInterruptions = 0;

  for (const sample of sorted) {
    let bestStart  = Infinity;
    let bestTech: Technician | null  = null;
    let bestEquip: Equipment | null  = null;
    let bestDuration = 0;

    // First-fit parmi toutes les paires compatibles
for (const tech of technicians) {
  for (const equip of equipment) {
    // 🔍 DEBUG TEMPORAIRE
    const resolved = resolveAnalysisType(sample.analysisType);
    console.log(`[DEBUG] Sample ${sample.id} | analysisType raw: "${sample.analysisType}" | resolved: ${resolved}`);
    console.log(`[DEBUG] Tech ${tech.id} | specialty: ${JSON.stringify(tech.specialty)}`);
    console.log(`[DEBUG] Equip ${equip.id} | type: ${equip.type}`);
    console.log(`[DEBUG] techOk: ${resolved && tech.specialty.includes(resolved)} | equipOk: ${resolved === equip.type}`);
    console.log("---");
    // 🔍 FIN DEBUG

    if (!isCompatibleV2(sample, tech, equip)) continue;

// 🔍 DEBUG
console.log(`[DEBUG] Paire compatible trouvée : ${tech.id} + ${equip.id}, calcul du slot...`);
try {
  const duration = adjustedDuration(sample.analysisTime, tech.efficiency);
  const lunchState = lunchStates.get(tech.id)!;
  console.log(`[DEBUG] duration: ${duration} | lunchState: ${JSON.stringify(lunchState)}`);
  const start = computeStartTime(sample, tech, equip, techFreeAt.get(tech.id)!, equipFreeAt.get(equip.id)!, lunchState, duration, result);
  console.log(`[DEBUG] start calculé: ${start}`);
} catch (e) {
  console.error(`[DEBUG] ERREUR dans computeStartTime:`, e);
}

        const duration = adjustedDuration(sample.analysisTime, tech.efficiency);
        const lunchState = lunchStates.get(tech.id)!;

        const start = computeStartTime(
          sample, tech, equip,
          techFreeAt.get(tech.id)!,
          equipFreeAt.get(equip.id)!,
          lunchState,
          duration,
          result
        );

        // Greedy first-fit : prendre la première paire qui commence le plus tôt
        if (start < bestStart) {
          bestStart    = start;
          bestTech     = tech;
          bestEquip    = equip;
          bestDuration = duration;
        }
      }
    }

    if (!bestTech || !bestEquip) {
      conflicts++;
      continue;
    }

    const lunchState = lunchStates.get(bestTech.id)!;

    // Gestion interruption STAT pendant pause déjeuner
    let wasStatInterrupt = false;
    if (sample.priority === "STAT" && lunchState.remainingMinutes > 0) {
      const lunchStart = lunchState.plannedStart;
      const lunchEnd   = lunchState.plannedEnd;
      // Le technicien est en pause et le STAT arrive pendant
      if (bestStart >= lunchStart && bestStart < lunchEnd) {
        interruptLunchForStat(lunchState, bestStart, bestDuration);
        wasStatInterrupt = true;
        lunchInterruptions++;
      }
    }

    const endMinutes = bestStart + bestDuration;

    result.push({
      sampleId:        sample.id,
      technicianId:    bestTech.id,
      equipmentId:     bestEquip.id,
      startTime:       minutesToTime(bestStart),
      endTime:         minutesToTime(endMinutes),
      priority:        sample.priority,
      adjustedDuration: bestDuration,
      wasStatInterrupt,
    });

    // Mise à jour disponibilités
    // Équipement : libéré après analyse + nettoyage
    techFreeAt.set(bestTech.id, endMinutes);
    equipFreeAt.set(bestEquip.id, endMinutes + bestEquip.cleaningTime);
  }

  // Tri chronologique final
  result.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return {
    schedule: result,
    metrics: computeMetrics(result, technicians, conflicts, lunchInterruptions, samples),
  };
}