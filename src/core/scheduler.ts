import { Sample, ScheduleEntry, SchedulerInput, SchedulerOutput } from "../types";
import { timeToMinutes, minutesToTime, isCompatible } from "./utils";

// Map de priorité pour le tri
const PRIORITY_ORDER: Record<string, number> = {
  STAT: 0,
  URGENT: 1,
  ROUTINE: 2,
};

/**
 * Trie les samples par priorité décroissante (STAT en premier)
 */
function sortByPriority(samples: Sample[]): Sample[] {
  return [...samples].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

/**
 * Trouve le créneau le plus tôt possible pour une paire (tech, equipment)
 */
function findEarliestSlot(
  sample: Sample,
  techFreeAt: number,
  equipFreeAt: number,
  techStartTime: number
): number {
  return Math.max(
    timeToMinutes(sample.arrivalTime),
    techFreeAt,
    equipFreeAt,
    techStartTime
  );
}

/**
 * Calcule les métriques finales du planning
 */
function computeMetrics(
  schedule: ScheduleEntry[],
  totalAnalysisTime: number,
  conflicts: number
): SchedulerOutput["metrics"] {
  if (schedule.length === 0) {
    return { totalTime: 0, efficiency: 0, conflicts };
  }

  const allStarts = schedule.map((e) => timeToMinutes(e.startTime));
  const allEnds = schedule.map((e) => timeToMinutes(e.endTime));

  const totalTime = Math.max(...allEnds) - Math.min(...allStarts);
  const efficiency = totalTime > 0
    ? Math.round((totalAnalysisTime / totalTime) * 1000) / 10  // 1 décimale --- à noté que le cachier des charges sembles inverser totalAnalysisTime et totalTime dans son calcul
    : 0;

  return { totalTime, efficiency, conflicts };
}

/**
 * Algorithme principal de scheduling
 * Stratégie greedy : pour chaque sample (trié par priorité),
 * on choisit la paire (tech, equipment) qui libère le créneau le plus tôt
 */
export function schedule(input: SchedulerInput): SchedulerOutput {
  const { samples, technicians, equipment } = input;

  const sortedSamples = sortByPriority(samples);

  // Tracker la disponibilité de chaque ressource (en minutes depuis minuit)
  const techFreeAt = new Map<string, number>(
    technicians.map((t) => [t.id, timeToMinutes(t.startTime)])
  );
  const equipFreeAt = new Map<string, number>(
    equipment.map((e) => [e.id, 0])
  );

  const result: ScheduleEntry[] = [];
  let totalAnalysisTime = 0;
  let conflicts = 0;

  for (const sample of sortedSamples) {
    let bestSlot: number = Infinity;
    let bestTech = null;
    let bestEquip = null;

    // Cherche la meilleure paire compatible
    for (const tech of technicians) {
      for (const equip of equipment) {
        if (!equip.available) continue; // à changer lors de l'ajout de la fonction de maintenance
        if (!isCompatible(sample, tech, equip)) continue;

        const slot = findEarliestSlot(
          sample,
          techFreeAt.get(tech.id) ?? 0,
          equipFreeAt.get(equip.id) ?? 0,
          timeToMinutes(tech.startTime)
        );

        // Greedy : on prend la paire qui commence le plus tôt
        if (slot < bestSlot) {
          bestSlot = slot;
          bestTech = tech;
          bestEquip = equip;
        }
      }
    }

    if (!bestTech || !bestEquip) {
      // Aucune ressource compatible trouvée → conflit
      conflicts++;
      continue;
    }

    const endMinutes = bestSlot + sample.analysisTime;

    result.push({
      sampleId: sample.id,
      technicianId: bestTech.id,
      equipmentId: bestEquip.id,
      startTime: minutesToTime(bestSlot),
      endTime: minutesToTime(endMinutes),
      priority: sample.priority,
    });

    // Mise à jour des disponibilités
    techFreeAt.set(bestTech.id, endMinutes);
    equipFreeAt.set(bestEquip.id, endMinutes);
    totalAnalysisTime += sample.analysisTime;
  }

  // Tri chronologique final du planning
  result.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  return {
    schedule: result,
    metrics: computeMetrics(result, totalAnalysisTime, conflicts),
  };
}