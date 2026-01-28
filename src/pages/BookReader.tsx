import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { booksAPI, enrollmentsAPI, filesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, Award, Users } from "lucide-react";

// BookDocument component for displaying documents inline
const BookDocument = ({ src, bookId, title, isVisible }: { src: string; bookId?: string; title: string; isVisible: boolean }) => {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await filesAPI.getViewUrl(src, { bookId });
        if (mounted) setDocUrl((res?.url || null) + '#toolbar=0');
      } catch (e) {
        console.error('document load error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [src, bookId, isVisible]);

  useEffect(() => {
    if (docUrl && iframeRef.current) {
      iframeRef.current.onload = () => {
        if (iframeRef.current?.contentDocument) {
          iframeRef.current.contentDocument.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toast.error('Right-click is disabled to protect content');
          });
          iframeRef.current.contentDocument.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'v' || e.key === 'w' || e.key === 'n' || e.key === 't' || e.key === 'r' || e.key === 'o' || e.key === 'i' || e.key === 'j' || e.key === 'k' || e.key === 'l')) {
              e.preventDefault();
              toast.error('This action is disabled to protect content');
            }
            if (e.key === 'F12' || e.key === 'PrintScreen' || e.key === 'Snapshot') {
              e.preventDefault();
              toast.error('This action is disabled to protect content');
            }
            if (e.altKey && (e.key === 'PrintScreen' || e.key === 'Snapshot')) {
              e.preventDefault();
              toast.error('This action is disabled to protect content');
            }
          });
        }
      };
    }
  }, [docUrl]);

  if (!isVisible) return null;
  if (loading) return <div className="w-full h-full flex items-center justify-center"><Skeleton className="h-12 w-full"/></div>;
  if (!docUrl) return <div className="text-center text-muted-foreground">Unable to load document.</div>;
  return (
    <div className="w-full h-full relative">
      <iframe
        ref={iframeRef}
        src={docUrl}
        title={title}
        className="w-full h-full border-0"
        onContextMenu={(e) => {
          e.preventDefault();
          toast.error('Right-click is disabled to protect content');
        }}
      />
      {/* Transparent overlay to allow scrolling while preventing other interactions */}
      <div
        className="absolute inset-0 bg-transparent"
        style={{
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
    </div>
  );
};

const BookReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [selectedPdfData, setSelectedPdfData] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Check enrollment first
        let enrollment = null;
        try {
          const check: any = await enrollmentsAPI.checkEnrollment({ bookId: id });
          enrollment = check?.enrollment || null;
          setEnrolled(!!enrollment);
        } catch (err) {
          enrollment = null;
          setEnrolled(false);
        }

        if (enrollment && enrollment._id) {
          try {
            const fullEnroll: any = await enrollmentsAPI.getById(enrollment._id);
            setBook(fullEnroll.bookId || null);
          } catch (err) {
            console.error('Failed to load enrollment details, falling back to public book', err);
            const res: any = await booksAPI.getById(id);
            setBook(res.book || res);
          }
        } else {
          const res: any = await booksAPI.getById(id);
          setBook(res.book || res);
        }
      } catch (err) {
        console.error('Failed to fetch book', err);
        toast.error('Failed to load book');
        setBook(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  const fetchPreview = async () => {
    if (!book) return;
    const fileOrUrl = book.fileUrl || book.fileId;
    if (!fileOrUrl) return;
    try {
      setLoadingPreview(true);
      const res: any = await filesAPI.getViewUrl(fileOrUrl, { bookId: id });
      setProxiedUrl(res.url || null);
    } catch (e: any) {
      console.error('book view token error', e);
      const msg = e?.message || (e && e.message) || JSON.stringify(e);
      toast.error('Failed to load book preview: ' + msg);
      setProxiedUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [book, id]);

  // Global event handlers for PDF dialog content protection
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPdfDialogOpen) return;

    // Disable common save/print shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'v' || e.key === 'w' || e.key === 'n' || e.key === 't' || e.key === 'r' || e.key === 'o' || e.key === 'i' || e.key === 'j' || e.key === 'k' || e.key === 'l')) {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable F12 (developer tools)
    if (e.key === 'F12') {
      e.preventDefault();
      toast.error('Developer tools are disabled to protect content');
    }
    // Disable Print Screen and screenshot shortcuts
    if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable Windows screenshot shortcuts (Win + PrintScreen, Win + Shift + S)
    if ((e.metaKey || e.key === 'Meta') && (e.key === 'PrintScreen' || e.key === 'Snapshot' || (e.shiftKey && e.key === 's'))) {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable Alt + PrintScreen
    if (e.altKey && (e.key === 'PrintScreen' || e.key === 'Snapshot')) {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable screen recording shortcuts (Win + Alt + R for Game Bar)
    if (e.altKey && e.metaKey && e.key === 'r') {
      e.preventDefault();
      toast.error('Screen recording is disabled to protect content');
    }
    // Disable other function keys that might be used for debugging
    if (e.key.startsWith('F') && e.key !== 'F5' && e.key !== 'F11') {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable Alt key combinations
    if (e.altKey && (e.key === 'F4' || e.key === 'Tab' || e.key === 'Escape')) {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable Windows key combinations
    if (e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
  }, [isPdfDialogOpen]);

  const handleGlobalContextMenu = useCallback((e: MouseEvent) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Right-click is disabled to protect content');
  }, [isPdfDialogOpen]);

  const handleGlobalMouseDown = useCallback((e: MouseEvent) => {
    if (!isPdfDialogOpen) return;
    // Allow left-click for scrolling, but prevent others
    if (e.button !== 0) {
      e.preventDefault();
      toast.error('Mouse interactions are disabled to protect content');
    }
  }, [isPdfDialogOpen]);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (!isPdfDialogOpen) return;
    if (e.button !== 0) {
      e.preventDefault();
    }
  }, [isPdfDialogOpen]);

  const handleGlobalClick = useCallback((e: MouseEvent) => {
    if (!isPdfDialogOpen) return;
    if (e.button !== 0) {
      e.preventDefault();
      toast.error('Mouse interactions are disabled to protect content');
    }
  }, [isPdfDialogOpen]);

  const handleGlobalDoubleClick = useCallback((e: MouseEvent) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Double-click is disabled to protect content');
  }, [isPdfDialogOpen]);

  const handleGlobalDragStart = useCallback((e: DragEvent) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Dragging is disabled to protect content');
  }, [isPdfDialogOpen]);

  const handleGlobalCopy = useCallback((e: ClipboardEvent) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Copying is disabled to protect content');
  }, [isPdfDialogOpen]);

  const handleGlobalPaste = useCallback((e: ClipboardEvent) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Pasting is disabled to protect content');
  }, [isPdfDialogOpen]);

  const handleGlobalSelectStart = useCallback((e: Event) => {
    if (!isPdfDialogOpen) return;
    e.preventDefault();
    toast.error('Text selection is disabled to protect content');
  }, [isPdfDialogOpen]);

  // Add global event listeners when PDF dialog is open
  useEffect(() => {
    if (isPdfDialogOpen) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      document.addEventListener('contextmenu', handleGlobalContextMenu);
      document.addEventListener('mousedown', handleGlobalMouseDown);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('dblclick', handleGlobalDoubleClick);
      document.addEventListener('dragstart', handleGlobalDragStart);
      document.addEventListener('copy', handleGlobalCopy);
      document.addEventListener('paste', handleGlobalPaste);
      document.addEventListener('selectstart', handleGlobalSelectStart);
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
        document.removeEventListener('contextmenu', handleGlobalContextMenu);
        document.removeEventListener('mousedown', handleGlobalMouseDown);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('click', handleGlobalClick);
        document.removeEventListener('dblclick', handleGlobalDoubleClick);
        document.removeEventListener('dragstart', handleGlobalDragStart);
        document.removeEventListener('copy', handleGlobalCopy);
        document.removeEventListener('paste', handleGlobalPaste);
        document.removeEventListener('selectstart', handleGlobalSelectStart);
      };
    }
  }, [isPdfDialogOpen, handleGlobalKeyDown, handleGlobalContextMenu, handleGlobalMouseDown, handleGlobalMouseUp, handleGlobalClick, handleGlobalDoubleClick, handleGlobalDragStart, handleGlobalCopy, handleGlobalPaste, handleGlobalSelectStart]);

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </Layout>
  );

  if (!book) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Book not found</h2>
          <p className="text-muted-foreground">We couldn't find this book. Please go back and try again.</p>
        </div>
      </Layout>
    );
  }

  if (!enrolled) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">You don't have access</h2>
          <p className="text-muted-foreground mb-6">Please purchase the book to read it online.</p>
          <div className="max-w-xs mx-auto">
            <Button onClick={() => navigate(`/books/${id}/enroll`)} className="w-full btn-primary">Purchase Book</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Content protection handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Right-click is disabled to protect content');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable common save/print shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable F12 (developer tools)
    if (e.key === 'F12') {
      e.preventDefault();
      toast.error('Developer tools are disabled to protect content');
    }
    // Disable Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable other function keys that might be used for debugging
    if (e.key.startsWith('F') && e.key !== 'F5' && e.key !== 'F11') {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    toast.error('Dragging is disabled to protect content');
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copying is disabled to protect content');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Pasting is disabled to protect content');
  };

  const handleSelectStart = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Text selection is disabled to protect content');
  };

  const handleFocus = (e: React.FocusEvent) => {
    // Prevent focus on elements that could be used for copying
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      e.preventDefault();
      toast.error('Input fields are disabled to protect content');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent zoom that might help with screenshots
    if (e.ctrlKey) {
      e.preventDefault();
      toast.error('Zoom is disabled to protect content');
    }
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // Prevent accidental navigation that might allow content copying
    e.preventDefault();
    e.returnValue = '';
  };

  return (
    <Layout>
      <div
        className="bg-background py-8"
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onDragStart={handleDragStart}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onSelectStart={handleSelectStart}
        onFocus={handleFocus}
        onWheel={handleWheel}
        onBeforeUnload={handleBeforeUnload}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserDrag: 'none',
          KhtmlUserDrag: 'none',
          MozUserDrag: 'none',
          OUserDrag: 'none',
          userDrag: 'none'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main area */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video bg-gradient-to-br from-primary to-navy rounded-xl overflow-hidden shadow-2xl mb-8">
                {book.thumbnail && (
                  <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div>
                    <p className="text-sm font-semibold opacity-80 mb-2">Book</p>
                    <h1 className="text-2xl md:text-3xl font-bold">{book.title}</h1>
                    <p className="text-sm mt-1">by {book.author || book.createdBy?.name || 'Unknown'}</p>
                  </div>
                </div>
              </div>



              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Reader</h2>

                <div className="mb-4">
                  <Button
                    onClick={async () => {
                      if (!proxiedUrl) {
                        await fetchPreview();
                      }
                      if (proxiedUrl) {
                        setSelectedPdfData({ src: book.fileUrl || book.fileId, title: book.title });
                        setIsPdfDialogOpen(true);
                      }
                    }}
                    className="btn-primary"
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? 'Loading...' : 'View Book'}
                  </Button>
                </div>

                {!book.fileUrl && !book.fileId && (
                  <div className="text-center text-muted-foreground py-12">No file available for this book.</div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4">About This Book</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Full-screen PDF Overlay */}
      {isPdfDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          onDragStart={handleDragStart}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onSelectStart={handleSelectStart}
          onFocus={handleFocus}
          onWheel={handleWheel}
          onBeforeUnload={handleBeforeUnload}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserDrag: 'none',
            KhtmlUserDrag: 'none',
            MozUserDrag: 'none',
            OUserDrag: 'none',
            userDrag: 'none'
          }}
        >
          {/* PDF content filling entire screen */}
          {selectedPdfData && (
            <BookDocument
              src={selectedPdfData.src}
              bookId={id}
              title={selectedPdfData.title}
              isVisible={isPdfDialogOpen}
            />
          )}
          {/* Close button overlay */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={() => setIsPdfDialogOpen(false)}
          >
            ✕
          </Button>
        </div>
      )}
    </Layout>
  );
};

export default BookReader;
