"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useResizeObserver } from "@mantine/hooks";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Highlight {
  page: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  color?: string;
}

interface PdfViewerProps {
  fileUrl: string;
  highlights?: Highlight[];
  onPageRendered?: (pageNumber: number, totalPages: number) => void;
}

export function PdfViewer({ fileUrl, highlights = [], onPageRendered }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [resizeRef, rect] = useResizeObserver();

  useEffect(() => {
    if (rect?.width) {
      setContainerWidth(rect.width);
    }
  }, [rect]);

  // Update page dimensions when the page is rendered
  useEffect(() => {
    if (pageRef.current) {
      const { height, width } = pageRef.current.getBoundingClientRect();
      setPageHeight(height);
      setPageWidth(width);
    }
  }, [pageNumber, scale, rotation, containerWidth]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (onPageRendered) {
      onPageRendered(pageNumber, numPages);
    }
  }

  function onPageChange(offset: number) {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= (numPages || 1)) {
      setPageNumber(newPageNumber);
      if (onPageRendered) {
        onPageRendered(newPageNumber, numPages || 0);
      }
    }
  }

  function changeZoom(delta: number) {
    setScale(prevScale => {
      const newScale = prevScale + delta;
      return Math.max(0.5, Math.min(newScale, 3.0)); // Limit scale between 0.5 and 3.0
    });
  }

  function rotateDocument() {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }

  return (
    <Card className="w-full h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(-1)} 
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            Page {pageNumber} of {numPages || "?"}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(1)} 
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => changeZoom(-0.1)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => changeZoom(0.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotateDocument}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent 
        className="p-0 overflow-auto bg-muted/20" 
        ref={(el) => {
          containerRef.current = el;
          resizeRef(el);
        }}
      >
        <div className="flex justify-center p-4">
          <div className="relative" ref={pageRef}>
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-[600px]">
                  <div className="animate-pulse text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-destructive">
                    Error loading PDF. Please try again later.
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                width={containerWidth ? containerWidth - 50 : undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              
              {/* Render highlights */}
              {pageHeight && pageWidth && highlights
                .filter(h => h.page === pageNumber)
                .map((highlight, index) => (
                  <div
                    key={index}
                    className="absolute border-2 border-yellow-400 bg-yellow-200 bg-opacity-30 pointer-events-none"
                    style={{
                      left: `${highlight.left * pageWidth}px`,
                      top: `${highlight.top * pageHeight}px`,
                      width: `${(highlight.right - highlight.left) * pageWidth}px`,
                      height: `${(highlight.bottom - highlight.top) * pageHeight}px`,
                      borderColor: highlight.color || '#FFDC00',
                      backgroundColor: highlight.color ? `${highlight.color}33` : 'rgba(255, 220, 0, 0.2)'
                    }}
                  />
                ))}
            </Document>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}