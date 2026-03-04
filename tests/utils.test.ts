import { timeToMinutes, minutesToTime, isCompatible } from "../src/core/utils";
import { Sample, Technician, Equipment } from "../src/types";

// ---- Fixtures réutilisables ----
const bloodSample: Sample = {
  id: "S001", type: "BLOOD", priority: "URGENT",
  analysisTime: 45, arrivalTime: "09:00", patientId: "P001",
};

const bloodTech: Technician = {
  id: "T001", name: "Alice", speciality: "BLOOD",
  startTime: "08:00", endTime: "17:00",
};

const generalTech: Technician = {
  id: "T002", name: "Bob", speciality: "GENERAL",
  startTime: "08:00", endTime: "17:00",
};

const urineTech: Technician = {
  id: "T003", name: "Carol", speciality: "URINE",
  startTime: "08:00", endTime: "17:00",
};

const bloodEquip: Equipment = {
  id: "EQ001", name: "Analyseur Sang", type: "BLOOD", available: true,
};

const urineEquip: Equipment = {
  id: "EQ002", name: "Analyseur Urine", type: "URINE", available: true,
};

// ---- Tests ----
describe("timeToMinutes", () => {
  it("convertit 09:00 en 540", () => expect(timeToMinutes("09:00")).toBe(540));
  it("convertit 09:30 en 570", () => expect(timeToMinutes("09:30")).toBe(570));
  it("convertit 00:00 en 0",   () => expect(timeToMinutes("00:00")).toBe(0));
  it("convertit 17:45 en 1065",() => expect(timeToMinutes("17:45")).toBe(1065));
});

describe("minutesToTime", () => {
  it("convertit 540 en 09:00", () => expect(minutesToTime(540)).toBe("09:00"));
  it("convertit 570 en 09:30", () => expect(minutesToTime(570)).toBe("09:30"));
  it("padde les heures < 10",  () => expect(minutesToTime(30)).toBe("00:30"));
});

describe("isCompatible", () => {
  it("technicien BLOOD + équipement BLOOD + sample BLOOD → true", () => {
    expect(isCompatible(bloodSample, bloodTech, bloodEquip)).toBe(true);
  });

  it("technicien URINE + sample BLOOD → false", () => {
    expect(isCompatible(bloodSample, urineTech, bloodEquip)).toBe(false);
  });

  it("équipement URINE + sample BLOOD → false", () => {
    expect(isCompatible(bloodSample, bloodTech, urineEquip)).toBe(false);
  });

  it("technicien GENERAL peut faire n'importe quel type", () => {
    expect(isCompatible(bloodSample, generalTech, bloodEquip)).toBe(true);
  });
});