import { canvasToBlob } from "@/lib/document/canvas";

/**
 * Monta o PDF diretamente das páginas JPEG, sem biblioteca externa.
 * Cada página vira uma imagem DCTDecode (JPEG) dentro do arquivo.
 */
export async function buildPDF(pages: HTMLCanvasElement[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  let length = 0;
  const offsets: number[] = [];

  const push = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    parts.push(bytes as BlobPart);
    length += bytes.length;
  };

  const pageCount = pages.length;
  const kids: string[] = [];
  for (let i = 0; i < pageCount; i++) kids.push(`${3 + i * 3} 0 R`);

  const jpegs: Uint8Array[] = [];
  for (const canvas of pages) {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    jpegs.push(new Uint8Array(await blob.arrayBuffer()));
  }

  const pdfWidth = 595.28;
  const pdfHeight = 841.89;

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const obj = (n: number, body: string | (string | Uint8Array)[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    if (Array.isArray(body)) body.forEach(push);
    else push(body);
    push("\nendobj\n");
  };

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i++) {
    const pageN = 3 + i * 3;
    const contentN = pageN + 1;
    const imageN = pageN + 2;
    obj(
      pageN,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth} ${pdfHeight}] /Resources << /XObject << /Im${i} ${imageN} 0 R >> >> /Contents ${contentN} 0 R >>`,
    );
    const content = `q ${pdfWidth} 0 0 ${pdfHeight} 0 0 cm /Im${i} Do Q`;
    obj(contentN, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const canvas = pages[i];
    obj(imageN, [
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegs[i].length} >>\nstream\n`,
      jpegs[i],
      "\nendstream",
    ]);
  }

  const objectCount = 3 + pageCount * 3;
  const xrefOffset = length;
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let n = 1; n < objectCount; n++) {
    xref += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objectCount} /Root 1 0 R /Info << /Producer (J&M System) >> >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(parts, { type: "application/pdf" });
}
