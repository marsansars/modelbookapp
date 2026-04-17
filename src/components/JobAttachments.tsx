import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateJob } from "@/lib/store";
import { Job, JobAttachment, AttachmentLabel, ATTACHMENT_LABELS } from "@/lib/types";
import { Paperclip, X, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { uploadAttachment, getAttachmentUrl, deleteAttachment } from "@/lib/storage";

interface Props {
  job: Job;
  onChanged: () => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface PendingFile {
  file: File;
  label: AttachmentLabel;
}

export function JobAttachments({ job, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const attachments = job.attachments || [];
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // Generate signed URLs for image previews
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const att of attachments) {
        if (att.storagePath && att.type.startsWith('image/')) {
          try {
            next[att.id] = await getAttachmentUrl(att.storagePath, 3600);
          } catch (e) {
            // skip
          }
        } else if (att.dataUrl && att.type.startsWith('image/')) {
          next[att.id] = att.dataUrl;
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, attachments.length]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const pending: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 25MB)`);
        continue;
      }
      pending.push({ file, label: 'Call Sheet' });
    }

    if (pending.length > 0) {
      setPendingFiles(pending);
      setShowLabelDialog(true);
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmAttachments = async () => {
    setUploading(true);
    try {
      const uploaded: JobAttachment[] = [];
      for (const pf of pendingFiles) {
        try {
          const { storagePath, size, type, name } = await uploadAttachment(pf.file);
          uploaded.push({
            id: crypto.randomUUID(),
            name,
            type,
            storagePath,
            size,
            addedAt: new Date().toISOString(),
            label: pf.label,
          });
        } catch (err: any) {
          toast.error(`Failed to upload ${pf.file.name}: ${err?.message || err}`);
        }
      }

      if (uploaded.length > 0) {
        await updateJob(job.id, { attachments: [...attachments, ...uploaded] });
        onChanged();
        toast.success(`${uploaded.length} file(s) attached`);
      }
      setPendingFiles([]);
      setShowLabelDialog(false);
    } finally {
      setUploading(false);
    }
  };

  const updatePendingLabel = (idx: number, label: AttachmentLabel) => {
    setPendingFiles(files => files.map((f, i) => i === idx ? { ...f, label } : f));
  };

  const openAttachment = async (att: JobAttachment) => {
    try {
      const url = att.storagePath ? await getAttachmentUrl(att.storagePath, 600) : att.dataUrl;
      if (!url) throw new Error('No URL available');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(`Could not open file: ${err?.message || err}`);
    }
  };

  const removeAttachment = async (att: JobAttachment) => {
    if (att.storagePath) {
      await deleteAttachment(att.storagePath);
    }
    await updateJob(job.id, { attachments: attachments.filter(a => a.id !== att.id) });
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
                <button type="button" onClick={() => openAttachment(att)} className="block w-full">
                  {thumbs[att.id] ? (
                    <img src={thumbs[att.id]} alt={att.name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center bg-secondary/50">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAttachment(att)}
                  className="flex flex-col items-center justify-center h-20 w-full gap-1 hover:bg-secondary/60 transition-colors"
                >
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <Download className="h-3 w-3 text-muted-foreground" />
                </button>
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
                onClick={() => removeAttachment(att)}
                className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label selection dialog */}
      <Dialog open={showLabelDialog} onOpenChange={open => { if (!open && !uploading) { setPendingFiles([]); setShowLabelDialog(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Label Attachment{pendingFiles.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingFiles.map((pf, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <p className="text-sm text-foreground truncate flex-1">{pf.file.name}</p>
                <Select value={pf.label} onValueChange={v => updatePendingLabel(idx, v as AttachmentLabel)} disabled={uploading}>
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
            <Button className="w-full" onClick={confirmAttachments} disabled={uploading}>
              {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>) : 'Attach'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
