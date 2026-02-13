import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, Circle } from 'lucide-react';

interface Paper {
  id: string;
  name: string;
  series: string;
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
  { id: 's1_series1_fr', name: 'Series 1 - FR Paper', series: 'Series 1', subject: 'Financial Reporting' },
  { id: 's1_series1_afm', name: 'Series 1 - AFM Paper', series: 'Series 1', subject: 'Advanced Financial Management' },
  { id: 's1_series1_audit', name: 'Series 1 - Audit Paper', series: 'Series 1', subject: 'Auditing and Assurance' },
  { id: 's1_series1_dt', name: 'Series 1 - DT Paper', series: 'Series 1', subject: 'Direct Tax' },
  { id: 's1_series1_idt', name: 'Series 1 - IDT Paper', series: 'Series 1', subject: 'Indirect Tax' },
  
  // Series 2
  { id: 's1_series2_fr', name: 'Series 2 - FR Paper', series: 'Series 2', subject: 'Financial Reporting' },
  { id: 's1_series2_afm', name: 'Series 2 - AFM Paper', series: 'Series 2', subject: 'Advanced Financial Management' },
  { id: 's1_series2_audit', name: 'Series 2 - Audit Paper', series: 'Series 2', subject: 'Auditing and Assurance' },
  { id: 's1_series2_dt', name: 'Series 2 - DT Paper', series: 'Series 2', subject: 'Direct Tax' },
  { id: 's1_series2_idt', name: 'Series 2 - IDT Paper', series: 'Series 2', subject: 'Indirect Tax' },
  
  // Series 3
  { id: 's1_series3_fr', name: 'Series 3 - FR Paper', series: 'Series 3', subject: 'Financial Reporting' },
  { id: 's1_series3_afm', name: 'Series 3 - AFM Paper', series: 'Series 3', subject: 'Advanced Financial Management' },
  { id: 's1_series3_audit', name: 'Series 3 - Audit Paper', series: 'Series 3', subject: 'Auditing and Assurance' },
  { id: 's1_series3_dt', name: 'Series 3 - DT Paper', series: 'Series 3', subject: 'Direct Tax' },
  { id: 's1_series3_idt', name: 'Series 3 - IDT Paper', series: 'Series 3', subject: 'Indirect Tax' },
];

// Group papers by series
const PAPERS_BY_SERIES = {
  'Series 1': AVAILABLE_PAPERS.filter(p => p.series === 'Series 1'),
  'Series 2': AVAILABLE_PAPERS.filter(p => p.series === 'Series 2'),
  'Series 3': AVAILABLE_PAPERS.filter(p => p.series === 'Series 3'),
};

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
          className="bg-card rounded-xl shadow-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Select Test Papers</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose {maxPapers} papers from 3 series (5 subjects each) for your {planName}
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

          {/* Papers by Series */}
          <div className="p-6 space-y-6">
            {Object.entries(PAPERS_BY_SERIES).map(([seriesName, papers]) => (
              <div key={seriesName}>
                <h4 className="font-semibold text-foreground mb-3 pb-2 border-b border-border">{seriesName}</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {papers.map((paper) => {
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
                          <p className="font-medium text-foreground text-sm">{paper.name}</p>
                          <p className="text-xs text-muted-foreground">{paper.subject}</p>
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
