"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";

type UploadBoxProps = {
  files: File[];
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/bmp";

function mergeFiles(current: File[], incoming: File[]) {
  const map = new Map<string, File>();
  [...current, ...incoming].forEach((file) => {
    map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
  });
  return Array.from(map.values());
}

export default function UploadBox({ files, disabled, onFilesChange }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) {
      return;
    }
    const images = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    onFilesChange(mergeFiles(files, images));
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (target: File) => {
    onFilesChange(files.filter((file) => file !== target));
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div
        className={[
          "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-8 text-center transition",
          isDragging ? "border-handong bg-blue-50" : "border-slate-300 bg-slate-50",
          disabled ? "cursor-not-allowed opacity-70" : "hover:border-handong hover:bg-blue-50",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleInput}
          disabled={disabled}
        />
        <UploadCloud className="mb-3 h-10 w-10 text-handong" aria-hidden />
        <p className="text-lg font-semibold text-ink">사진 여러 장 업로드</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          JPG, PNG, WEBP, BMP 이미지를 선택하면 미리보기를 확인한 뒤 평가할 수 있습니다.
          이미지당 최대 10MB까지 처리합니다.
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ImagePlus className="h-4 w-4 text-leaf" aria-hidden />
              선택된 사진 {files.length}장
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-coral hover:text-coral disabled:opacity-50"
              onClick={() => onFilesChange([])}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              전체 삭제
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {previews.map((preview) => (
              <div
                key={`${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1 text-xs font-medium text-white">
                  <p className="truncate">{preview.file.name}</p>
                </div>
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 opacity-0 shadow transition hover:text-coral group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFile(preview.file);
                  }}
                  disabled={disabled}
                  aria-label={`${preview.file.name} 삭제`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
