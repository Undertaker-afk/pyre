import { ParsedBinary, Hex } from "@/decompiler/types";

export function getStringAt(binary: ParsedBinary | null, addr: Hex, length: number): string {
  if (!binary) return "";

  for (const region of binary.regions) {
    if (addr >= region.vaddr && addr < region.vaddr + BigInt(region.bytes.length)) {
      const offset = Number(addr - region.vaddr);
      const slice = region.bytes.slice(offset, offset + length);
      // Decode as UTF-8, filtering non-printable chars for the UI
      return new TextDecoder().decode(slice).replace(/[^\x20-\x7E]/g, ".");
    }
  }
  return "";
}

export function getAllStrings(binary: ParsedBinary | null): { addr: Hex; content: string }[] {
  if (!binary) return [];
  return binary.strings.map(([addr, len]) => ({
    addr,
    content: getStringAt(binary, addr, len)
  }));
}
