import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, X } from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface DigitalSignatureModalProps {
  open: boolean;
  language: 'en' | 'sw';
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  open,
  language,
  title,
  subtitle,
  onClose,
  onSave,
}) => {
  const isSw = language === 'sw';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#1f2d2a';
  }, []);

  useEffect(() => {
    if (!open) return;
    setEmpty(true);
    requestAnimationFrame(resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [open, resizeCanvas]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    resizeCanvas();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || empty) return;
    onSave(canvas.toDataURL('image/png'));
    onClose();
  };

  return (
    <ModalPortal open={open} onClose={onClose} zClassName="z-[350]">
      <div className="bg-white rounded-2xl border border-[#dee2e6] shadow-2xl w-full max-w-lg p-5 text-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-[#323130] flex items-center gap-2">
              <PenLine className="w-4 h-4 text-[#714b67]" />
              {title ?? (isSw ? 'Saini ya kidijitali' : 'Digital signature')}
            </h3>
            <p className="text-xs text-[#605E5C] mt-1">
              {subtitle ??
                (isSw
                  ? 'Saini kwa kidole au kalamu ya skrini. Itaonekana kwenye slip za mshahara.'
                  : 'Sign with mouse, pen, or finger. Used on issued payslips.')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="rounded-xl border-2 border-dashed border-[#0f3d3e]/30 bg-[#faf5ea] overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full h-[160px] block cursor-crosshair bg-white/80"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            {isSw ? 'Futa' : 'Clear'}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer">
              {isSw ? 'Baadaye' : 'Later'}
            </button>
            <button
              type="button"
              disabled={empty}
              onClick={save}
              className="px-4 py-2 rounded-lg bg-[#0f3d3e] text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              {isSw ? 'Hifadhi saini' : 'Save signature'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
