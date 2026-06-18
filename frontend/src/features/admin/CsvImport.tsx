import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react";
import { Button } from "@/components/primitives";
import { toast } from "@/store/useToast";
import { cn } from "@/lib/utils";

type Phase = "idle" | "processing" | "done";

interface Result {
  filename: string;
  rows: number;
  updated: number;
  added: number;
}

export function CsvImport() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function process(filename: string) {
    setPhase("processing");
    setProgress(0);
    // Fake a processing pipeline — no real parsing.
    const total = 900 + Math.floor(Math.random() * 1400);
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 7 + Math.random() * 11);
        if (next >= 100) {
          window.clearInterval(id);
          const rows = 60 + Math.floor(Math.random() * 20);
          window.setTimeout(() => {
            setResult({
              filename,
              rows,
              updated: Math.floor(rows * 0.8),
              added: rows - Math.floor(rows * 0.8),
            });
            setPhase("done");
            toast.success(`${filename} processed — ${rows} rows.`);
          }, 250);
        }
        return next;
      });
    }, 180);
    void total;
  }

  function onFiles(files: FileList | null) {
    const f = files?.[0];
    process(f?.name ?? "students_export.csv");
  }

  function reset() {
    setPhase("idle");
    setProgress(0);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (phase === "done" && result) {
    return (
      <div className="glass-quiet flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(47,143,107,0.14)] text-signal-green">
          <CheckCircle2 size={26} />
        </span>
        <div>
          <h3 className="font-display text-body font-semibold text-ink">Import complete</h3>
          <p className="mt-1 text-caption text-ink-soft">
            <span className="font-mono tnum text-ink">{result.rows}</span> rows from{" "}
            <span className="text-ink">{result.filename}</span> processed —{" "}
            <span className="font-mono tnum text-ink">{result.updated}</span> updated,{" "}
            <span className="font-mono tnum text-ink">{result.added}</span> added.
          </p>
        </div>
        <Button variant="secondary" iconLeft={<RotateCcw size={15} />} onClick={reset}>
          Import another file
        </Button>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="glass-quiet flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-azure-200/60 text-azure-600">
          <FileSpreadsheet size={24} className="animate-pulse" />
        </span>
        <div className="w-full max-w-xs">
          <p className="mb-2 text-caption text-ink-soft">Processing rows and recomputing scores…</p>
          <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-azure-500 to-azure-600 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono tnum text-caption text-ink-soft">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  return (
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
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-azure-200/60 text-azure-600">
        <UploadCloud size={24} />
      </span>
      <div>
        <p className="text-body font-medium text-ink">Drop a CSV here, or click to browse</p>
        <p className="mt-1 text-caption text-ink-soft">
          Attendance, marks or engagement exports — up to 5MB. We'll recompute scores after import.
        </p>
      </div>
      <p className="font-mono text-[11px] text-ink-soft/70">
        Expected columns: roll_no, attendance_pct, internal_marks, backlogs…
      </p>
    </div>
  );
}
