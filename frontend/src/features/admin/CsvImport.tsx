import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/primitives";
import { importCsv } from "@/api";
import type { ImportResult, ImportType } from "@/api/admin";
import { toast } from "@/store/useToast";
import { downloadFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/**
 * Admin CSV import. Uploads to the FastAPI backend, which validates row-by-row,
 * upserts the source tables, and recomputes affected students' scores. The UI
 * renders the backend's `error_log` (row/column/reason). Expected columns and
 * types mirror the backend import endpoints exactly.
 */
type Phase = "idle" | "uploading" | "error" | "success";

const TYPES: { id: ImportType; label: string; columns: string }[] = [
  {
    id: "attendance",
    label: "Attendance",
    columns: "roll_number, subject_code, subject_name, total_classes, attended_classes, period",
  },
  { id: "sgpa", label: "SGPA / Academic", columns: "roll_number, sgpa" },
  {
    id: "lms",
    label: "LMS activity",
    columns: "roll_number, period, login_count, assignments_submitted, assignments_total",
  },
];

function columnsFor(type: ImportType): string {
  return TYPES.find((t) => t.id === type)!.columns;
}

export function CsvImport() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [type, setType] = useState<ImportType>("attendance");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setFilename(f.name);
    setPhase("uploading");
    setUploadError(null);
    setResult(null);
    try {
      const r = await importCsv(type, f);
      setResult(r);
      if (r.error_log.length > 0) {
        setPhase("error");
        toast.error(`${r.error_log.length} issue${r.error_log.length > 1 ? "s" : ""} in ${f.name}.`);
      } else {
        setPhase("success");
        toast.success(`${r.success_count} rows imported — scores recomputed.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed.";
      setUploadError(msg);
      setPhase("error");
      toast.error(msg);
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setUploadError(null);
    setFilename("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadReport() {
    if (!result) return;
    const header = "row,column,reason";
    const lines = result.error_log.map(
      (e) => `${e.row},${e.column},"${e.reason.replace(/"/g, '""')}"`,
    );
    downloadFile(`import_errors_${type}.csv`, [header, ...lines].join("\r\n"), "text/csv");
  }

  if (phase === "uploading") {
    return (
      <div className="glass-quiet flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-azure-200/60 text-azure-600">
          <FileSpreadsheet size={24} className="animate-pulse" />
        </span>
        <p className="text-caption text-ink-soft">Uploading {filename}…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="glass-quiet flex flex-col gap-4 px-6 py-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-amber/15 text-signal-amber">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="font-display text-body font-semibold text-ink">
              {uploadError
                ? "Upload failed"
                : `${result?.error_log.length} issue${(result?.error_log.length ?? 0) > 1 ? "s" : ""} found`}
            </h3>
            <p className="mt-0.5 text-caption text-ink-soft">
              {uploadError ? (
                uploadError
              ) : (result?.success_count ?? 0) > 0 ? (
                <>
                  <span className="font-mono tnum text-ink">{result?.success_count}</span> of{" "}
                  <span className="font-mono tnum text-ink">{result?.row_count}</span> rows imported.
                  Fix the rows below and re-upload the rest.
                </>
              ) : (
                "No rows could be imported. Fix the issues below and re-upload."
              )}
            </p>
          </div>
        </div>

        {result && result.error_log.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-md border border-ink/[0.1]">
            <table className="w-full text-caption">
              <thead className="sticky top-0 bg-white/80 text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Row</th>
                  <th className="px-3 py-2 text-left font-medium">Column</th>
                  <th className="px-3 py-2 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {result.error_log.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono tnum text-ink">{e.row}</td>
                    <td className="px-3 py-1.5 font-mono text-ink-soft">{e.column}</td>
                    <td className="px-3 py-1.5 text-ink">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {result && result.error_log.length > 0 && (
            <Button size="sm" variant="secondary" onClick={downloadReport}>
              Download error report
            </Button>
          )}
          <Button size="sm" iconLeft={<RotateCcw size={15} />} onClick={reset}>
            Upload another file
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "success" && result) {
    return (
      <div className="glass-quiet flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(47,143,107,0.14)] text-signal-green">
          <CheckCircle2 size={26} />
        </span>
        <div>
          <h3 className="font-display text-body font-semibold text-ink">Import complete</h3>
          <p className="mt-1 text-caption text-ink-soft">
            <span className="font-mono tnum text-ink">{result.success_count}</span> rows from{" "}
            <span className="text-ink">{filename}</span> imported. Scores recomputed.
          </p>
        </div>
        <Button variant="secondary" iconLeft={<RotateCcw size={15} />} onClick={reset}>
          Import another file
        </Button>
      </div>
    );
  }

  // idle
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={cn(
              "rounded-full px-3 py-1 text-caption font-medium transition-colors",
              type === t.id
                ? "bg-azure-600 text-white"
                : "bg-ink/[0.05] text-ink-soft hover:bg-ink/[0.09]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging
            ? "border-azure-500 bg-azure-200/30"
            : "border-ink/[0.14] bg-white/40 hover:border-azure-200 hover:bg-white/60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-azure-200/60 text-azure-600">
          <UploadCloud size={24} />
        </span>
        <div>
          <p className="text-body font-medium text-ink">Drop a CSV here, or click to browse</p>
          <p className="mt-1 text-caption text-ink-soft">
            Uploaded to the server and validated row-by-row.
          </p>
        </div>
        <p className="font-mono text-[11px] text-ink-soft/70">
          Expected columns: {columnsFor(type)}
        </p>
      </div>
    </div>
  );
}
