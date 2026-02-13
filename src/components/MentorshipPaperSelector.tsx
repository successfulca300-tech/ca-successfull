import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, Circle } from 'lucide-react';

interface Paper {
  id: string;
  series: string;
  seriesNum: number;
  name: string;
  subject: string;
}

interface MentorshipPaperSelectorProps {
  isOpen: boolean;
  planName: string;
  maxPapers: number;
  onClose: () => void;
  onConfirm: (selectedPapers: string[]) => void;
  isLoading?: boolean;
}

const AVAILABLE_PAPERS: Paper[] = [
  // Series 1
  { id: 's1_series1_fr', series: 'Series 1', seriesNum: 1, name: 'FR Paper', subject: 'Financial Reporting' },
  { id: 's1_series1_afm', series: 'Series 1', seriesNum: 1, name: 'AFM Paper', subject: 'Advanced Financial Management' },
  { id: 's1_series1_audit', series: 'Series 1', seriesNum: 1, name: 'Audit Paper', subject: 'Auditing and Assurance' },
  { id: 's1_series1_dt', series: 'Series 1', seriesNum: 1, name: 'DT Paper', subject: 'Direct Tax' },
  { id: 's1_series1_idt', series: 'Series 1', seriesNum: 1, name: 'IDT Paper', subject: 'Indirect Tax' },
  
  // Series 2
  { id: 's1_series2_fr', series: 'Series 2', seriesNum: 2, name: 'FR Paper', subject: 'Financial Reporting' },
  { id: 's1_series2_afm', series: 'Series 2', seriesNum: 2, name: 'AFM Paper', subject: 'Advanced Financial Management' },
  { id: 's1_series2_audit', series: 'Series 2', seriesNum: 2, name: 'Audit Paper', subject: 'Auditing and Assurance' },
  { id: 's1_series2_dt', series: 'Series 2', seriesNum: 2, name: 'DT Paper', subject: 'Direct Tax' },
  { id: 's1_series2_idt', series: 'Series 2', seriesNum: 2, name: 'IDT Paper', subject: 'Indirect Tax' },
  
  // Series 3
  { id: 's1_series3_fr', series: 'Series 3', seriesNum: 3, name: 'FR Paper', subject: 'Financial Reporting' },
  { id: 's1_series3_afm', series: 'Series 3', seriesNum: 3, name: 'AFM Paper', subject: 'Advanced Financial Management' },
  { id: 's1_series3_audit', series: 'Series 3', seriesNum: 3, name: 'Audit Paper', subject: 'Auditing and Assurance' },
  { id: 's1_series3_dt', series: 'Series 3', seriesNum: 3, name: 'DT Paper', subject: 'Direct Tax' },
  { id: 's1_series3_idt', series: 'Series 3', seriesNum: 3, name: 'IDT Paper', subject: 'Indirect Tax' },
];

export const MentorshipPaperSelector: React.FC<MentorshipPaperSelectorProps> = ({
  isOpen,
  planName,
  maxPapers,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);

  if (!isOpen) return null;

  const togglePaper = (paperId: string) => {
    setSelectedPapers((prev) => {
      if (prev.includes(paperId)) {
        return prev.filter((id) => id !== paperId);
      }
      if (prev.length < maxPapers) {
        return [...prev, paperId];
      }
      return prev;
    });
  };

  const handleConfirm = () => {
    if (selectedPapers.length > 0) {
      onConfirm(selectedPapers);
    }
  };

  // Group papers by series
  const papersByState = ['Series 1', 'Series 2', 'Series 3'];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card rounded-xl shadow-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Select Papers</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose {maxPapers} papers from {AVAILABLE_PAPERS.length} available options for your {planName}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Papers List - Grouped by Series */}
          <div className="p-4 space-y-6">
            {papersByState.map((seriesName) => (
              <div key={seriesName}>
                <h4 className="font-semibold text-foreground mb-3 pb-2 border-b border-border">{seriesName}</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {AVAILABLE_PAPERS.filter(p => p.series === seriesName).map((paper) => {
                    const isSelected = selectedPapers.includes(paper.id);
                    const isDisabled = !isSelected && selectedPapers.length >= maxPapers;

                    return (
                      <button
                        key={paper.id}
                        onClick={() => !isDisabled && togglePaper(paper.id)}
                        disabled={isDisabled}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'bg-primary/10 border-primary/50'
                            : isDisabled
                              ? 'bg-muted/50 border-border/50 opacity-50 cursor-not-allowed'
                              : 'bg-secondary/30 border-border hover:border-primary/30 hover:bg-secondary/50'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="text-primary" size={20} />
                          ) : (
                            <Circle className="text-muted-foreground" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{paper.subject}</p>
                          <p className="text-xs text-muted-foreground">{paper.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedPapers.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : `Confirm (${selectedPapers.length}/${maxPapers})`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
