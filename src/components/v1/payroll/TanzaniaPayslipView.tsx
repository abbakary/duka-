import React from 'react';
import type { TanzaniaPayslipModel } from '@/lib/tanzaniaPayslipModel';

export const TZ_PAYSLIP_STYLES = `
  .tz-pay-root{font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2d2a;}
  .tz-pay-sheet{position:relative;width:100%;max-width:900px;background:#fffdf8;border:1px solid #e4dcc8;padding:14px;box-shadow:0 18px 45px rgba(31,45,42,0.12);border-radius:3px;margin:0 auto;}
  .tz-pay-frame{border:2.5px solid #1f2d2a;padding:44px 48px 36px;position:relative;overflow:hidden;}
  .tz-pay-corner{position:absolute;width:90px;height:90px;z-index:2;}
  .tz-pay-corner svg{width:100%;height:100%;display:block;}
  .tz-pay-corner.tl{top:-2px;left:-2px;}
  .tz-pay-corner.br{bottom:-2px;right:-2px;transform:rotate(180deg);}
  .tz-pay-brand{display:flex;align-items:center;gap:16px;margin-bottom:26px;}
  .tz-pay-logo{width:56px;height:56px;background:#0f3d3e;border-radius:6px;display:flex;align-items:flex-end;justify-content:center;gap:4px;padding:10px 9px 8px;flex-shrink:0;}
  .tz-pay-logo span{width:6px;display:block;border-radius:0.5px;}
  .tz-pay-logo span:nth-child(1){height:14px;background:#d1a13a;}
  .tz-pay-logo span:nth-child(2){height:24px;background:#d9722b;}
  .tz-pay-logo span:nth-child(3){height:17px;background:#d1a13a;}
  .tz-pay-logo span:nth-child(4){height:30px;background:#fff;}
  .tz-pay-brand-name{font-size:26px;font-weight:700;letter-spacing:0.5px;}
  .tz-pay-brand-sub{font-size:13.5px;color:#7c7565;margin-top:2px;}
  .tz-pay-title-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #1f2d2a;padding-bottom:18px;margin-bottom:26px;flex-wrap:wrap;gap:10px;}
  .tz-pay-title{font-size:38px;font-weight:800;}
  .tz-pay-meta{text-align:right;}
  .tz-pay-month{color:#d97a2b;font-size:19px;font-weight:700;}
  .tz-pay-sub{color:#7c7565;font-size:13px;margin-top:4px;}
  .tz-pay-info{display:grid;grid-template-columns:1fr 1fr;gap:0 40px;margin-bottom:30px;}
  .tz-pay-info-item{border-bottom:1.5px dotted #b9ae92;padding:10px 0;}
  .tz-pay-label{color:#7c7565;font-size:13.5px;margin-bottom:4px;}
  .tz-pay-value{font-size:16.5px;font-weight:700;}
  .tz-pay-section{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;margin:30px 0 8px;}
  .tz-pay-bar{width:5px;height:18px;display:inline-block;}
  .tz-pay-bar.teal{background:#0f3d3e;}
  .tz-pay-bar.orange{background:#d97a2b;}
  .tz-pay-row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #e4dcc8;font-size:15.5px;}
  .tz-pay-row .amt{font-variant-numeric:tabular-nums;}
  .tz-pay-row.total{border-bottom:none;border-top:2px solid #1f2d2a;font-weight:700;font-size:17px;padding-top:14px;margin-top:2px;}
  .tz-pay-row.total .amt{color:#0f3d3e;}
  .tz-pay-row .amt.neg{color:#b5482f;}
  .tz-pay-row.dim{color:#7c7565;font-style:italic;}
  .tz-pay-net{background:#0f3d3e;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:22px 26px;margin:26px 0 0;border-radius:2px;}
  .tz-pay-net .label{font-size:17px;}
  .tz-pay-net .value{font-size:30px;font-weight:800;color:#e3b45e;}
  .tz-pay-paidby{background:#fbeae2;border:1px solid #f0d4c6;padding:14px 20px;margin-top:16px;font-size:14.5px;}
  .tz-pay-footer{display:grid;grid-template-columns:1fr 1fr;gap:14px 40px;margin-top:22px;font-size:14.5px;line-height:1.55;}
  .tz-pay-sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:56px;gap:20px;}
  .tz-pay-sig-line{border-top:1.3px solid #1f2d2a;width:280px;padding-top:8px;font-size:14px;position:relative;min-height:64px;}
  .tz-pay-sig-line img{position:absolute;left:0;top:-48px;max-height:56px;max-width:260px;object-fit:contain;pointer-events:none;}
  .tz-pay-seal{width:112px;height:112px;flex-shrink:0;}
  .tz-pay-fine{margin-top:26px;padding-top:14px;border-top:1px dotted #e4dcc8;font-size:12.5px;color:#7c7565;line-height:1.6;}
  @media (max-width:600px){
    .tz-pay-frame{padding:30px 20px 26px;}
    .tz-pay-title{font-size:28px;}
    .tz-pay-info{grid-template-columns:1fr;}
    .tz-pay-footer{grid-template-columns:1fr;}
    .tz-pay-net{flex-direction:column;align-items:flex-start;gap:8px;}
    .tz-pay-sig{flex-direction:column;align-items:flex-start;}
  }
  @media print{
    body{background:#fff!important;}
    .tz-pay-sheet{box-shadow:none;border:none;max-width:100%;}
  }
`;

const CORNER = (
  <svg viewBox="0 0 90 90">
    <g>
      <polygon points="0,0 12,0 0,12" fill="#0f3d3e" />
      <polygon points="12,0 24,0 0,24 0,12" fill="#d97a2b" />
      <polygon points="24,0 36,0 0,36 0,24" fill="#0f3d3e" />
      <polygon points="36,0 48,0 0,48 0,36" fill="#d97a2b" />
      <polygon points="48,0 60,0 0,60 0,48" fill="#0f3d3e" />
      <polygon points="60,0 72,0 0,72 0,60" fill="#d97a2b" />
      <polygon points="72,0 84,0 0,84 0,72" fill="#0f3d3e" />
      <polygon points="84,0 90,0 90,6 0,90 0,84" fill="#d97a2b" />
    </g>
  </svg>
);

function Seal({ ringText, brandShort }: { ringText: string; brandShort: string }) {
  const lines = brandShort.split(/\s+/).filter(Boolean);
  const mid = lines.length >= 2 ? [lines[0], lines.slice(1).join(' ')] : [brandShort, ''];
  return (
    <svg className="tz-pay-seal" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="ringPathTop" d="M 100,100 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0f3d3e" strokeWidth="2" strokeDasharray="8 6" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="#d97a2b" strokeWidth="2" strokeDasharray="8 6" strokeDashoffset="7" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#0f3d3e" strokeWidth="1" />
      <text fontSize="12.5" letterSpacing="1.5" fill="#12504f" fontWeight="700">
        <textPath href="#ringPathTop" startOffset="0%">
          {ringText}
        </textPath>
      </text>
      <text x="100" y="96" textAnchor="middle" fontSize="17" fontWeight="800" fill="#1f2d2a">
        {mid[0]}
      </text>
      <text x="100" y="116" textAnchor="middle" fontSize="17" fontWeight="800" fill="#1f2d2a">
        {mid[1]}
      </text>
    </svg>
  );
}

interface Props {
  model: TanzaniaPayslipModel;
  printRootId?: string;
  className?: string;
}

export const TanzaniaPayslipView: React.FC<Props> = ({ model, printRootId = 'tz-payslip-print-root', className = '' }) => {
  return (
    <div id={printRootId} className={`tz-pay-root ${className}`}>
      <style>{TZ_PAYSLIP_STYLES}</style>
      <div className="tz-pay-sheet">
        <div className="tz-pay-frame">
          <div className="tz-pay-corner tl">{CORNER}</div>
          <div className="tz-pay-corner br">{CORNER}</div>

          <div className="tz-pay-brand">
            <div className="tz-pay-logo">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <div className="tz-pay-brand-name">{model.brandShort}</div>
              <div className="tz-pay-brand-sub">{model.brandSubline}</div>
            </div>
          </div>

          <div className="tz-pay-title-row">
            <div className="tz-pay-title">Payslip</div>
            <div className="tz-pay-meta">
              <div className="tz-pay-month">{model.periodLabel}</div>
              <div className="tz-pay-sub">
                Payslip no. {model.payslipNo} · {model.payDateLabel}
              </div>
            </div>
          </div>

          <div className="tz-pay-info">
            {[
              ['Employee', model.employeeName],
              ['NSSF no.', model.nssfNo],
              ['Position', model.position],
              ['Bank', model.bankLine],
              ['Department', model.department],
              ['Account', model.accountNo],
              ['TIN', model.tin],
              ['Pay basis', model.payBasis],
            ].map(([l, v]) => (
              <div key={l} className="tz-pay-info-item">
                <div className="tz-pay-label">{l}</div>
                <div className="tz-pay-value">{v}</div>
              </div>
            ))}
          </div>

          <div className="tz-pay-section">
            <span className="tz-pay-bar teal" />
            Earnings
          </div>
          <div className="tz-pay-row">
            <span>Basic salary</span>
            <span className="amt">{model.basic}</span>
          </div>
          <div className="tz-pay-row">
            <span>Housing allowance</span>
            <span className="amt">{model.housing}</span>
          </div>
          <div className="tz-pay-row">
            <span>Transport allowance</span>
            <span className="amt">{model.transport}</span>
          </div>
          <div className="tz-pay-row total">
            <span>Gross salary</span>
            <span className="amt">{model.gross}</span>
          </div>

          <div className="tz-pay-section">
            <span className="tz-pay-bar orange" />
            Statutory deductions
          </div>
          <div className="tz-pay-row">
            <span>NSSF, employee share — 10% of gross</span>
            <span className="amt neg">{model.nssfDeduction}</span>
          </div>
          <div className="tz-pay-row">
            <span>PAYE — on taxable pay of {model.payeTaxableNote}</span>
            <span className="amt neg">{model.payeDeduction}</span>
          </div>
          <div className="tz-pay-row">
            <span>NHIF / UHI, employee share — 3% of basic</span>
            <span className="amt neg">{model.nhifDeduction}</span>
          </div>
          <div className={`tz-pay-row ${model.heslbDim ? 'dim' : ''}`}>
            <span>{model.heslbLabel}</span>
            <span className="amt">{model.heslbAmount}</span>
          </div>
          <div className="tz-pay-row total">
            <span>Total deductions</span>
            <span className="amt">{model.totalDeductions}</span>
          </div>

          <div className="tz-pay-net">
            <span className="label">Net pay</span>
            <span className="value">{model.netPay}</span>
          </div>

          <div className="tz-pay-paidby">
            <div>{model.paidByLine}</div>
            <div>{model.valueDateLine}</div>
          </div>

          <div className="tz-pay-footer">
            <p>
              <strong>Employer</strong> {model.employerLegal}
            </p>
            <p>
              <strong>Employer TIN</strong> {model.employerTin}
            </p>
            <p>
              <strong>Employer NSSF no.</strong> <span style={{ color: '#7c7565' }}>{model.employerNssf}</span>
            </p>
            <p>
              <strong>Employer cost this period</strong> {model.employerCostLine}
            </p>
          </div>

          <div className="tz-pay-sig">
            <div className="tz-pay-sig-line">
              {model.signatureDataUrl ? (
                <img src={model.signatureDataUrl} alt="" />
              ) : null}
              Authorised signature, {model.employerLegal.replace(/\s+Ltd\.?$/i, '')}
            </div>
            <Seal ringText={model.sealRingText} brandShort={model.brandShort} />
          </div>

          <div className="tz-pay-fine">{model.finePrint}</div>
        </div>
      </div>
    </div>
  );
};

export function printTanzaniaPayslipElement(rootId: string): void {
  const node = document.getElementById(rootId);
  if (!node) {
    window.print();
    return;
  }
  const w = window.open('', '_blank', 'width=920,height=1100');
  if (!w) {
    window.print();
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>body{margin:0;padding:24px;background:#faf5ea;}${TZ_PAYSLIP_STYLES}</style></head><body>`);
  w.document.write(node.outerHTML);
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  window.setTimeout(() => {
    w.print();
  }, 400);
}
