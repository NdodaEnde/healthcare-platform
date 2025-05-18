"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, File } from "lucide-react";

import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DropzoneProps {
  className?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
  onFilesAdded?: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export function Dropzone({
  className,
  value = [],
  onChange,
  onFilesAdded,
  disabled = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
}: DropzoneProps) {
  const [files, setFiles] = useState<File[]>(value || []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      setFiles(newFiles);
      onChange?.(newFiles);
      onFilesAdded?.(acceptedFiles);
    },
    [files, maxFiles, onChange, onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    maxFiles,
    maxSize,
    accept,
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onChange?.(newFiles);
  };

  return (
    <div className={cn("grid gap-6", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-1 text-sm">
          <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
          <div className="text-muted-foreground">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-muted-foreground">
            PDF, JPG, PNG, WEBP (max {maxFiles} files, up to {formatBytes(maxSize)} each)
          </div>
        </div>
      </div>
      {files.length > 0 && (
        <div className="grid gap-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <File className="h-10 w-10 shrink-0 text-muted-foreground" />
                <div className="grid gap-1 overflow-hidden">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="opacity-70 hover:opacity-100"
                onClick={() => removeFile(i)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}