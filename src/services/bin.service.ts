import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';  // FIXED

@Injectable({
  providedIn: 'root'
})
export class binMasterService {

    private api = environment.apiUrl + '/partyBin';

    constructor(private http: HttpClient) {}

    addBinMaster(entry: any) {
        return this.http.post(`${this.api}/create`, entry).toPromise();
    }

    dispatchPartyBin(entry: any) {
        return this.http.post(`${this.api}/dispatch`, entry)
    }

    getBinList() {
        return this.http.get<any>(`${this.api}/BinList`);
    }

    getPartyList() {
        return this.http.get<any>(`${this.api}/PartyList`);
    }
    
}