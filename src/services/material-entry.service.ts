import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';  // FIXED

@Injectable({
  providedIn: 'root'
})
export class MaterialEntryService {

  private api = environment.apiUrl + '/material-transactions';

  // ==========================================================
  // SIGNAL STORES
  // ==========================================================
  entries = signal<any[]>([]);
  dispatchedEntries = signal<any[]>([]);
  pendingApprovalEntries = signal<any[]>([]);

  constructor(private http: HttpClient) { this.loadInitialData(); }

  async loadInitialData() {
    await this.fetchEntries();
  }

  // ==========================================================
  // FETCH ALL ENTRIES (ALWAYS CALL THIS FIRST)
  // ==========================================================
  async fetchEntries() {
    try {
      const result: any = await this.http.get(this.api).toPromise();
      this.entries.set(result || []);

      // auto filter lists after update
      this.filterDispatched();
      this.filterPendingApprovals();

    } catch (err) {
      throw err
    }
  }

  // ==========================================================
  // VENDOR CREATES A NEW ENTRY
  // ==========================================================
  async createEntry(data: any) {
    try {
      const res = await this.http.post(this.api, data).toPromise();
      await this.fetchEntries();
      return res;
    } catch (err) {
      throw err;
    }
  }

  // ==========================================================
  // WAREHOUSE APPROVAL
  // ==========================================================
  async approveEntry(selectedData: any, expectedDate: string, warehouseAddress: string, userName: string) {
    try {
        const body = {
            partyCode : selectedData.PartyCode,
            docNum : selectedData.DocNum,
            expectedReceiveDate: expectedDate,
            warehouseAddress: warehouseAddress,
            Status: 'Approved',
            approvedBy: userName
        };

      const res = await this.http.put(`${this.api}/${selectedData.EntryId}/approve`, body).toPromise();
      await this.fetchEntries();
      return res;
    } catch (err) {
      throw err;
    }
  }

  // ==========================================================
  // DISPATCH MATERIAL (VENDOR)
  // ==========================================================
  async dispatchEntry(EntryId: any) {
    try {
      const body = { Status: 'Dispatched', DispatchedAt: new Date() };

      const res = await this.http.put(`${this.api}/dispatch/${EntryId}`, body).toPromise();
      await this.fetchEntries();
      return res;
    } catch (err) {
      throw err;
    }
  }

  // ==========================================================
  // GATE ENTRY (RECEIVING MATERIAL)
  // ==========================================================
  async confirmGateReceipt(EntryId: any, authorizedBy: string) {
    try {
      const body = {
        AuthorizedBy: authorizedBy,
        Status: 'Received'
      };
      
      const res = await this.http.put(`${this.api}/gate-inward/${EntryId}`, body).toPromise();
      await this.fetchEntries();
      return res;

    } catch (err) {
      throw err;
    }
  }

  // ==========================================================
  // FILTER : DISPATCHED LIST (GATE ENTRY SCREEN)
  // ==========================================================
  filterDispatched() {
    const list = this.entries().filter(e => e.Status === 'Dispatched');
    this.dispatchedEntries.set(list);
  }

  // ==========================================================
  // FILTER : PENDING APPROVAL (WAREHOUSE MANAGER SCREEN)
  // ==========================================================
  filterPendingApprovals() {
    const list = this.entries().filter(e => e.Status === 'Pending');
    this.pendingApprovalEntries.set(list);
  }

  // ==========================================================
  // FETCH DOCUMENTS BY PARTY (FOR JO)
  // ==========================================================
    async fetchDocumentsByParty(docType: string, partyCode: string, fromWarehouse: string, toWarehouse: string) {
        try {
            return await this.http.get(
                `${this.api}/documents-by-party?docType=${docType}&partyCode=${partyCode}&fromWarehouse=${fromWarehouse}&toWarehouse=${toWarehouse}`
            ).toPromise();
        } 
        catch (err) 
        {
            return { status: false, data: [], DocNumList: [] };
        }
    }

    addEntry(entry: any) {
        return this.http.post(`${this.api}/`, entry).toPromise();
    }

    getWarehouses() {
        return this.http.get<any>(`${this.api}/warehouses`);
    }

    getScheduleCount(date: string) {
        return this.http.get<any>(`${this.api}/schedule-count?date=${date}`);
    }

    getDashboard(filter: any){
        return this.http.get<any>(`${this.api}/getDashboardData?fromDate=${filter.fromDate}&toDate=${filter.toDate}&docType=${filter.docType}&status=${filter.status}`);
    }

    deleteVendorEntry(entry: any){
        return this.http.post(`${this.api}/deleteVendorEntry`, entry).toPromise();
    }
}
