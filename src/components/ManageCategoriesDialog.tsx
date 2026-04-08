import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Plus, Trash2 } from "lucide-react";
import { getAllExpenseCategories, addCustomCategory, deleteCustomCategory, getCustomCategories } from "@/lib/store";
import { DEFAULT_EXPENSE_CATEGORIES, ExpenseCategoryInfo } from "@/lib/types";

interface Props {
  onUpdated: () => void;
}

export function ManageCategoriesDialog({ onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Record<string, ExpenseCategoryInfo>>({});
  const [customKeys, setCustomKeys] = useState<Set<string>>(new Set());
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("📌");

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setCategories(getAllExpenseCategories());
      setCustomKeys(new Set(Object.keys(getCustomCategories())));
    }
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const key = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    addCustomCategory(key, { label: newLabel.trim(), icon: newIcon || '📌' });
    setNewLabel("");
    setNewIcon("📌");
    setCategories(getAllExpenseCategories());
    setCustomKeys(new Set(Object.keys(getCustomCategories())));
    onUpdated();
  };

  const handleDelete = (key: string) => {
    deleteCustomCategory(key);
    setCategories(getAllExpenseCategories());
    setCustomKeys(new Set(Object.keys(getCustomCategories())));
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Manage categories">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Expense Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {Object.entries(categories).map(([key, info]) => {
            const isCustom = customKeys.has(key);
            return (
              <div key={key} className="flex items-center justify-between p-2 rounded-md border border-border">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="text-sm font-medium">{info.label}</span>
                </span>
                {isCustom && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(key)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-border pt-3 mt-3">
          <Label className="text-sm font-medium">Add Custom Category</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Emoji"
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              className="w-16 text-center"
              maxLength={4}
            />
            <Input
              placeholder="Category name"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            />
            <Button onClick={handleAdd} size="icon" disabled={!newLabel.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
