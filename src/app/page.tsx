"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, RotateCcw } from "lucide-react";

// --------------------
// Types
// --------------------

type Sex = "m" | "w";
type AgeGroup = "75-79" | "80-84" | "85-89" | "90+";

type RiskMeta = {
  id: string;
  label: string;
};

type RiskFactor = {
  id: RiskId;
  label: string;
  value: number; // absolute persons per 100 (within preventable share)
};

type Stratum = {
  prevalence: number; // dementia prevalence per 100
  weights: Record<RiskId, number>; // stratum-specific factor weights
};

type OverlaySegment = {
  start: number; // in Personen-Einheiten, 0..preventableCap
  end: number;
  colorClass: string;
  label: string;
};

type PersonRender = {
  baselinePortion: number; // 0..1 (Demenz)
  preventablePortion: number; // 0..1 (Modifizierbar gesamt)
  overlayParts: { x: number; w: number; colorClass: string; label: string }[];
};

// --------------------
// Constants
// --------------------

const PREVENTABLE_SHARE = 0.45;

// Farben (Hex)
const DEMENTIA_COLOR_CLASS = "text-[#F37458]";
const DEMENTIA_BG_CLASS = "bg-[#F37458]";

const PREVENTABLE_COLOR_CLASS = "text-[#09AD6F]";
const PREVENTABLE_BG_CLASS = "bg-[#09AD6F]";

const SELECTED_FACTOR_COLOR_CLASS = "text-[#5B72C8]"; // aktuelle Risikofaktoren
const SELECTED_FACTOR_BG_CLASS = "bg-[#5B72C8]";

const RISK_META = [
  { id: "rf-edu", label: "Geringe kognitive Aktivität" },
  { id: "rf-hearing", label: "Hörverlust" },
  { id: "rf-ldl", label: "Hohes LDL-C" },
  { id: "rf-depr", label: "Depression" },
  { id: "rf-tbi", label: "Traumatische Hirnverletzung" },
  { id: "rf-inactivity", label: "Körperliche Inaktivität" },
  { id: "rf-smoking", label: "Rauchen" },
  { id: "rf-diabetes", label: "Diabetes" },
  { id: "rf-htn", label: "Hypertonie" },
  { id: "rf-obesity", label: "Adipositas" },
  { id: "rf-alcohol", label: "Exzessiver Alkoholkonsum" },
  { id: "rf-isolation", label: "Soziale Isolation" },
  { id: "rf-air", label: "Luftverschmutzung" },
  { id: "rf-vision", label: "Unbehandelter Sehverlust" },
] as const satisfies readonly RiskMeta[];

type RiskId = (typeof RISK_META)[number]["id"];

const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "75-79", label: "75–79" },
  { id: "80-84", label: "80–84" },
  { id: "85-89", label: "85–89" },
  { id: "90+", label: "90+" },
];

const SEX_LABEL_PLURAL: Record<Sex, string> = { m: "Männer", w: "Frauen" };
const SEX_LABEL_SENTENCE: Record<Sex, string> = { m: "als Mann", w: "als Frau" };

// --------------------
// Data
// --------------------

const STRATA: Record<Sex, Record<AgeGroup, Stratum>> = {
  m: {
    "75-79": {
      prevalence: 7.0,
      weights: {
        "rf-edu": 0.3,
        "rf-hearing": 0.5,
        "rf-ldl": 0.5,
        "rf-depr": 0.2,
        "rf-tbi": 0.2,
        "rf-inactivity": 0.2,
        "rf-smoking": 0.2,
        "rf-diabetes": 0.2,
        "rf-htn": 0.2,
        "rf-obesity": 0.1,
        "rf-alcohol": 0.1,
        "rf-isolation": 0.3,
        "rf-air": 0.2,
        "rf-vision": 0.2,
      },
    },
    "80-84": {
      prevalence: 10.7,
      weights: {
        "rf-edu": 0.5,
        "rf-hearing": 0.7,
        "rf-ldl": 0.7,
        "rf-depr": 0.3,
        "rf-tbi": 0.3,
        "rf-inactivity": 0.3,
        "rf-smoking": 0.2,
        "rf-diabetes": 0.2,
        "rf-htn": 0.2,
        "rf-obesity": 0.1,
        "rf-alcohol": 0.1,
        "rf-isolation": 0.5,
        "rf-air": 0.3,
        "rf-vision": 0.2,
      },
    },
    "85-89": {
      prevalence: 16.3,
      weights: {
        "rf-edu": 0.7,
        "rf-hearing": 1.1,
        "rf-ldl": 1.1,
        "rf-depr": 0.5,
        "rf-tbi": 0.5,
        "rf-inactivity": 0.4,
        "rf-smoking": 0.4,
        "rf-diabetes": 0.4,
        "rf-htn": 0.4,
        "rf-obesity": 0.2,
        "rf-alcohol": 0.2,
        "rf-isolation": 0.7,
        "rf-air": 0.4,
        "rf-vision": 0.4,
      },
    },
    "90+": {
      prevalence: 29.7,
      weights: {
        "rf-edu": 1.3,
        "rf-hearing": 2.1,
        "rf-ldl": 2.0,
        "rf-depr": 0.9,
        "rf-tbi": 0.9,
        "rf-inactivity": 0.7,
        "rf-smoking": 0.7,
        "rf-diabetes": 0.7,
        "rf-htn": 0.6,
        "rf-obesity": 0.4,
        "rf-alcohol": 0.3,
        "rf-isolation": 1.4,
        "rf-air": 0.8,
        "rf-vision": 0.6,
      },
    },
  },
  w: {
    "75-79": {
      prevalence: 8.9,
      weights: {
        "rf-edu": 0.4,
        "rf-hearing": 0.6,
        "rf-ldl": 0.6,
        "rf-depr": 0.3,
        "rf-tbi": 0.3,
        "rf-inactivity": 0.2,
        "rf-smoking": 0.2,
        "rf-diabetes": 0.2,
        "rf-htn": 0.2,
        "rf-obesity": 0.1,
        "rf-alcohol": 0.1,
        "rf-isolation": 0.4,
        "rf-air": 0.2,
        "rf-vision": 0.2,
      },
    },
    "80-84": {
      prevalence: 13.1,
      weights: {
        "rf-edu": 0.6,
        "rf-hearing": 0.9,
        "rf-ldl": 0.9,
        "rf-depr": 0.4,
        "rf-tbi": 0.4,
        "rf-inactivity": 0.3,
        "rf-smoking": 0.3,
        "rf-diabetes": 0.3,
        "rf-htn": 0.3,
        "rf-obesity": 0.2,
        "rf-alcohol": 0.1,
        "rf-isolation": 0.6,
        "rf-air": 0.3,
        "rf-vision": 0.3,
      },
    },
    "85-89": {
      prevalence: 24.9,
      weights: {
        "rf-edu": 1.1,
        "rf-hearing": 1.7,
        "rf-ldl": 1.7,
        "rf-depr": 0.7,
        "rf-tbi": 0.7,
        "rf-inactivity": 0.6,
        "rf-smoking": 0.6,
        "rf-diabetes": 0.6,
        "rf-htn": 0.5,
        "rf-obesity": 0.3,
        "rf-alcohol": 0.2,
        "rf-isolation": 1.1,
        "rf-air": 0.6,
        "rf-vision": 0.5,
      },
    },
    "90+": {
      prevalence: 44.8,
      weights: {
        "rf-edu": 2.0,
        "rf-hearing": 3.1,
        "rf-ldl": 3.1,
        "rf-depr": 1.3,
        "rf-tbi": 1.3,
        "rf-inactivity": 1.1,
        "rf-smoking": 1.0,
        "rf-diabetes": 1.0,
        "rf-htn": 1.0,
        "rf-obesity": 0.6,
        "rf-alcohol": 0.4,
        "rf-isolation": 2.0,
        "rf-air": 1.2,
        "rf-vision": 1.0,
      },
    },
  },
};

// --------------------
// Helpers
// --------------------

const fmtDE = (n: number) => n.toLocaleString("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function sumWeights(w: Record<RiskId, number>) {
  return (Object.keys(w) as RiskId[]).reduce((acc, k) => acc + Math.max(0, w[k] ?? 0), 0);
}

function buildRiskFactorsForStratum(stratum: Stratum): { prevalence: number; preventableCap: number; factors: RiskFactor[] } {
  const prevalence = Math.max(0, stratum.prevalence);
  const preventableCap = Math.min(100, prevalence * PREVENTABLE_SHARE);
  const total = sumWeights(stratum.weights) || 1;

  const factors: RiskFactor[] = RISK_META.map((m) => {
    const w = Math.max(0, stratum.weights[m.id]);
    return {
      id: m.id,
      label: m.label,
      value: (preventableCap * w) / total, // skaliert: Summe = 45% der Prävalenz
    };
  });

  return { prevalence, preventableCap, factors };
}

function buildOverlaySegments(preventableCap: number, selected: RiskFactor[]): { segments: OverlaySegment[]; overflow: number } {
  // Blau füllt von hinten: Start am Ende des grünen Anteils und dann nach links.
  const segs: OverlaySegment[] = [];
  let cursor = 0;

  for (const rf of selected) {
    const v = Math.max(0, rf.value);

    const end = Math.min(preventableCap, Math.max(0, preventableCap - cursor));
    const start = Math.min(preventableCap, Math.max(0, preventableCap - (cursor + v)));

    if (end > start) segs.push({ start, end, colorClass: SELECTED_FACTOR_COLOR_CLASS, label: rf.label });

    cursor += v;
  }

  const overflow = Math.max(0, cursor - preventableCap);
  return { segments: segs, overflow };
}

function buildPersonRender(dementiaEnd: number, preventableEnd: number, segments: OverlaySegment[]): PersonRender[] {
  const out: PersonRender[] = Array.from({ length: 100 }, () => ({ baselinePortion: 0, preventablePortion: 0, overlayParts: [] }));

  for (let i = 0; i < 100; i++) {
    const pStart = i;
    const pEnd = i + 1;

    // Demenz (rot)
    const dStart = Math.max(pStart, 0);
    const dEnd = Math.min(pEnd, dementiaEnd);
    out[i].baselinePortion = Math.max(0, dEnd - dStart);

    // Modifizierbar gesamt (grün)
    const mStart = Math.max(pStart, 0);
    const mEnd = Math.min(pEnd, preventableEnd);
    out[i].preventablePortion = Math.max(0, mEnd - mStart);
  }

  // Aktuelle Risikofaktoren (Overlay in Blau) innerhalb des modifizierbaren Anteils
  for (const seg of segments) {
    const first = Math.floor(seg.start);
    const last = Math.ceil(seg.end);
    for (let i = first; i < last; i++) {
      if (i < 0 || i >= 100) continue;
      const pStart = i;
      const pEnd = i + 1;
      const s = Math.max(pStart, seg.start);
      const e = Math.min(pEnd, seg.end);
      if (e <= s) continue;
      const x = (s - pStart) * 24;
      const w = (e - s) * 24;
      out[i].overlayParts.push({ x, w, colorClass: seg.colorClass, label: seg.label });
    }
  }

  return out;
}

// --------------------
// Icon silhouettes (male/female) – restroom-style full-body glyphs
// --------------------

function MaleShape({ fill }: { fill: string }) {
  // Scale male glyph to match female total height (same visual length, same proportions)
  // Target female bbox: top≈1.2, bottom≈26.2 (height≈25)
  // Male bbox pre-scale: top≈1.4, bottom≈23.8 (height≈22.4)
  // => uniform scale s=25/22.4≈1.116; translate to align top.
  return (
    <g transform="matrix(1.116 0 0 1.116 -1.393 -0.363)" fill={fill}>
      {/* head (with subtle ears for easier sex distinction) */}
      <circle cx="12" cy="4.2" r="2.8" />
      <circle cx="9.4" cy="4.6" r="0.55" />
      <circle cx="14.6" cy="4.6" r="0.55" />

      {/* torso */}
      <rect x="9.0" y="7.2" width="6.0" height="8.6" rx="3.0" />

      {/* rounded shoulder joints (smooth arm attachment) */}
      <circle cx="9.2" cy="8.9" r="1.35" />
      <circle cx="14.8" cy="8.9" r="1.35" />

      {/* arms (slight angle, less robotic) */}
      <rect x="6.1" y="8.6" width="2.4" height="9.6" rx="1.2" transform="rotate(10 7.3 13.4)" />
      <rect x="15.5" y="8.6" width="2.4" height="9.6" rx="1.2" transform="rotate(-10 16.7 13.4)" />

      {/* legs */}
      <rect x="9.5" y="15.2" width="2.3" height="8.6" rx="1.15" />
      <rect x="12.2" y="15.2" width="2.3" height="8.6" rx="1.15" />
    </g>
  );
}

// Female icon (restroom-style) – full-body silhouette (head + dress + arms + legs)
function FemaleShape({ fill }: { fill: string }) {
  // Restroom-style female with clearer joints.
  // Requested changes:
  // - arms should attach with a rounded shoulder joint
  // - keep flared skirt + visible legs
  return (
    <g fill={fill}>
      {/* head */}
      <circle cx="12" cy="4.1" r="2.9" />

      {/* upper torso */}
      <rect x="9.3" y="7.2" width="5.4" height="5.2" rx="2.1" />

      {/* rounded shoulder joints (smooth arm attachment) */}
      <circle cx="9.4" cy="8.9" r="1.45" />
      <circle cx="14.6" cy="8.9" r="1.45" />

      {/* arms (slight angle, connected into shoulder circles) */}
      <rect x="5.7" y="8.5" width="2.4" height="9.6" rx="1.2" transform="rotate(12 6.9 13.3)" />
      <rect x="15.9" y="8.5" width="2.4" height="9.6" rx="1.2" transform="rotate(-12 17.1 13.3)" />

      {/* skirt (flared hem; ends above legs for clear separation) */}
      <path d="M9.2 11.6H14.8L16.6 17.3C16.8 18.0 16.3 18.6 15.6 18.6H8.4C7.7 18.6 7.2 18.0 7.4 17.3L9.2 11.6Z" />

      {/* legs (≈40% longer; keep stance) */}
      <rect x="9.0" y="18.6" width="2.3" height="7.6" rx="1.15" />
      <rect x="12.7" y="18.6" width="2.3" height="7.6" rx="1.15" />
    </g>
  );
}

function PersonShape({ sex, fill }: { sex: Sex; fill: string }) {
  // IMPORTANT: exactly one silhouette at a time (prevents male/female overlay)
  return sex === "w" ? <FemaleShape fill={fill} /> : <MaleShape fill={fill} />;
}

function PersonIcon({
  index,
  baselinePortion,
  preventablePortion,
  overlayParts,
  sex,
}: {
  index: number;
  baselinePortion: number;
  preventablePortion: number;
  overlayParts: { x: number; w: number; colorClass: string; label: string }[];
  sex: Sex;
}) {
  const maskId = `person-mask-${sex}-${index}`;
  const baselineW = Math.max(0, Math.min(24, baselinePortion * 24));
  const preventableW = Math.max(0, Math.min(24, preventablePortion * 24));

  const active = baselinePortion > 0;

  const tooltip = !active
    ? "Nicht markiert"
    : overlayParts.length
      ? `Demenz (Teil) – aktuelle Risikofaktoren: ${[...new Set(overlayParts.map((p) => p.label))].join(", ")}`
      : "Demenz";

  return (
    <div title={tooltip} className="flex items-center justify-center" aria-label={tooltip}>
      <svg
        width="54"
        height="63"
        viewBox="0 0 24 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-300"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="24" height="28" fill="black" />
            <PersonShape sex={sex} fill="white" />
          </mask>
        </defs>

        {/* Grundform (grau) */}
        <g opacity={0.9}>
          <PersonShape sex={sex} fill="currentColor" />
        </g>

        {/* Demenz (rot) */}
        {active && baselineW > 0 && (
          <rect
            x="0"
            y="0"
            width={baselineW}
            height="28"
            className={`fill-current ${DEMENTIA_COLOR_CLASS}`}
            mask={`url(#${maskId})`}
            opacity={0.85}
          />
        )}

        {/* Modifizierbar gesamt (grün) */}
        {active && preventableW > 0 && (
          <rect
            x="0"
            y="0"
            width={preventableW}
            height="28"
            className={`fill-current ${PREVENTABLE_COLOR_CLASS}`}
            mask={`url(#${maskId})`}
            opacity={0.85}
          />
        )}

        {/* Aktuelle Risikofaktoren (blau) */}
        {active &&
          overlayParts.map((p, idx) => (
            <rect
              key={`${index}-${idx}`}
              x={p.x}
              y="0"
              width={p.w}
              height="28"
              className={`fill-current ${p.colorClass}`}
              mask={`url(#${maskId})`}
              opacity={1}
            />
          ))}
      </svg>
    </div>
  );
}

// --------------------
// Component
// --------------------

export default function HundredPeopleVisualizer() {
  const DEFAULT_SEX: Sex = "w";
  const DEFAULT_AGE: AgeGroup = "80-84";

  const [sex, setSex] = useState<Sex>(DEFAULT_SEX);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(DEFAULT_AGE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reset = () => {
    setSex(DEFAULT_SEX);
    setAgeGroup(DEFAULT_AGE);
    setSelectedIds(new Set());
  };

  const setStratum = (nextSex: Sex, nextAge: AgeGroup) => {
    // Kein automatischer Reset der Risikofaktoren beim Wechsel von Geschlecht/Alter.
    setSex(nextSex);
    setAgeGroup(nextAge);
  };

  const toggleRiskFactor = (id: string, on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const { prevalence, preventableCap, factors: RISK_FACTORS } = useMemo(() => {
    return buildRiskFactorsForStratum(STRATA[sex][ageGroup]);
  }, [sex, ageGroup]);

  const selectedRiskFactors = useMemo(() => {
    return RISK_FACTORS.filter((rf) => selectedIds.has(rf.id));
  }, [RISK_FACTORS, selectedIds]);

  // Grunddarstellung: Demenz immer sichtbar
  const baselineEnd = Math.min(100, Math.max(0, prevalence));
  const preventableEnd = Math.min(baselineEnd, Math.max(0, preventableCap));

  const { overlaySegments, selectedSum, overflow } = useMemo(() => {
    const sum = selectedRiskFactors.reduce((acc, rf) => acc + Math.max(0, rf.value), 0);
    const { segments, overflow } = buildOverlaySegments(preventableEnd, selectedRiskFactors);
    return { overlaySegments: segments, selectedSum: sum, overflow };
  }, [preventableEnd, selectedRiskFactors]);

  const persons = useMemo(() => buildPersonRender(baselineEnd, preventableEnd, overlaySegments), [baselineEnd, preventableEnd, overlaySegments]);

  const ageLabel = AGE_GROUPS.find((a) => a.id === ageGroup)?.label ?? ageGroup;
  const stratumLabel = `${SEX_LABEL_PLURAL[sex]} ${ageLabel}`;

  // Blau selektiert = Summe der *angeklickten* Risikofaktoren
  const preventedBlue = Math.min(preventableCap, Math.max(0, selectedSum));
  // Grün (nicht ausgewählt) = Rest
  const preventedGreen = Math.max(0, preventableCap - preventedBlue);

  const sentenceStratum = (
    <span>
      Wenn Sie <span className="font-semibold">{SEX_LABEL_SENTENCE[sex]}</span> ein Alter von{" "}
      <span className="font-semibold">{ageLabel} Jahren</span> erreichen, beträgt Ihr Demenzrisiko{" "}
      <span className={`font-semibold ${DEMENTIA_COLOR_CLASS}`}>{fmtDE(prevalence)} %</span>.
      <br />
      Durch gezielte Interventionen können Sie jetzt den beeinflussbaren Anteil Ihres Risikos um bis zu{" "}
      <span className={`font-semibold ${SELECTED_FACTOR_COLOR_CLASS}`}>{fmtDE(preventedBlue)} %</span> reduzieren und damit Ihr gesamtes Präventionspotenzial von{" "}
      <span className={`font-semibold ${PREVENTABLE_COLOR_CLASS}`}>{fmtDE(preventableCap)} %</span> erreichen.
    </span>
  );

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h1 className="text-xl font-semibold tracking-tight">Modifizierbares Demenzrisiko</h1>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Lebenszeitprävalenz basierend auf{" "}
                <a
                  href="https://www.alzheimer-europe.org/dementia/prevalence-dementia-europe?language_content_entity=en"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Alzheimer Europe
                </a>
              </div>
              <div>Näherungswerte Risikofaktoren nach Livingston et al., The Lancet 2024.</div>
            </div>
          </div>

          <Button variant="outline" onClick={reset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        {selectedSum > preventableEnd && (
          <Alert>
            <AlertTitle>Hinweis</AlertTitle>
            <AlertDescription>
              Summe der ausgewählten Faktoren: <span className="font-medium">{fmtDE(selectedSum)}</span>. Das überschreitet den modifizierbaren Anteil (<span className="font-medium">{fmtDE(preventableEnd)}</span>). Überschuss wird nicht dargestellt: <span className="font-medium">{fmtDE(overflow)}</span>.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {/* LEFT */}
          <Card className="rounded-2xl md:col-span-1">
            <CardContent className="space-y-4 pt-6">
              {/* Sex + Age */}
              <div className="rounded-xl border p-3 space-y-3">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">{stratumLabel}</div>
                  </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant={sex === "m" ? "default" : "outline"} onClick={() => setStratum("m", ageGroup)}>
                    Männer
                  </Button>
                  <Button variant={sex === "w" ? "default" : "outline"} onClick={() => setStratum("w", ageGroup)}>
                    Frauen
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {AGE_GROUPS.map((ag) => (
                    <Button key={ag.id} variant={ageGroup === ag.id ? "default" : "outline"} onClick={() => setStratum(sex, ag.id)}>
                      {ag.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Risk factors */}
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Risikofaktoren</div>
                    
                  </div>
                  
                </div>

                <div className="mt-3 space-y-2">
                  {RISK_FACTORS.map((rf) => {
                    const on = selectedIds.has(rf.id);
                    const dotColor = on ? SELECTED_FACTOR_COLOR_CLASS : PREVENTABLE_COLOR_CLASS;
                    const textColor = on ? "text-[#5B72C8]" : "";

                    return (
                      <div key={rf.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${on ? "border-[#5B72C8]" : ""}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-3 w-3 rounded-full bg-current ${dotColor}`} aria-hidden="true" />
                            <span className={`text-sm font-medium truncate ${textColor}`}>{rf.label}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{fmtDE(rf.value)} / 100</div>
                        </div>

                        <Switch
                          checked={on}
                          onCheckedChange={(v) => toggleRiskFactor(rf.id, v)}
                          aria-label={`Risikofaktor ${rf.label} aktivieren`}
                          className="data-[state=checked]:bg-[#5B72C8] data-[state=checked]:border-[#5B72C8]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Card className="rounded-2xl md:col-span-2">
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl border p-3">
                <div className="text-xs md:text-sm leading-snug">{sentenceStratum}</div>
              </div>

              <div className="grid grid-cols-10 gap-0.5 rounded-xl border p-2">
                {persons.map((p, i) => (
                  <PersonIcon
                    key={`p-${i}`}
                    index={i}
                    baselinePortion={p.baselinePortion}
                    preventablePortion={p.preventablePortion}
                    sex={sex}
                    overlayParts={p.baselinePortion > 0 ? p.overlayParts : []}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Legende</div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1">
                    <span className={`inline-flex h-3 w-3 rounded-full ${DEMENTIA_BG_CLASS}`} aria-hidden="true" />
                    <span className="text-sm">Demenz</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1">
                    <span className={`inline-flex h-3 w-3 rounded-full ${PREVENTABLE_BG_CLASS}`} aria-hidden="true" />
                    <span className="text-sm">Modifizierbar gesamt</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1">
                    <span className={`inline-flex h-3 w-3 rounded-full ${SELECTED_FACTOR_BG_CLASS}`} aria-hidden="true" />
                    <span className="text-sm">Aktuelle Risikofaktoren</span>
                  </div>
                </div>
              </div>

              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
