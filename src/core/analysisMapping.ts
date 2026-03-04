import { AnalysisType } from "../types";

/**
 * Table de mapping : nom d'analyse libre → AnalysisType enum
 * Permet d'accepter des strings libres dans data.json
 */
const ANALYSIS_TYPE_MAP: Record<string, AnalysisType> = {
  // BLOOD — Hématologie
  "numération complète":    "BLOOD",
  "hémogramme standard":    "BLOOD",
  "hémogramme":             "BLOOD",
  "numération":             "BLOOD",
  "coagulation":            "BLOOD",
  "frottis sanguin":        "BLOOD",
  "frottis":                "BLOOD",

  // CHEMISTRY — Biochimie
  "bilan lipidique":        "CHEMISTRY",
  "bilan hépatique":        "CHEMISTRY",
  "électrolytes":           "CHEMISTRY",
  "troponine":              "CHEMISTRY",
  "hba1c":                  "CHEMISTRY",
  "électrolytes sanguins":  "CHEMISTRY",

  // MICROBIOLOGY — Microbiologie
  "ecbu":                   "MICROBIOLOGY",
  "hémoculture urgente":    "MICROBIOLOGY",
  "hémoculture":            "MICROBIOLOGY",
  "parasitologie":          "MICROBIOLOGY",
  "prélèvement gorge":      "MICROBIOLOGY",

  // IMMUNOLOGY — Immunologie
  "sérologie hiv":          "IMMUNOLOGY",
  "sérologie":              "IMMUNOLOGY",
  "allergènes critiques":   "IMMUNOLOGY",
  "allergènes":             "IMMUNOLOGY",
  "vaccination contrôle":   "IMMUNOLOGY",
  "vaccination":            "IMMUNOLOGY",
  "titre anticorps":        "IMMUNOLOGY",

  // GENETICS — Génétique
  "caryotype urgent":       "GENETICS",
  "caryotype":              "GENETICS",
  "conseil génétique":      "GENETICS",
  "pharmacogénétique":      "GENETICS",
};

/**
 * Résout un analysisType depuis une string libre ou un enum déjà valide.
 * - Si c'est déjà un AnalysisType valide → retourné tel quel
 * - Sinon → lookup dans la table (insensible à la casse)
 * - Si introuvable → undefined (conflit détecté par le scheduler)
 */
export function resolveAnalysisType(raw: string): AnalysisType | undefined {
  const VALID_TYPES: AnalysisType[] = [
    "BLOOD", "CHEMISTRY", "MICROBIOLOGY", "IMMUNOLOGY", "GENETICS",
  ];

  // Déjà un enum valide
  if (VALID_TYPES.includes(raw as AnalysisType)) {
    return raw as AnalysisType;
  }

  // Lookup insensible à la casse + trim
  const normalized = raw.toLowerCase().trim();
  return ANALYSIS_TYPE_MAP[normalized];
}