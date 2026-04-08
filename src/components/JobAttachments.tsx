import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { updateJob } from "@/lib/store";
import { Job, JobAttachment } from "@/lib/types";
import { Paperclip, X, Image, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
  job: Job;
  onChanged: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file

export function JobAttachments({ job, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const attachments = job.attachments || [];

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: JobAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 2MB)`);
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        dataUrl,
        addedAt: new Date().toISOString(),
      });
    }

    if (newAttachments.length > 0) {
      updateJob(job.id, { attachments: [...attachments, ...newAttachments] });
      onChanged();
      toast.success(`${newAttachments.length} file(s) attached`);
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
    updateJob(job.id, { attachments: attachments.filter(a => a.id !== attachmentId) });
    onChanged();
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach File
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFiles}
        />
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
              <div className="px-1.5 py-1 bg-card/90">
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
