import { schedule } from "../src/core/scheduler";
import { SchedulerInput } from "../src/types";

// Fixture de base réutilisée dans plusieurs tests
const baseTech = { id: "T1", name: "Alice", speciality: "BLOOD" as const, startTime: "08:00", endTime: "17:00" };
const baseEquip = { id: "EQ1", name: "Analyseur", type: "BLOOD" as const, available: true };

describe("Tri par priorité", () => {
  const input: SchedulerInput = {
    samples: [
      { id: "S1", type: "BLOOD", priority: "ROUTINE",  analysisTime: 30, arrivalTime: "08:00", patientId: "P1" },
      { id: "S2", type: "BLOOD", priority: "STAT",     analysisTime: 20, arrivalTime: "08:00", patientId: "P2" },
      { id: "S3", type: "BLOOD", priority: "URGENT",   analysisTime: 25, arrivalTime: "08:00", patientId: "P3" },
    ],
    technicians: [baseTech],
    equipment: [baseEquip],
  };

  it("STAT est planifié en premier", () => {
    const { schedule: s } = schedule(input);
    expect(s[0].sampleId).toBe("S2");   // STAT
    expect(s[0].priority).toBe("STAT");
  });

  it("ROUTINE est planifié en dernier", () => {
    const { schedule: s } = schedule(input);
    expect(s[2].sampleId).toBe("S1");   // ROUTINE
  });
});

describe("Pas de double booking", () => {
  const input: SchedulerInput = {
    samples: [
      { id: "S1", type: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00", patientId: "P1" },
      { id: "S2", type: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00", patientId: "P2" },
    ],
    technicians: [baseTech],
    equipment: [baseEquip],
  };

  it("S2 commence quand S1 se termine", () => {
    const { schedule: s } = schedule(input);
    expect(s[1].startTime).toBe(s[0].endTime);
  });
});

describe("Compatibilité", () => {
  it("détecte un conflit si aucune ressource compatible", () => {
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "TISSUE", priority: "URGENT", analysisTime: 45, arrivalTime: "09:00", patientId: "P1" },
      ],
      technicians: [baseTech],   // BLOOD uniquement
      equipment: [baseEquip],    // BLOOD uniquement
    };

    const { metrics } = schedule(input);
    expect(metrics.conflicts).toBe(1);
  });

  it("technicien GENERAL résout l'incompatibilité de spécialité", () => {
    const generalTech = { ...baseTech, id: "T2", speciality: "GENERAL" as const };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", priority: "URGENT", analysisTime: 45, arrivalTime: "09:00", patientId: "P1" },
      ],
      technicians: [generalTech],
      equipment: [baseEquip],
    };

    const { schedule: s, metrics } = schedule(input);
    expect(s).toHaveLength(1);
    expect(metrics.conflicts).toBe(0);
  });
});

describe("Métriques", () => {
  it("efficiency est 100% si 1 seul sample et 1 seule ressource", () => {
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "08:00", patientId: "P1" },
      ],
      technicians: [baseTech],
      equipment: [baseEquip],
    };

    const { metrics } = schedule(input);
    expect(metrics.efficiency).toBe(100);
    expect(metrics.totalTime).toBe(60);
  });
});