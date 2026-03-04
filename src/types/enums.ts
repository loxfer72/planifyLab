// Types biologiques (conservés de la v1)
export type SampleType = "BLOOD" | "URINE" | "TISSUE";

// Nouveau : types d'analyse médicale
export type AnalysisType =
  | "BLOOD"        // Hématologie (Numération, Hémogramme, Frottis, Coagulation)
  | "CHEMISTRY"    // Biochimie (Bilan hépatique, Lipides, Électrolytes, Troponine, HbA1c)
  | "MICROBIOLOGY" // Microbiologie (ECBU, Hémoculture, Parasitologie, Prélèvement gorge)
  | "IMMUNOLOGY"   // Immunologie (Sérologie, Allergènes, Vaccination)
  | "GENETICS";    // Génétique (Caryotype, Conseil génétique, Pharmacogénétique)

// Ancien type conservé pour rétrocompatibilité
export type SpecialityType = "BLOOD" | "URINE" | "TISSUE" | "GENERAL";

export type Priority = "STAT" | "URGENT" | "ROUTINE";