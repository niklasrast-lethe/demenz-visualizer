"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, RotateCcw } from "lucide-react";

type RiskFactor = {
  id: string;
  label: string;
  value: number; // absolute persons per 100 (e.g., 1.9)
  colorClass: string; // tailwind text color class, used via currentColor
};

// === FIXE VORGABEN (hier trägst du später nur Labels + Werte ein) ===
const DEMENTIA_VALUE = 13.1;

// Farbcodes (Hex) wie vorgegeben
const DEMENTIA_COLOR_CLASS = "text-[#F37458]"; // F37458
const DEMENTIA_BG_CLASS = "bg-[#F37458]";
const RISK_COLOR_CLASS = "text-[#09AD6F]"; // 09AD6F // von 100, wird in Rot markiert

// Fixe Risikofaktoren (Labels inkl. Prozentangabe wie von dir geliefert)
const RISK_FACTORS: RiskFactor[] = [
  { id: "rf-edu", label: "Weniger Bildung", value: 1.9, colorClass: RISK_COLOR_CLASS },
  { id: "rf-hearing", label: "Hörverlust", value: 2.9, colorClass: RISK_COLOR_CLASS },
  { id: "rf-ldl", label: "Hohes Low density lipoprotein Cholesterin", value: 2.9, colorClass: RISK_COLOR_CLASS },
  { id: "rf-depr", label: "Depression", value: 1.3, colorClass: RISK_COLOR_CLASS },
  { id: "rf-tbi", label: "Traumatische Hirnverletzung", value: 1.2, colorClass: RISK_COLOR_CLASS },
  { id: "rf-inactivity", label: "Körperliche Inaktivität", value: 1.0, colorClass: RISK_COLOR_CLASS },
  { id: "rf-smoking", label: "Rauchen", value: 1.0, colorClass: RISK_COLOR_CLASS },
  { id: "rf-diabetes", label: "Diabetes", value: 1.0, colorClass: RISK_COLOR_CLASS },
  { id: "rf-htn", label: "Hypertonie", value: 0.9, colorClass: RISK_COLOR_CLASS },
  { id: "rf-obesity", label: "Adipositas", value: 0.6, colorClass: RISK_COLOR_CLASS },
  { id: "rf-alcohol", label: "Exzessiver Alkoholkonsum", value: 0.4, colorClass: RISK_COLOR_CLASS },
  { id: "rf-isolation", label: "Soziale Isolation", value: 1.9, colorClass: RISK_COLOR_CLASS },
  { id: "rf-air", label: "Luftverschmutzung", value: 1.1, colorClass: RISK_COLOR_CLASS },
  { id: "rf-vision", label: "Unbehandelter Sehverlust", value: 0.9, colorClass: RISK_COLOR_CLASS },
];

const fmtDE = (n: number) => n.toLocaleString("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type OverlaySegment = {
  start: number; // in Personen-Einheiten, 0..DEMENTIA_VALUE
  end: number;
  colorClass: string;
  label: string;
};

type PersonRender = {
  baselinePortion: number; // 0..1
  overlayParts: { x: number; w: number; colorClass: string; label: string }[];
};

function buildOverlaySegments(
  baselineEnd: number,
  selected: RiskFactor[]
): { segments: OverlaySegment[]; overflow: number } {
  const segs: OverlaySegment[] = [];
  let cursor = 0;

  for (const rf of selected) {
    const start = cursor;
    const end = Math.min(baselineEnd, cursor + Math.max(0, rf.value));
    if (end > start) segs.push({ start, end, colorClass: rf.colorClass, label: rf.label });
    cursor += Math.max(0, rf.value);
  }

  const overflow = Math.max(0, cursor - baselineEnd);
  return { segments: segs, overflow };
}

function buildPersonRender(
  baselineEnd: number,
  segments: OverlaySegment[]
): PersonRender[] {
  const out: PersonRender[] = Array.from({ length: 100 }, () => ({ baselinePortion: 0, overlayParts: [] }));

  // Baseline (Demenz)
  for (let i = 0; i < 100; i++) {
    const pStart = i;
    const pEnd = i + 1;
    const bStart = Math.max(pStart, 0);
    const bEnd = Math.min(pEnd, baselineEnd);
    out[i].baselinePortion = Math.max(0, bEnd - bStart); // 0..1
  }

  // Overlays (Risikofaktoren) – können innerhalb eines Persons mehrere Segmente erzeugen
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

function PersonIcon({
  index,
  baselinePortion,
  overlayParts,
  active,
}: {
  index: number;
  baselinePortion: number;
  overlayParts: { x: number; w: number; colorClass: string; label: string }[];
  active: boolean;
}) {
  const maskId = `person-mask-${index}`;
  const baselineW = Math.max(0, Math.min(24, baselinePortion * 24));

  // Tooltip: Baseline + (optional) Risikofaktoren
  const tooltip = !active
    ? "Nicht markiert"
    : overlayParts.length
      ? `Demenz (Teil) + ${[...new Set(overlayParts.map((p) => p.label))].join(", ")}`
      : "Demenz";

  return (
    <div title={tooltip} className="flex items-center justify-center" aria-label={tooltip}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-300"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="24" height="24" fill="black" />
            <path
              d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Zm0 2.2c-4.4 0-8 2.2-8 4.9V21h16v-1.9c0-2.7-3.6-4.9-8-4.9Z"
              fill="white"
            />
          </mask>
        </defs>

        {/* Grundform (grau) */}
        <path
          d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Zm0 2.2c-4.4 0-8 2.2-8 4.9V21h16v-1.9c0-2.7-3.6-4.9-8-4.9Z"
          className="fill-current"
          opacity={0.9}
        />

        {/* Baseline (rot) */}
        {active && baselineW > 0 && (
          <rect
            x="0"
            y="0"
            width={baselineW}
            height="24"
            className={`fill-current ${DEMENTIA_COLOR_CLASS}`}
            mask={`url(#${maskId})`}
            opacity={0.85}
          />
        )}

        {/* Overlays (Risikofaktoren) */}
        {active &&
          overlayParts.map((p, idx) => (
            <rect
              key={`${index}-${idx}`}
              x={p.x}
              y="0"
              width={p.w}
              height="24"
              className={`fill-current ${p.colorClass}`}
              mask={`url(#${maskId})`}
              opacity={1}
            />
          ))}
      </svg>
    </div>
  );
}

export default function HundredPeopleVisualizer() {
  const [dementiaOn, setDementiaOn] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reset = () => {
    setDementiaOn(false);
    setSelectedIds(new Set());
  };

  const toggleRiskFactor = (id: string, on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectedRiskFactors = useMemo(() => {
    // Reihenfolge = definierte Reihenfolge in RISK_FACTORS
    return RISK_FACTORS.filter((rf) => selectedIds.has(rf.id));
  }, [selectedIds]);

  const baselineEnd = dementiaOn ? Math.min(100, Math.max(0, DEMENTIA_VALUE)) : 0;

  const { overlaySegments, selectedSum, overflow } = useMemo(() => {
    const sum = selectedRiskFactors.reduce((acc, rf) => acc + Math.max(0, rf.value), 0);
    const { segments, overflow } = buildOverlaySegments(baselineEnd, selectedRiskFactors);
    return { overlaySegments: segments, selectedSum: sum, overflow };
  }, [baselineEnd, selectedRiskFactors]);

  const persons = useMemo(() => buildPersonRender(baselineEnd, overlaySegments), [baselineEnd, overlaySegments]);

  
  return (
    <div className="w-full p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h1 className="text-xl font-semibold tracking-tight">Darstellung von 100 Personen (Demenz + Risikofaktoren)</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Klick: Demenz (13,1 von 100) in Rot. Darunter: fixe Risikofaktoren-Werte (z. B. 1,9) relativ zu 13,1.
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        {dementiaOn && selectedSum > baselineEnd && (
          <Alert>
            <AlertTitle>Hinweis</AlertTitle>
            <AlertDescription>
              Summe der ausgewählten Risikofaktoren: <span className="font-medium">{fmtDE(selectedSum)}</span>. Das überschreitet
              <span className="font-medium"> {fmtDE(baselineEnd)}</span> (Demenz). Der Überschuss wird nicht dargestellt:
              <span className="font-medium"> {fmtDE(overflow)}</span>.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Auswahl (fixe Werte, keine Slider)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Demenz</div>
                    <div className="text-xs text-muted-foreground">Prävalenz im Alter von 80-84 Jahren</div>
                    <div className="text-xs text-muted-foreground">{fmtDE(DEMENTIA_VALUE)} von 100</div>
                  </div>
                  <Button
                    onClick={() => setDementiaOn((v) => !v)}
                    variant={dementiaOn ? "default" : "outline"}
                    className={dementiaOn ? `${DEMENTIA_BG_CLASS} hover:opacity-90` : ""}
                  >
                    {dementiaOn ? "An" : "Anklicken"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Risikofaktoren</div>
                    
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    Selektiert: {dementiaOn ? fmtDE(selectedSum) : "0,0"}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {RISK_FACTORS.map((rf) => {
                    const on = selectedIds.has(rf.id);
                    return (
                      <div key={rf.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-3 w-3 rounded-full bg-current ${rf.colorClass}`} aria-hidden="true" />
                            <span className="text-sm font-medium truncate">{rf.label}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {fmtDE(rf.value)} von 100
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">An</Label>
                          <Switch
                            checked={dementiaOn ? on : false}
                            onCheckedChange={(v) => toggleRiskFactor(rf.id, v)}
                            disabled={!dementiaOn}
                            aria-label={`Risikofaktor ${rf.label} aktivieren`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {!dementiaOn && (
                    <div className="text-xs text-muted-foreground">
                      Erst „Demenz“ anklicken, dann sind Risikofaktoren auswählbar.
                    </div>
                  )}
                </div>

                
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Visualisierung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  Demenz: <span className="font-medium tabular-nums">{dementiaOn ? fmtDE(baselineEnd) : "0,0"}</span> / 100
                </div>
                <div className="text-sm text-muted-foreground">
                  Risikofaktoren selektiert: <span className="font-medium tabular-nums">{dementiaOn ? fmtDE(selectedSum) : "0,0"}</span>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-1 rounded-xl border p-3">
                {persons.map((p, i) => {
                  const active = dementiaOn && p.baselinePortion > 0;
                  return (
                    <PersonIcon
                      key={i}
                      index={i}
                      baselinePortion={p.baselinePortion}
                      overlayParts={active ? p.overlayParts : []}
                      active={active}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Legende</div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1">
                    <span className={`inline-flex h-3 w-3 rounded-full ${DEMENTIA_BG_CLASS}`} aria-hidden="true" />
                    <span className="text-sm">Demenz: {fmtDE(DEMENTIA_VALUE)}</span>
                  </div>

                  {selectedRiskFactors.map((rf) => (
                    <div key={rf.id} className="flex items-center gap-2 rounded-full border px-3 py-1">
                      <span className={`inline-flex h-3 w-3 rounded-full bg-current ${rf.colorClass}`} aria-hidden="true" />
                      <span className="text-sm">
                        {rf.label}: {fmtDE(rf.value)}
                      </span>
                    </div>
                  ))}

                  {selectedRiskFactors.length === 0 && (
                    <div className="text-sm text-muted-foreground">Keine Risikofaktoren ausgewählt.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Rot zeigt die 13,1 von 100 (Demenz).</li>
                  <li>Ausgewählte Risikofaktoren überlagern innerhalb dieser 13,1 (farbig), in der Reihenfolge der Liste.</li>
                  <li>Dezimalstellen werden als Teilfüllung der letzten Person dargestellt.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
