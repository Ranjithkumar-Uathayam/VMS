import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class GrnPushingService {
  private api = environment.apiUrl + '/ERP';

  grnList = signal<any[]>([]);
  isListLoading = signal(false);

  constructor(private http: HttpClient) {}

  async fetchGrnList(type = 'Binning'): Promise<any> {
    this.isListLoading.set(true);
    try {
      const res: any = await this.http.post(`${this.api}/getGRNPushingList`, { type }).toPromise();

      const rows = (res?.data || [])
        .map((r: any) => this.normaliseRow(r))
        // Keep only valid header-level rows that have both DocEntry and DocNum
        .filter((r: any) => {
          const hasEntry = r.DocEntry !== null && r.DocEntry !== undefined && String(r.DocEntry).trim() !== '';
          const hasDocNum = r.DocNum !== null && r.DocNum !== undefined && String(r.DocNum).trim() !== '';
          return hasEntry && hasDocNum;
        });

      this.grnList.set(rows);
      return res;
    } catch (err) {
      this.grnList.set([]);
      throw err;
    } finally {
      this.isListLoading.set(false);
    }
  }

  // BUG FIX: ...r must come FIRST so the explicit PascalCase keys below override
  // original null/undefined values from the raw SQL row.
  private normaliseRow(r: any): any {
    return {
      ...r,                                                                           // ← spread FIRST
      DocEntry:  r.DocEntry   ?? r.docEntry   ?? r.DOCENTRY   ?? null,              // ← then override
      DocNum:    r.DocNum     ?? r.docNum     ?? r.DOCNUM     ?? '',
      PartyName: r.PartyName  ?? r.partyName  ?? r.PARTYNAME  ?? r.CardName ?? r.cardName ?? '',
      Type:      r.Type       ?? r.type       ?? r.TYPE       ?? r.Process  ?? r.process ?? '',
      Station:   r.Station    ?? r.station    ?? r.STATION    ?? '',
      Floor:     r.Floor      ?? r.floor      ?? r.FLOOR      ?? '',
      ReqDate:   r.ReqDate    ?? r.reqDate    ?? r.REQDATE    ?? null,
      Status:    r.Status     ?? r.status     ?? r.STATUS     ?? '',
      Quantity:  Number(r.Quantity ?? r.quantity ?? r.OrderQty ?? r.orderQty
                        ?? r.TotalQty ?? r.totalQty ?? r.Qty ?? r.qty ?? 0),
    };
  }

  async fetchGrnDetails(docEntry: any, type = 'Binning', process = 'GRPO', status = 'Pending'): Promise<any> {
    return this.http.post(`${this.api}/getGRNPushingDetails`, { docEntry, type, process, status }).toPromise();
  }

  async pushGrnTransaction(payload: { docEntry: any; type: string; process: string; status: string }): Promise<any> {
    return this.http.post(`${this.api}/createGRNPushingTransaction`, payload).toPromise();
  }
}
