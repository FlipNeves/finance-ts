import { BadRequestException, Injectable } from '@nestjs/common';

export interface PdfTextItem {
  str: string;
  x: number; // left edge
  y: number; // baseline; larger y = higher on the page
  page: number;
}

/**
 * Extracts positioned text from a PDF. The parser needs x/y coordinates because
 * statement columns are aligned by offset, not delimiters.
 *
 * pdfjs-dist v6 is ESM-only, so it is loaded via dynamic import() (preserved by
 * `module: nodenext`) from this CommonJS-compiled service.
 */
@Injectable()
export class PdfTextExtractorService {
  private readonly maxPages = 60;
  private pdfjsPromise: Promise<any> | null = null;

  private loadPdfjs(): Promise<any> {
    if (!this.pdfjsPromise) {
      this.pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return this.pdfjsPromise;
  }

  async extract(buffer: Buffer): Promise<PdfTextItem[]> {
    if (!this.isPdf(buffer)) {
      throw new BadRequestException('Uploaded file is not a valid PDF');
    }

    const pdfjs = await this.loadPdfjs();

    let doc: any;
    try {
      doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false, // harden against malicious PDFs
      }).promise;
    } catch {
      throw new BadRequestException(
        'Could not read the PDF — it may be corrupted or password-protected',
      );
    }

    try {
      if (doc.numPages > this.maxPages) {
        throw new BadRequestException(
          `PDF has too many pages (${doc.numPages}; limit is ${this.maxPages})`,
        );
      }

      const items: PdfTextItem[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        try {
          const content = await page.getTextContent();
          for (const it of content.items) {
            if (typeof it.str !== 'string' || it.str.trim().length === 0) {
              continue;
            }
            items.push({
              str: it.str,
              x: it.transform[4],
              y: it.transform[5],
              page: p,
            });
          }
        } finally {
          page.cleanup?.();
        }
      }
      return items;
    } finally {
      await doc.destroy?.();
    }
  }

  /** Every PDF starts with the magic bytes "%PDF-". */
  private isPdf(buffer: Buffer): boolean {
    return (
      !!buffer &&
      buffer.length > 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    );
  }
}
