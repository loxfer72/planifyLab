import * as fs from "fs";
import * as path from "path";
import { schedule } from "./core/scheduler";
import { SchedulerInput, SchedulerOutput } from "./types";

// ── Chemins ──────────────────────────────────────────────────────────────────
const INPUT_PATH  = path.resolve(__dirname, "../data.json");
const OUTPUT_PATH = path.resolve(__dirname, "../output.json");

// ── Lecture ───────────────────────────────────────────────────────────────────
function readInput(filePath: string): SchedulerInput {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  try {
    return JSON.parse(raw) as SchedulerInput;
  } catch {
    throw new Error(`data.json invalide : vérifiez le format JSON`);
  }
}

// ── Écriture ──────────────────────────────────────────────────────────────────
function writeOutput(filePath: string, data: SchedulerOutput): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const input = readInput(INPUT_PATH);
  const output = schedule(input);

  writeOutput(OUTPUT_PATH, output);
}

main();