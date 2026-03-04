import { isEquipmentAvailableForWindow, getAvailableAfterMaintenance } from "../src/core/maintenance";
import { Equipment } from "../src/types";
import { timeToMinutes } from "../src/core/utils";

const equip: Equipment = {
  id: "EQ001", name: "Analyseur", type: "BLOOD",
  compatibleTypes: [], capacity: 2,
  maintenanceWindow: { start: "06:00", end: "07:00" },
  cleaningTime: 10,
};

describe("isEquipmentAvailableForWindow", () => {
  // ── Cas interdits ──
  it("❌ démarre pendant la maintenance", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("06:30"), timeToMinutes("07:15"))).toBe(false);
  });

  it("❌ se termine pendant la maintenance", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("05:45"), timeToMinutes("06:15"))).toBe(false);
  });

  it("❌ englobe complètement la maintenance", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("05:30"), timeToMinutes("07:30"))).toBe(false);
  });

  it("❌ chevauchement d'une seule minute", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("06:59"), timeToMinutes("07:30"))).toBe(false);
  });

  // ── Cas autorisés ──
  it("✅ termine exactement quand la maintenance commence", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("05:00"), timeToMinutes("06:00"))).toBe(true);
  });

  it("✅ commence exactement quand la maintenance termine", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("07:00"), timeToMinutes("08:00"))).toBe(true);
  });

  it("✅ complètement avant la maintenance", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("04:00"), timeToMinutes("05:30"))).toBe(true);
  });

  it("✅ complètement après la maintenance", () => {
    expect(isEquipmentAvailableForWindow(equip, timeToMinutes("08:00"), timeToMinutes("09:00"))).toBe(true);
  });
});

describe("getAvailableAfterMaintenance", () => {
  it("si demandé avant maintenance → inchangé", () => {
    expect(getAvailableAfterMaintenance(equip, timeToMinutes("05:00"))).toBe(timeToMinutes("05:00"));
  });

  it("si demandé pendant maintenance → décalé après maintEnd", () => {
    expect(getAvailableAfterMaintenance(equip, timeToMinutes("06:30"))).toBe(timeToMinutes("07:00"));
  });

  it("si demandé exactement à maintEnd → inchangé", () => {
    expect(getAvailableAfterMaintenance(equip, timeToMinutes("07:00"))).toBe(timeToMinutes("07:00"));
  });

  it("si demandé après maintenance → inchangé", () => {
    expect(getAvailableAfterMaintenance(equip, timeToMinutes("08:00"))).toBe(timeToMinutes("08:00"));
  });
});