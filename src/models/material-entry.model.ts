export type DocType = 'ST' | 'JO' | 'PO'| 'MDC';
export type EntryStatus = 'Pending' | 'Approved' | 'Dispatched' | 'Received';


export interface LineItem {
  ItemSize: any;
  ItemColor: any;
  ItemSlive: any;
  id: number;
  itemCode: string;
  itemName: string;
  quantity: number;

  pendingQty: number;     // From backend API
  dispatchQty: number; 
}

export interface MaterialEntry {
  id: number;
  EntryId: bigint;
  Type: DocType;
  DocNum: string;
  DocDate: string;
  PartyCode: string;
  PartyName: string;
  ExpectedReceiveDate: string | null;
  WarehouseAddress: string | null;
  lineItems: LineItem[];
  TotalQuantity: number;
  Status: EntryStatus;
  GateInwardDate?: string;
  AuthorizedBy?: string;
}

export interface DocumentDetails {
  docNumber: string;
  partyCode: string;
  partyName: string;
  lineItems: Omit<LineItem, 'id'>[];
}