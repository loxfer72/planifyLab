import { timeToMinutes, minutesToTime, adjustedDuration, isCompatibleV2, getEquipmentUsageAt } from "../src/core/utils";
import { Sample, Technician, Equipment } from "../src/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const bloodSample: Sample = {
  id: "S001", type: "BLOOD", analysisType: "BLOOD",
  priority: "URGENT", analysisTime: 45, arrivalTime: "09:00",
};

const chemistrySample: Sample = {
  id: "S002", type: "BLOOD", analysisType: "CHEMISTRY",
  priority: "STAT", analysisTime: 30, arrivalTime: "08:00",
};

const techBlood: Technician = {
  id: "T001", name: "Alice", specialty: ["BLOOD", "CHEMISTRY"],
  efficiency: 1.2, startTime: "08:00", endTime: "17:00",
  lunchBreak: { start: "12:00", end: "13:00" },
};

const techMicro: Technician = {
  id: "T002", name: "Bob", specialty: ["MICROBIOLOGY"],
  efficiency: 1.0, startTime: "08:00", endTime: "17:00",
  lunchBreak: { start: "12:30", end: "13:30" },
};

const equipBlood: Equipment = {
  id: "EQ001", name: "Analyseur Hématologie", type: "BLOOD",
  compatibleTypes: ["Hémogramme"], capacity: 2,
  maintenanceWindow: { start: "06:00", end: "07:00" }, cleaningTime: 10,
};

const equipChemistry: Equipment = {
  id: "EQ002", name: "Automate Biochimie", type: "CHEMISTRY",
  compatibleTypes: ["Bilan hépatique"], capacity: 3,
  maintenanceWindow: { start: "06:30", end: "07:30" }, cleaningTime: 15,
};

// ─── timeToMinutes ────────────────────────────────────────────────────────────

describe("timeToMinutes", () => {
  it("convertit 00:00 en 0",    () => expect(timeToMinutes("00:00")).toBe(0));
  it("convertit 08:00 en 480",  () => expect(timeToMinutes("08:00")).toBe(480));
  it("convertit 09:30 en 570",  () => expect(timeToMinutes("09:30")).toBe(570));
  it("convertit 12:00 en 720",  () => expect(timeToMinutes("12:00")).toBe(720));
  it("convertit 17:45 en 1065", () => expect(timeToMinutes("17:45")).toBe(1065));
});

// ─── minutesToTime ────────────────────────────────────────────────────────────

describe("minutesToTime", () => {
  it("convertit 0 en 00:00",    () => expect(minutesToTime(0)).toBe("00:00"));
  it("convertit 480 en 08:00",  () => expect(minutesToTime(480)).toBe("08:00"));
  it("convertit 570 en 09:30",  () => expect(minutesToTime(570)).toBe("09:30"));
  it("convertit 1065 en 17:45", () => expect(minutesToTime(1065)).toBe("17:45"));
  it("padde les heures < 10",   () => expect(minutesToTime(30)).toBe("00:30"));
  it("padde les minutes < 10",  () => expect(minutesToTime(481)).toBe("08:01"));
});

// ─── adjustedDuration ────────────────────────────────────────────────────────

describe("adjustedDuration", () => {
  it("expert 1.2 : 60min → 50min",  () => expect(adjustedDuration(60, 1.2)).toBe(50));
  it("junior 0.9 : 30min → 33min",  () => expect(adjustedDuration(30, 0.9)).toBe(33));
  it("standard 1.0 : inchangé",     () => expect(adjustedDuration(45, 1.0)).toBe(45));
  it("arrondi supérieur 1.1 : 45min → 41min", () => expect(adjustedDuration(45, 1.1)).toBe(41));
  it("arrondi inférieur 0.8 : 45min → 56min", () => expect(adjustedDuration(45, 0.8)).toBe(56));
  it("cas limite 1.5 : 47min → 31min",        () => expect(adjustedDuration(47, 1.5)).toBe(31));
});

// ─── isCompatibleV2 ──────────────────────────────────────────────────────────

describe("isCompatibleV2", () => {
  it("technicien BLOOD + équipement BLOOD + sample BLOOD → true", () => {
    expect(isCompatibleV2(bloodSample, techBlood, equipBlood)).toBe(true);
  });

  it("technicien BLOOD + équipement CHEMISTRY + sample CHEMISTRY → true", () => {
    expect(isCompatibleV2(chemistrySample, techBlood, equipChemistry)).toBe(true);
  });

  it("technicien MICROBIOLOGY ne peut pas faire BLOOD → false", () => {
    expect(isCompatibleV2(bloodSample, techMicro, equipBlood)).toBe(false);
  });

  it("équipement CHEMISTRY ne peut pas faire BLOOD → false", () => {
    expect(isCompatibleV2(bloodSample, techBlood, equipChemistry)).toBe(false);
  });

  it("technicien sans la spécialité → false même si équipement ok", () => {
    expect(isCompatibleV2(bloodSample, techMicro, equipBlood)).toBe(false);
  });
});

// ─── getEquipmentUsageAt ──────────────────────────────────────────────────────

describe("getEquipmentUsageAt", () => {
  const fakeSchedule = [
    { equipmentId: "EQ001", startTime: "09:00", endTime: "10:00" },
    { equipmentId: "EQ001", startTime: "09:30", endTime: "10:30" },
    { equipmentId: "EQ002", startTime: "09:00", endTime: "09:45" },
  ];

  it("retourne 0 si aucune analyse active", () => {
    expect(getEquipmentUsageAt("EQ001", timeToMinutes("08:00"), fakeSchedule)).toBe(0);
  });

  it("retourne 1 si une seule analyse active", () => {
    expect(getEquipmentUsageAt("EQ001", timeToMinutes("09:15"), fakeSchedule)).toBe(1);
  });

  it("retourne 2 si deux analyses actives en parallèle", () => {
    expect(getEquipmentUsageAt("EQ001", timeToMinutes("09:45"), fakeSchedule)).toBe(2);
  });

  it("ignore les analyses d'autres équipements", () => {
    expect(getEquipmentUsageAt("EQ002", timeToMinutes("09:15"), fakeSchedule)).toBe(1);
  });

  it("n'inclut pas les analyses terminées exactement à t", () => {
    // endTime exclusive : à 10:00, l'analyse 09:00-10:00 est terminée
    expect(getEquipmentUsageAt("EQ001", timeToMinutes("10:00"), fakeSchedule)).toBe(1);
  });
});