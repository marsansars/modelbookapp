import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { updateJob } from "@/lib/store";
import { Job, JobAttachment, AttachmentLabel, ATTACHMENT_LABELS } from "@/lib/types";
import { Paperclip, X, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Props {
  job: Job;
  onChanged: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface PendingFile {
  file: File;
  dataUrl: string;
  label: AttachmentLabel;
}

export function JobAttachments({ job, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const attachments = job.attachments || [];
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const pending: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 2MB)`);
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      pending.push({ file, dataUrl, label: 'Call Sheet' });
    }

    if (pending.length > 0) {
      setPendingFiles(pending);
      setShowLabelDialog(true);
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmAttachments = async () => {
    const newAttachments: JobAttachment[] = pendingFiles.map(pf => ({
      id: crypto.randomUUID(),
      name: pf.file.name,
      type: pf.file.type,
      dataUrl: pf.dataUrl,
      addedAt: new Date().toISOString(),
      label: pf.label,
    }));

    await updateJob(job.id, { attachments: [...attachments, ...newAttachments] });
    onChanged();
    toast.success(`${newAttachments.length} file(s) attached`);
    setPendingFiles([]);
    setShowLabelDialog(false);
  };

  const updatePendingLabel = (idx: number, label: AttachmentLabel) => {
    setPendingFiles(files => files.map((f, i) => i === idx ? { ...f, label } : f));
  };

  const removeAttachment = async (attachmentId: string) => {
    await updateJob(job.id, { attachments: attachments.filter(a => a.id !== attachmentId) });
    onChanged();
  };

  const isImage = (type: string) => type.startsWith('image/');

  const labelColor = (label?: string) => {
    switch (label) {
      case 'Call Sheet': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Receipt': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Statement': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
          <Paperclip className="h-3.5 w-3.5" />
          Attach File
        </Button>
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFiles} />
        {attachments.length > 0 && (
          <span className="text-xs text-muted-foreground">{attachments.length} file(s)</span>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {attachments.map(att => (
            <div key={att.id} className="relative group rounded-md border border-border/50 bg-secondary/30 overflow-hidden">
              {isImage(att.type) ? (
                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer">
                  <img src={att.dataUrl} alt={att.name} className="w-full h-20 object-cover" />
                </a>
              ) : (
                <a href={att.dataUrl} download={att.name} className="flex flex-col items-center justify-center h-20 gap-1 hover:bg-secondary/60 transition-colors">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <Download className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
              <div className="px-1.5 py-1 bg-card/90 space-y-0.5">
                {att.label && (
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${labelColor(att.label)}`}>
                    {att.label}
                  </Badge>
                )}
                <p className="text-[10px] text-muted-foreground truncate">{att.name}</p>
              </div>
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label selection dialog */}
      <Dialog open={showLabelDialog} onOpenChange={open => { if (!open) { setPendingFiles([]); setShowLabelDialog(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Label Attachment{pendingFiles.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingFiles.map((pf, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <p className="text-sm text-foreground truncate flex-1">{pf.file.name}</p>
                <Select value={pf.label} onValueChange={v => updatePendingLabel(idx, v as AttachmentLabel)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_LABELS.map(label => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button className="w-full" onClick={confirmAttachments}>Attach</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
