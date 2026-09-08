import PDFDocument from 'pdfkit';
import type { JobCardDTO } from './jobcard.mapper';

/**
 * Streams a professional, print-friendly Job Card PDF using pdfkit (no headless
 * browser). A4, single accent colour, sectioned to mirror the on-screen detail.
 */
const ORANGE = '#f97316';
const INK = '#1a1a1a';
const MUTED = '#6b7280';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function streamJobCardPdf(jc: JobCardDTO, out: NodeJS.WritableStream): void {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `JobCard ${jc.jobCardNumber}` } });
  doc.pipe(out);

  // Header
  doc.fillColor(ORANGE).fontSize(22).text('JOBCARD', { continued: true });
  doc.fillColor(MUTED).fontSize(10).text(`   ${jc.jobCardNumber}`);
  doc.moveDown(0.2);
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text(`Job Card Date: ${fmtDate(jc.jobCardDate)}`);
  doc.moveTo(48, doc.y + 6).lineTo(547, doc.y + 6).strokeColor(ORANGE).lineWidth(2).stroke();
  doc.moveDown(1);

  const label = (t: string): void => {
    doc.fillColor(MUTED).fontSize(8).text(t.toUpperCase(), { characterSpacing: 0.5 });
  };
  const value = (t: string): void => {
    doc.fillColor(INK).fontSize(11).text(t || '—');
    doc.moveDown(0.4);
  };
  const section = (title: string): void => {
    doc.moveDown(0.6);
    doc.fillColor(ORANGE).fontSize(12).text(title);
    doc.moveTo(48, doc.y + 2).lineTo(547, doc.y + 2).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(0.5);
  };

  // Parties
  const colY = doc.y;
  doc.text('', 48, colY);
  label('Manufacturer');
  value(jc.manufacturer.name ?? '—');
  doc.text('', 310, colY);
  label('Jobber');
  value(jc.jobber.name ?? '—');
  doc.x = 48;

  section('Job Card Details');
  label('Short Number'); value(jc.shortNumber ?? '—');
  label('Short Name'); value(jc.shortName ?? '—');
  label('Program Date'); value(fmtDate(jc.programDate));
  label('Cutting Date'); value(fmtDate(jc.cuttingDate));

  section('Fabric');
  label('Type / Colour'); value(`${jc.fabric.fabricType ?? '—'}  /  ${jc.fabric.color ?? '—'}`);
  if (jc.fabric.description) { label('Description'); value(jc.fabric.description); }
  label('Pana / MTR / Average / PCS');
  value(
    `${jc.fabric.pana ?? '—'}  /  ${jc.fabric.mtr ?? '—'}  /  ${jc.fabric.average ?? '—'}  /  ${jc.fabric.pcs ?? '—'}`,
  );

  section('Size Quantities');
  if (jc.sizes.length === 0) {
    value('No sizes recorded');
  } else {
    doc.fillColor(INK).fontSize(10);
    const line = jc.sizes.map((s) => `${s.size}: ${s.quantity}`).join('     ');
    doc.text(line);
    doc.moveDown(0.3);
    doc.fillColor(MUTED).fontSize(9).text(`Total pieces: ${jc.totals.pieces}`);
  }

  section('Bale / Roll');
  if (jc.bales.length === 0) {
    value('No bales recorded');
  } else {
    doc.fillColor(INK).fontSize(10);
    jc.bales.forEach((b) => doc.text(`${b.label}: ${b.meters} m`));
    doc.moveDown(0.3);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .text(`Count: ${jc.totals.baleCount}     Total MTR: ${jc.totals.baleMtr}`);
  }

  section('Cutting');
  label('Pattern'); value(jc.cutting.pattern ?? '—');
  label('Marker L × W  /  Lay Length'); value(
    `${jc.cutting.markerLength ?? '—'} × ${jc.cutting.markerWidth ?? '—'}   /   ${jc.cutting.layLength ?? '—'}`,
  );
  label('Layers / Plies'); value(`${jc.cutting.layers ?? '—'} / ${jc.cutting.plies ?? '—'}`);

  section('Notes');
  value(jc.notes ?? '—');

  section('Status');
  label('Work Status'); value(jc.workStatus.replace(/_/g, ' '));
  label('Dispatch Status'); value(jc.dispatchStatus.replace(/_/g, ' '));

  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Generated ${new Date().toLocaleString('en-GB')}  ·  JOBCARD`, 48, 800, {
      align: 'center',
      width: 499,
    });

  doc.end();
}
