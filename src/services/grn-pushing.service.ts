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
      // Normalise field names to PascalCase and drop rows that have no DocEntry
      // (some stored procs return summary/blank rows at the end)
      const rows = (res?.data || [])
        .map((r: any) => this.normaliseRow(r))
        .filter((r: any) => r.DocEntry !== null && r.DocEntry !== undefined && r.DocEntry !== '');
      this.grnList.set(rows);
      return res;
    } catch (err) {
      this.grnList.set([]);
      throw err;
    } finally {
      this.isListLoading.set(false);
    }
  }

  // Ensures every row has PascalCase keys regardless of what SQL returns
  private normaliseRow(r: any): any {
    return {
      DocEntry:  r.DocEntry  ?? r.docEntry  ?? r.DOCENTRY  ?? null,
      DocNum:    r.DocNum    ?? r.docNum    ?? r.DOCNUM    ?? '',
      PartyName: r.PartyName ?? r.partyName ?? r.PARTYNAME ?? '',
      Type:      r.Type      ?? r.type      ?? r.TYPE      ?? r.Process ?? r.process ?? '',
      Station:   r.Station   ?? r.station   ?? r.STATION   ?? '',
      Floor:     r.Floor     ?? r.floor     ?? r.FLOOR     ?? '',
      ReqDate:   r.ReqDate   ?? r.reqDate   ?? r.REQDATE   ?? r.ReqDate ?? null,
      Status:    r.Status    ?? r.status    ?? r.STATUS    ?? '',
      // keep original so nothing is lost
      ...r
    };
  }

  async fetchGrnDetails(docEntry: any, type = 'Binning', process = 'GRPO', status = 'Pending'): Promise<any> {
    return this.http.post(`${this.api}/getGRNPushingDetails`, { docEntry, type, process, status }).toPromise();
  }

  async pushGrnTransaction(payload: { docEntry: any; type: string; process: string; status: string }): Promise<any> {
    return this.http.post(`${this.api}/createGRNPushingTransaction`, payload).toPromise();
  }
}
