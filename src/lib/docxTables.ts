import type { TextTables } from './form3Import';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const MAX_DOCX_BYTES = 5 * 1024 * 1024;

const kids = (el: Element, name: string): Element[] =>
  Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === name && (n as Element).namespaceURI === W);

function textOf(el: Element): string {
  let out = '';
  const walk = (n: Node) => {
    if (n.nodeType === 1) {
      const e = n as Element;
      if (e.namespaceURI === W) {
        if (e.localName === 't') out += e.textContent ?? '';
        else if (e.localName === 'tab') out += ' ';
        else if (e.localName === 'br') out += '\n';
      }
      e.childNodes.forEach(walk);
      if (e.namespaceURI === W && e.localName === 'p') out += '\n';
    }
  };
  walk(el);
  return out.replace(/\n{2,}/g, '\n').trim();
}

/** Reads every top-level table of a .docx file as rows of plain-text cells. Runs in the browser; the file never leaves it. */
export async function readDocxTables(buffer: ArrayBuffer): Promise<TextTables> {
  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('This file is not a Word (.docx) file.');
  }
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('This file is not a Word (.docx) file.');
  const xml = await file.async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This Word file could not be read.');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('This Word file could not be read.');
  return kids(body, 'tbl').map((tbl) => kids(tbl, 'tr').map((tr) => kids(tr, 'tc').map(textOf)));
}
