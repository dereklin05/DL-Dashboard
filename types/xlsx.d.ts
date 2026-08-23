declare module 'xlsx/xlsx.mjs' {
  export type WorkBook = {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }

  export function read(
    data: ArrayBuffer,
    options?: { type?: string; cellDates?: boolean },
  ): WorkBook

  export const utils: {
    sheet_to_json<T>(sheet: unknown, options?: { defval?: unknown }): T[]
  }
}
