# 🧪 planifyLab

Algorithme TypeScript de planification automatique d'analyses de laboratoire. Il attribue pour chaque échantillon un technicien et un équipement compatibles sur le créneau le plus tôt possible, en respectant les priorités médicales et les contraintes de disponibilité des ressources.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [API](#api)
  - [Input](#input)
  - [Output](#output)
- [Règles métier](#règles-métier)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)

---

## Fonctionnalités

- Tri automatique des échantillons par priorité médicale (`STAT > URGENT > ROUTINE`)
- Vérification de compatibilité technicien / équipement / échantillon
- Gestion du double booking (aucune ressource affectée à deux analyses simultanées)
- Analyses parallèles quand plusieurs ressources compatibles sont disponibles
- Calcul de métriques : durée totale, efficacité, conflits
- Lecture depuis `data.json`, écriture vers `output.json`

---

## Structure du projet

```
lab-scheduler/
├── src/
│   ├── types/
│   │   ├── enums.ts          # SampleType, Priority, SpecialityType
│   │   ├── entities.ts       # Sample, Technician, Equipment
│   │   ├── scheduler.ts      # ScheduleEntry, Metrics, Input/Output
│   │   └── index.ts          # Barrel re-export
│   ├── core/
│   │   ├── utils.ts          # timeToMinutes, minutesToTime, isCompatible
│   │   └── scheduler.ts      # Algorithme principal
│   └── index.ts              # Point d'entrée (lecture data.json → output.json)
├── tests/
│   ├── utils.test.ts         # Tests des fonctions utilitaires
│   ├── scheduler.test.ts     # Tests de l'algorithme (priorité, booking, compatibilité)
│   └── exempleDoc.test.ts    # Tests basés sur les exemples du cahier des charges
├── .gitignore                # fichier d'exclusion
├── README.md                 # le fichier d'information
├── data.json                 # Données d'entrée
├── output.json               # Planning généré (produit par npm start)
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Installation

**Prérequis :** Node.js ≥ 18, npm ≥ 9

```bash
git clone https://github.com/loxfer72/planifyLab.git
cd lab-scheduler
npm install
```

---

## Utilisation

### 1 — Préparer les données d'entrée

Éditer `data.json` à la racine du projet :

```json
{
  "samples": [...],
  "technicians": [...],
  "equipment": [...]
}
```

### 2 — Lancer le scheduler

```bash
npm start
```

Cela compile le TypeScript puis exécute `dist/index.js`. Le planning est écrit dans `output.json`

---

## API

### Input

```typescript
interface SchedulerInput {
  samples: Sample[];
  technicians: Technician[];
  equipment: Equipment[];
}
```

#### Sample

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique |
| `type` | `"BLOOD" \| "URINE" \| "TISSUE"` | Type d'analyse |
| `priority` | `"STAT" \| "URGENT" \| "ROUTINE"` | Niveau de priorité |
| `analysisTime` | `number` | Durée de l'analyse en minutes |
| `arrivalTime` | `string` | Heure d'arrivée au format `"HH:MM"` |
| `patientId` | `string` | Identifiant patient |

```json
{
  "id": "S001",
  "type": "BLOOD",
  "priority": "URGENT",
  "analysisTime": 30,
  "arrivalTime": "09:00",
  "patientId": "P001"
}
```

#### Technician

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique |
| `name` | `string` | Nom complet |
| `speciality` | `"BLOOD" \| "URINE" \| "TISSUE" \| "GENERAL"` | Spécialité |
| `startTime` | `string` | Début de service `"HH:MM"` |
| `endTime` | `string` | Fin de service `"HH:MM"` |

```json
{
  "id": "T001",
  "name": "Alice Martin",
  "speciality": "BLOOD",
  "startTime": "08:00",
  "endTime": "17:00"
}
```

#### Equipment

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique |
| `name` | `string` | Nom de l'équipement |
| `type` | `"BLOOD" \| "URINE" \| "TISSUE"` | Type d'analyse supporté |
| `available` | `boolean` | Disponible au démarrage |

```json
{
  "id": "E001",
  "name": "Analyseur Sang A",
  "type": "BLOOD",
  "available": true
}
```

---

### Output

```typescript
interface SchedulerOutput {
  schedule: ScheduleEntry[];
  metrics: Metrics;
}
```

#### ScheduleEntry

| Champ | Type | Description |
|---|---|---|
| `sampleId` | `string` | Référence à l'échantillon |
| `technicianId` | `string` | Technicien assigné |
| `equipmentId` | `string` | Équipement assigné |
| `startTime` | `string` | Heure de début `"HH:MM"` |
| `endTime` | `string` | Heure de fin `"HH:MM"` |
| `priority` | `Priority` | Priorité de l'analyse |

#### Metrics

| Champ | Type | Description |
|---|---|---|
| `totalTime` | `number` | Durée totale du planning en minutes |
| `efficiency` | `number` | `(somme analysisTime / totalTime) × 100` |
| `conflicts` | `number` | Nombre d'échantillons non planifiés |

> **Note :** `efficiency` peut dépasser 100% lorsque des analyses sont menées en parallèle, ce qui est le comportement attendu et souhaité.

---

## Règles métier

### Priorité

Les échantillons sont toujours traités dans cet ordre, sans exception :

| Priorité | Niveau | Objectif |
|---|---|---|
| `STAT` | Urgence vitale | Résultat en moins d'1 heure |
| `URGENT` | Important | Résultat dans la journée |
| `ROUTINE` | Standard | Peut attendre |

### Compatibilité technicien / échantillon

| Technicien | BLOOD | URINE | TISSUE |
|---|---|---|---|
| `BLOOD` | ✅ | ❌ | ❌ |
| `URINE` | ❌ | ✅ | ❌ |
| `TISSUE` | ❌ | ❌ | ✅ |
| `GENERAL` | ✅ | ✅ | ✅ |

### Compatibilité équipement / échantillon

Un équipement ne peut traiter que le type d'analyse pour lequel il est conçu (`equipment.type === sample.type`).

### Calcul du créneau

```
startTime = max(sample.arrivalTime, technician.startTime, techFreeAt, equipFreeAt)
endTime   = startTime + sample.analysisTime
```

---

## Tests

```bash
npm test                  # Lance tous les tests
npm test -- --watch       # Mode watch
npm test -- --coverage    # Rapport de couverture
```

### Organisation des tests

| Fichier | Contenu |
|---|---|
| `utils.test.ts` | `timeToMinutes`, `minutesToTime`, `isCompatible` |
| `scheduler.test.ts` | Priorité, double booking, compatibilité, métriques |
| `exempleDoc.test.ts` | 3 exemples complets du cahier des charges |

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Compile et génère `output.json` depuis `data.json` |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm test` | Lance Jest |
| `npx tsc --noEmit` | Vérifie les types sans compiler |