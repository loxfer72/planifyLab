import { Technician } from "../types";
import { LunchState } from "../types/scheduler";
import { timeToMinutes } from "./utils";

const LUNCH_WINDOW_START = timeToMinutes("12:00");
const LUNCH_WINDOW_END = timeToMinutes("15:00");
const LUNCH_DURATION = 60;

/**
 * Parse lunchBreak qu'il soit un objet { start, end } ou une string "HH:MM-HH:MM"
 */
function parseLunchBreak(lunchBreak: { start: string; end: string } | string): { start: string; end: string } {
  if (typeof lunchBreak === "string") {
    const [start, end] = lunchBreak.split("-");
    return { start, end };
  }
  return lunchBreak;
}
/**
 * Initialise l'état de pause pour chaque technicien.
 */
export function initLunchStates(technicians: Technician[]): Map<string, LunchState> {
  const states = new Map<string, LunchState>();

  for (const tech of technicians) {
    const lunch        = parseLunchBreak(tech.lunchBreak);
    const plannedStart = timeToMinutes(lunch.start);
    const plannedEnd   = timeToMinutes(lunch.end);

    states.set(tech.id, {
      technicianId:     tech.id,
      plannedStart,
      plannedEnd,
      takenMinutes:     0,
      remainingMinutes: LUNCH_DURATION,
      interrupted:      false,
    });
  }

  return states;
}

/**
 * Vérifie si un technicien est en pause à un instant donné.
 * Tient compte des pauses fractionnées (si pause interrompue et reprise).
 */
export function isTechOnLunch(
  state: LunchState,
  atMinute: number
): boolean {
  if (state.remainingMinutes <= 0) return false; // Pause terminée

  // Pause non interrompue : créneau original
  if (!state.interrupted) {
    return atMinute >= state.plannedStart && atMinute < state.plannedEnd;
  }

  // Pause interrompue : reprise programmée
  if (state.resumeAfter !== undefined) {
    const resumeEnd = state.resumeAfter + state.remainingMinutes;
    return atMinute >= state.resumeAfter && atMinute < resumeEnd;
  }

  return false;
}

/**
 * Calcule le prochain créneau disponible pour un technicien
 * en tenant compte de sa pause déjeuner.
 *
 * Retourne le startTime ajusté.
 */
export function adjustForLunch(
  state: LunchState,
  proposedStart: number,
  analysisDuration: number
): number {
  if (state.remainingMinutes <= 0) return proposedStart;

  const lunchStart = state.interrupted && state.resumeAfter !== undefined
    ? state.resumeAfter
    : state.plannedStart;

  const lunchEnd = lunchStart + state.remainingMinutes;
  const analysisEnd = proposedStart + analysisDuration;

  // L'analyse chevauche la pause → la décaler après la pause
  const overlapsLunch =
    proposedStart < lunchEnd && analysisEnd > lunchStart;

  if (overlapsLunch) {
    return lunchEnd; // Commencer après la pause
  }

  return proposedStart;
}

/**
 * Enregistre la consommation de pause pour un technicien.
 * Appelée après chaque créneau de pause effectivement pris.
 */
export function consumeLunch(
  state: LunchState,
  fromMinute: number,
  toMinute: number
): void {
  const consumed = toMinute - fromMinute;
  state.takenMinutes     += consumed;
  state.remainingMinutes -= consumed;
  if (state.remainingMinutes < 0) state.remainingMinutes = 0;
}

/**
 * Gère l'interruption d'une pause par un échantillon STAT.
 * - Suspend la pause en cours
 * - Reprogramme le temps restant après l'analyse STAT
 * - Retourne le temps restant à reprogrammer
 */
export function interruptLunchForStat(
  state: LunchState,
  statStartMinute: number,
  statDuration: number
): number {
  if (state.remainingMinutes <= 0) return 0;

  const lunchStart = state.plannedStart;
  const elapsed    = Math.max(0, statStartMinute - lunchStart);
  const alreadyTaken = Math.min(elapsed, LUNCH_DURATION);

  state.takenMinutes     = alreadyTaken;
  state.remainingMinutes = LUNCH_DURATION - alreadyTaken;
  state.interrupted      = true;

  // Reprendre la pause après la fin de l'analyse STAT
  const statEnd = statStartMinute + statDuration;
  state.resumeAfter = statEnd < LUNCH_WINDOW_END
    ? statEnd
    : LUNCH_WINDOW_END; // Cas exceptionnel : décalé hors fenêtre

  return state.remainingMinutes;
}