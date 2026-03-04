import { initLunchStates, isTechOnLunch, adjustForLunch, interruptLunchForStat, consumeLunch } from "../src/core/lunch";
import { Technician } from "../src/types";
import { timeToMinutes } from "../src/core/utils";

const tech: Technician = {
  id: "T001", name: "Alice", specialty: ["BLOOD"],
  efficiency: 1.0, startTime: "08:00", endTime: "17:00",
  lunchBreak: { start: "12:00", end: "13:00" },
};

describe("initLunchStates", () => {
  it("initialise correctement l'état de pause", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;

    expect(state.plannedStart).toBe(timeToMinutes("12:00"));
    expect(state.plannedEnd).toBe(timeToMinutes("13:00"));
    expect(state.takenMinutes).toBe(0);
    expect(state.remainingMinutes).toBe(60);
    expect(state.interrupted).toBe(false);
  });
});

describe("isTechOnLunch", () => {
  it("false avant la pause", () => {
    const states = initLunchStates([tech]);
    expect(isTechOnLunch(states.get("T001")!, timeToMinutes("11:59"))).toBe(false);
  });

  it("true pendant la pause", () => {
    const states = initLunchStates([tech]);
    expect(isTechOnLunch(states.get("T001")!, timeToMinutes("12:30"))).toBe(true);
  });

  it("false après la pause", () => {
    const states = initLunchStates([tech]);
    expect(isTechOnLunch(states.get("T001")!, timeToMinutes("13:00"))).toBe(false);
  });

  it("false si pause déjà entièrement consommée", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    state.remainingMinutes = 0;
    expect(isTechOnLunch(state, timeToMinutes("12:30"))).toBe(false);
  });
});

describe("adjustForLunch", () => {
  it("analyse avant la pause → startTime inchangé", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // Analyse de 30min démarrant à 11:00, finit avant 12:00
    expect(adjustForLunch(state, timeToMinutes("11:00"), 30)).toBe(timeToMinutes("11:00"));
  });

  it("analyse chevauchant la pause → décalée après la pause", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // Analyse de 30min démarrant à 11:45 : finirait à 12:15 → chevauche
    expect(adjustForLunch(state, timeToMinutes("11:45"), 30)).toBe(timeToMinutes("13:00"));
  });

  it("analyse démarrant pendant la pause → décalée après", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    expect(adjustForLunch(state, timeToMinutes("12:15"), 45)).toBe(timeToMinutes("13:00"));
  });

  it("analyse après la pause → inchangée", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    expect(adjustForLunch(state, timeToMinutes("13:30"), 30)).toBe(timeToMinutes("13:30"));
  });
});

describe("interruptLunchForStat", () => {
  it("marque la pause comme interrompue", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // STAT arrive à 12:15 (15min de pause déjà prises), durée 30min
    interruptLunchForStat(state, timeToMinutes("12:15"), 30);
    expect(state.interrupted).toBe(true);
  });

  it("calcule le temps restant correctement", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // STAT à 12:15 : 15min de pause déjà prises → 45min restantes
    interruptLunchForStat(state, timeToMinutes("12:15"), 30);
    expect(state.remainingMinutes).toBe(45);
  });

  it("programme la reprise après la fin du STAT", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // STAT démarre à 12:15, dure 30min → fin à 12:45 → reprise à 12:45
    interruptLunchForStat(state, timeToMinutes("12:15"), 30);
    expect(state.resumeAfter).toBe(timeToMinutes("12:45"));
  });

  it("si pause non commencée, remainingMinutes reste 60", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    // STAT à 12:00 : pause vient de commencer, 0min prises
    interruptLunchForStat(state, timeToMinutes("12:00"), 20);
    expect(state.remainingMinutes).toBe(60);
  });
});

describe("consumeLunch", () => {
  it("décrémente remainingMinutes correctement", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    consumeLunch(state, timeToMinutes("12:00"), timeToMinutes("12:20"));
    expect(state.takenMinutes).toBe(20);
    expect(state.remainingMinutes).toBe(40);
  });

  it("ne descend pas en dessous de 0", () => {
    const states = initLunchStates([tech]);
    const state  = states.get("T001")!;
    consumeLunch(state, timeToMinutes("12:00"), timeToMinutes("13:30")); // 90min > 60min
    expect(state.remainingMinutes).toBe(0);
  });
});