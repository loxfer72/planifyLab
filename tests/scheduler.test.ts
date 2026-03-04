import { schedule } from "../src/core/scheduler";
import { AnalysisType, SchedulerInput, Technician } from "../src/types";

// ─── Fixtures de base ─────────────────────────────────────────────────────────

const baseTech: Technician = {
  id: "T001", name: "Alice", specialty: ["BLOOD"] as AnalysisType[],
  efficiency: 1.0, startTime: "08:00", endTime: "17:00",
  lunchBreak: { start: "12:00", end: "13:00" },
};

const baseEquip = {
  id: "EQ001", name: "Analyseur", type: "BLOOD" as const,
  compatibleTypes: ["Hémogramme"], capacity: 2,
  maintenanceWindow: { start: "06:00", end: "07:00" }, cleaningTime: 10,
};

// ─── Priorités ────────────────────────────────────────────────────────────────

describe("Tri par priorité + heure d'arrivée", () => {
  const input: SchedulerInput = {
    samples: [
      { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "ROUTINE",  analysisTime: 20, arrivalTime: "08:00" },
      { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "STAT",     analysisTime: 20, arrivalTime: "08:10" },
      { id: "S3", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT",   analysisTime: 20, arrivalTime: "08:05" },
    ],
    technicians: [baseTech],
    equipment: [baseEquip],
  };

  it("STAT est planifié en premier", () => {
    const { schedule: s } = schedule(input);
    expect(s[0].sampleId).toBe("S2");
    expect(s[0].priority).toBe("STAT");
  });

  it("ROUTINE est planifié en dernier", () => {
    const { schedule: s } = schedule(input);
    expect(s[2].sampleId).toBe("S1");
  });

  it("à priorité égale, heure d'arrivée détermine l'ordre", () => {
    const input2: SchedulerInput = {
      samples: [
        { id: "SA", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 20, arrivalTime: "09:30" },
        { id: "SB", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 20, arrivalTime: "08:00" },
      ],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input2);
    expect(s[0].sampleId).toBe("SB"); // arrivé en premier
  });
});

// ─── Coefficient d'efficacité ─────────────────────────────────────────────────

describe("Coefficient d'efficacité technicien", () => {
  it("expert 1.2 raccourcit la durée : 60min → 50min", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" }],
      technicians: [{ ...baseTech, efficiency: 1.2 }],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    expect(s[0].adjustedDuration).toBe(50);
    expect(s[0].endTime).toBe("09:50");
  });

  it("junior 0.8 allonge la durée : 60min → 75min", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" }],
      technicians: [{ ...baseTech, efficiency: 0.8 }],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    expect(s[0].adjustedDuration).toBe(75);
    expect(s[0].endTime).toBe("10:15");
  });
});

// ─── Maintenance ──────────────────────────────────────────────────────────────

describe("Fenêtres de maintenance", () => {
  it("analyse décalée si elle chevauche la maintenance", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "06:30" }],
      technicians: [{ ...baseTech, startTime: "06:00" }],
      // Maintenance 06:00-07:00 → analyse doit démarrer à 07:00 minimum
      equipment: [{ ...baseEquip, maintenanceWindow: { start: "06:00", end: "07:00" } }],
    };
    const { schedule: s } = schedule(input);
    expect(s[0].startTime >= "07:00").toBe(true);
  });

  it("analyse démarrant exactement à la fin de maintenance → autorisée", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "07:00" }],
      technicians: [{ ...baseTech, startTime: "07:00" }],
      equipment: [{ ...baseEquip, maintenanceWindow: { start: "06:00", end: "07:00" } }],
    };
    const { schedule: s } = schedule(input);
    expect(s[0].startTime).toBe("07:00");
  });
});

// ─── Nettoyage entre analyses ─────────────────────────────────────────────────

describe("Temps de nettoyage entre analyses", () => {
  it("2ème analyse attend nettoyage après la 1ère", () => {
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
        { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
      ],
      // Un seul technicien → séquentiel
      technicians: [baseTech],
      // Capacité 1 pour forcer la séquence
      equipment: [{ ...baseEquip, capacity: 1, cleaningTime: 15 }],
    };
    const { schedule: s } = schedule(input);
    // S1 : 09:00 → 09:30, nettoyage 15min → S2 ne peut pas démarrer avant 09:45
    const s2Start = s.find((e) => e.sampleId === "S2")!.startTime;
    expect(s2Start >= "09:45").toBe(true);
  });
});

// ─── Capacité équipement ──────────────────────────────────────────────────────

describe("Capacité équipement", () => {
  it("analyses en parallèle dans la limite de capacité", () => {
    const tech2 = { ...baseTech, id: "T002", name: "Bob" };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" },
        { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" },
      ],
      technicians: [baseTech, tech2],
      equipment: [{ ...baseEquip, capacity: 2 }], // capacité 2
    };
    const { schedule: s } = schedule(input);
    // Les deux peuvent tourner en parallèle → même startTime
    expect(s[0].startTime).toBe(s[1].startTime);
  });

  it("3ème analyse attend si capacité=2 déjà pleine", () => {
    const tech2 = { ...baseTech, id: "T002" };
    const tech3 = { ...baseTech, id: "T003" };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" },
        { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 60, arrivalTime: "09:00" },
        { id: "S3", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
      ],
      technicians: [baseTech, tech2, tech3],
      equipment: [{ ...baseEquip, capacity: 2, cleaningTime: 0 }],
    };
    const { schedule: s } = schedule(input);
    const s3 = s.find((e) => e.sampleId === "S3")!;
    // S3 doit attendre que la capacité se libère
    expect(s3.startTime > "09:00").toBe(true);
  });
});

// ─── Pause déjeuner ───────────────────────────────────────────────────────────

describe("Pause déjeuner", () => {
  it("analyse URGENT ne démarre pas pendant la pause", () => {
    const input: SchedulerInput = {
      samples: [{
        id: "S1", type: "BLOOD", analysisType: "BLOOD",
        priority: "URGENT", analysisTime: 30, arrivalTime: "11:50",
      }],
      technicians: [baseTech], // pause 12:00-13:00
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    // Analyse de 30min démarrant à 11:50 finirait à 12:20 → doit être décalée
    expect(s[0].startTime >= "13:00").toBe(true);
  });

  it("analyse ROUTINE décalée après la pause", () => {
    const input: SchedulerInput = {
      samples: [{
        id: "S1", type: "BLOOD", analysisType: "BLOOD",
        priority: "ROUTINE", analysisTime: 45, arrivalTime: "12:15",
      }],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    expect(s[0].startTime >= "13:00").toBe(true);
  });

  it("analyse STAT peut démarrer pendant la pause et l'interrompt", () => {
    const input: SchedulerInput = {
      samples: [{
        id: "S1", type: "BLOOD", analysisType: "BLOOD",
        priority: "STAT", analysisTime: 20, arrivalTime: "12:15",
      }],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    // STAT doit démarrer à 12:15 sans attendre la fin de la pause
    expect(s[0].startTime).toBe("12:15");
    expect(s[0].wasStatInterrupt).toBe(true);
  });

  it("l'interruption STAT est comptabilisée dans lunchInterruptions", () => {
    const input: SchedulerInput = {
      samples: [{
        id: "S1", type: "BLOOD", analysisType: "BLOOD",
        priority: "STAT", analysisTime: 20, arrivalTime: "12:15",
      }],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(metrics.lunchInterruptions).toBe(1);
  });
});

// ─── Compatibilité analysisType ───────────────────────────────────────────────

describe("Compatibilité analysisType", () => {
  it("conflit si aucun technicien qualifié pour le type d'analyse", () => {
    const input: SchedulerInput = {
      samples: [{
        id: "S1", type: "BLOOD", analysisType: "GENETICS",
        priority: "URGENT", analysisTime: 60, arrivalTime: "09:00",
      }],
      technicians: [baseTech], // spécialité BLOOD uniquement
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(metrics.conflicts).toBe(1);
  });

  it("technicien polyvalent peut couvrir plusieurs analysisTypes", () => {
    const polyTech: Technician = {
      ...baseTech,
      specialty: ["BLOOD", "CHEMISTRY", "IMMUNOLOGY"] as AnalysisType[],
    };
    const chemEquip = {
      ...baseEquip, id: "EQ002", type: "CHEMISTRY" as const,
      maintenanceWindow: { start: "06:30", end: "07:30" },
    };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD",     priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
        { id: "S2", type: "BLOOD", analysisType: "CHEMISTRY",  priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
      ],
      technicians: [polyTech],
      equipment: [baseEquip, chemEquip],
    };
    const { schedule: s, metrics } = schedule(input);
    expect(s).toHaveLength(2);
    expect(metrics.conflicts).toBe(0);
  });
});

// ─── Métriques ────────────────────────────────────────────────────────────────

describe("Métriques", () => {
  it("efficiency calculée selon la formule officielle", () => {
    // Planning 09:00-10:00 (60min), 2 techs : T1 occupé 45min, T2 occupé 30min
    // efficiency = ((45+30) / 2) / 60 * 100 = 62.5%
    const tech2 = { ...baseTech, id: "T002" };
    const equip2 = { ...baseEquip, id: "EQ002" };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 45, arrivalTime: "09:00" },
        { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" },
      ],
      technicians: [baseTech, tech2],
      equipment: [baseEquip, equip2],
    };
    const { metrics } = schedule(input);
    expect(metrics.efficiency).toBe(62.5);
  });

  it("conflicts = 0 quand tout est planifié", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" }],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(metrics.conflicts).toBe(0);
  });

  it("technicianUtilization contient une entrée par technicien", () => {
    const tech2 = { ...baseTech, id: "T002" };
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" }],
      technicians: [baseTech, tech2],
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(Object.keys(metrics.technicianUtilization)).toHaveLength(2);
  });

  it("averageWaitingTime.STAT est faible (< 30min)", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "STAT", analysisTime: 20, arrivalTime: "09:00" }],
      technicians: [baseTech],
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(metrics.averageWaitingTime.STAT).toBeLessThan(30);
  });

  it("planning vide → toutes les métriques à 0", () => {
    const input: SchedulerInput = {
      samples: [{ id: "S1", type: "BLOOD", analysisType: "GENETICS", priority: "URGENT", analysisTime: 30, arrivalTime: "09:00" }],
      technicians: [baseTech], // incompatible
      equipment: [baseEquip],
    };
    const { metrics } = schedule(input);
    expect(metrics.totalTime).toBe(0);
    expect(metrics.efficiency).toBe(0);
  });
});

// ─── Ordre chronologique ──────────────────────────────────────────────────────

describe("Ordre chronologique du planning", () => {
  it("le planning est toujours trié par startTime croissant", () => {
    const tech2 = { ...baseTech, id: "T002" };
    const input: SchedulerInput = {
      samples: [
        { id: "S1", type: "BLOOD", analysisType: "BLOOD", priority: "ROUTINE", analysisTime: 20, arrivalTime: "10:00" },
        { id: "S2", type: "BLOOD", analysisType: "BLOOD", priority: "STAT",    analysisTime: 20, arrivalTime: "09:00" },
        { id: "S3", type: "BLOOD", analysisType: "BLOOD", priority: "URGENT",  analysisTime: 20, arrivalTime: "08:00" },
      ],
      technicians: [baseTech, tech2],
      equipment: [baseEquip],
    };
    const { schedule: s } = schedule(input);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].startTime >= s[i - 1].startTime).toBe(true);
    }
  });
});
