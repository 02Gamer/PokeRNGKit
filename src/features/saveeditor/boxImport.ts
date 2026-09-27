export interface BoxImportTicket {
  token: string;
  summary: {
    deleted: number;
    written: number;
    overwritten: number;
    outcomes: { source: number; box: number; slot: number; status: string }[];
  };
  sources: { file: number; entry: number }[];
  files: { file: number; path: string; status: string; entities: number }[];
}
export interface BoxImportConfirmation {
  token: string;
  allowClear: boolean;
  allowOverwrite: boolean;
  allowSkipped: boolean;
}
