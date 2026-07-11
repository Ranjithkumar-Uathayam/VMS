import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class JoStatusService {
  private api    = environment.apiUrl + '/joStatus';
  private matApi = environment.apiUrl + '/material-transactions';

  joList        = signal<any[]>([]);
  isListLoading = signal(false);

  constructor(private http: HttpClient) {}

  async fetchJoList(): Promise<any> {
    this.isListLoading.set(true);
    try {
      const res: any = await this.http.post(`${this.api}/list`, {}).toPromise();
      this.joList.set(res?.data || []);
      return res;
    } catch (err) {
      this.joList.set([]);
      throw err;
    } finally {
      this.isListLoading.set(false);
    }
  }

  async fetchDocumentsByParty(docType: string, partyCode: string): Promise<any> {
    const url = `${this.matApi}/documents-by-party?docType=${encodeURIComponent(docType)}&partyCode=${encodeURIComponent(partyCode)}&fromWarehouse=&toWarehouse=`;
    return this.http.get(url).toPromise();
  }

  async createJo(payload: any): Promise<any> {
    return this.http.post(`${this.api}/createJo`, payload).toPromise();
  }

  async saveStage1(payload: { joId: number; joNo: string; qty: number; updatedBy: string }): Promise<any> {
    return this.http.post(`${this.api}/saveStage1`, payload).toPromise();
  }

  async saveLineEntry(payload: {
    joId: number; stage: string; lineNo: string;
    entryTime: string; qty: number; createdBy: string;
  }): Promise<any> {
    return this.http.post(`${this.api}/saveLineEntry`, payload).toPromise();
  }

  async getLineEntries(joId: number): Promise<any> {
    return this.http.post(`${this.api}/getLineEntries`, { joId }).toPromise();
  }

  async deleteLineEntry(entryId: number, joId: number, stage: string): Promise<any> {
    return this.http.post(`${this.api}/deleteLineEntry`, { entryId, joId, stage }).toPromise();
  }

  async saveMatrixEntries(payload: {
    joId: number; stage: string; lineNo: string; entryTime: string;
    createdBy: string; entries: Array<{ colour: string; slive: string; size: string; qty: number }>;
  }): Promise<any> {
    return this.http.post(`${this.api}/saveMatrixEntries`, payload).toPromise();
  }

  async fetchHistory(joId: number): Promise<any> {
    return this.http.post(`${this.api}/history`, { joId }).toPromise();
  }

  async deleteJo(joId: number): Promise<any> {
    return this.http.post(`${this.api}/deleteJo`, { joId }).toPromise();
  }

  async createVendorEntry(joId: number, createdBy: string): Promise<any> {
    return this.http.post(`${this.api}/createVendorEntry`, { joId, createdBy }).toPromise();
  }
}
