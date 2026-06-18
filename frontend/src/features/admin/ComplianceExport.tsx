import { useState } from "react";
import { Download, FileCheck2, FileDown } from "lucide-react";
import type { ComplianceExport as ExportResult } from "@/api/admin";
import { generateComplianceExport } from "@/api";
import { Button } from "@/components/primitives";
import { downloadFile } from "@/lib/download";
import { toast } from "@/store/useToast";
import { formatDate, formatTime } from "@/lib/utils";

export function ComplianceExport() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ExportResult | null>(null);

  async function generate() {
    setBusy(true);
    const result = await generateComplianceExport();
    setBusy(false);
    setLast(result);
    downloadFile(result.filename, result.csv, "text/csv");
    toast.success(`Export ready — ${result.row_count} rows downloaded.`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-azure-200/60 text-azure-600">
          <FileCheck2 size={22} />
        </span>
        <div>
          <h3 className="font-display text-body font-semibold text-ink">NAAC / NBA mentoring report</h3>
          <p className="mt-0.5 text-caption text-ink-soft">
            One row per student — Success Score, all four components, mentor, and meetings logged.
            Ready for accreditation submission.
          </p>
        </div>
      </div>
      <Button onClick={generate} disabled={busy} iconLeft={<FileDown size={16} />}>
        {busy ? "Generating…" : "Generate export"}
      </Button>

      {last && (
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[rgba(47,143,107,0.1)] px-4 py-3">
            <div className="text-caption">
              <p className="font-medium text-ink">{last.filename}</p>
              <p className="text-ink-soft">
                <span className="font-mono tnum">{last.row_count}</span> rows · generated{" "}
                {formatDate(last.generated_at)} at {formatTime(last.generated_at)}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              iconLeft={<Download size={15} />}
              onClick={() => downloadFile(last.filename, last.csv, "text/csv")}
            >
              Download again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
