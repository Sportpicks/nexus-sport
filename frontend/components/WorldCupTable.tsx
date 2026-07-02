"use client";

import { getFlagUrl } from "@/lib/flags";

interface TeamRow {
  pos: number;
  name: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
}

// Top 8 clasificados a la fase eliminatoria · Mundial 2026
// Actualizar con resultados reales al finalizar grupos
const QUALIFIED: TeamRow[] = [
  { pos: 1,  name: "Spain",        pj: 3, g: 3, e: 0, p: 0, gf: 8,  gc: 1,  pts: 9 },
  { pos: 2,  name: "Argentina",    pj: 3, g: 2, e: 1, p: 0, gf: 6,  gc: 2,  pts: 7 },
  { pos: 3,  name: "France",       pj: 3, g: 2, e: 0, p: 1, gf: 5,  gc: 3,  pts: 6 },
  { pos: 4,  name: "Brazil",       pj: 3, g: 2, e: 0, p: 1, gf: 5,  gc: 2,  pts: 6 },
  { pos: 5,  name: "Portugal",     pj: 3, g: 2, e: 1, p: 0, gf: 7,  gc: 2,  pts: 7 },
  { pos: 6,  name: "Germany",      pj: 3, g: 2, e: 0, p: 1, gf: 4,  gc: 3,  pts: 6 },
  { pos: 7,  name: "England",      pj: 3, g: 2, e: 1, p: 0, gf: 4,  gc: 1,  pts: 7 },
  { pos: 8,  name: "Morocco",      pj: 3, g: 2, e: 0, p: 1, gf: 4,  gc: 2,  pts: 6 },
];

const C = {
  primary: "#F1F5F9",
  muted:   "#94A3B8",
  dim:     "#64748B",
  accent:  "#6366F1",
  border:  "rgba(255,255,255,0.06)",
};

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#A5B4FC",
      textAlign: right ? "right" : "center", letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
  return (
    <td style={{
      padding: "8px 10px", fontSize: 12,
      color: bold ? C.primary : C.muted,
      fontWeight: bold ? 700 : 400,
      textAlign: right ? "right" : "center",
    }}>
      {children}
    </td>
  );
}

export default function WorldCupTable() {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
            Clasificados a eliminatoria · Mundial 2026
          </div>
          <div style={{ fontSize: 11, color: C.dim }}>
            8 mejores selecciones de la fase de grupos
          </div>
        </div>
      </div>

      <div style={{
        background: "#111827", borderRadius: 14,
        border: `1px solid ${C.border}`, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: `rgba(99,102,241,0.1)` }}>
              <Th>#</Th>
              <Th right>País</Th>
              <Th>PJ</Th>
              <Th>G</Th>
              <Th>E</Th>
              <Th>P</Th>
              <Th>GF</Th>
              <Th>GC</Th>
              <th style={{
                padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#A5B4FC",
                textAlign: "center", letterSpacing: "0.05em",
              }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {QUALIFIED.map((row, i) => (
              <tr key={row.name} style={{
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                borderTop: `1px solid ${C.border}`,
              }}>
                <Td>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                    background: row.pos <= 2 ? "rgba(99,102,241,0.25)" : "transparent",
                    color: row.pos <= 2 ? "#A5B4FC" : C.dim,
                  }}>{row.pos}</span>
                </Td>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <img
                      src={getFlagUrl(row.name)}
                      alt={row.name}
                      width={24} height={16}
                      style={{ objectFit: "cover", borderRadius: "2px", flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.primary, whiteSpace: "nowrap" }}>
                      {row.name}
                    </span>
                  </div>
                </td>
                <Td>{row.pj}</Td>
                <Td>{row.g}</Td>
                <Td>{row.e}</Td>
                <Td>{row.p}</Td>
                <Td>{row.gf}</Td>
                <Td>{row.gc}</Td>
                <Td bold>{row.pts}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
