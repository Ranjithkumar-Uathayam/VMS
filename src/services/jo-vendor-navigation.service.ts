import { Injectable, signal } from '@angular/core';

export interface JoVendorPayload {
    docType:        string;
    partyCode:      string;
    partyName:      string;
    docNumber:      string;
    packingEntries: Array<{ colour: string; slive: string; size: string; qty: number }>;
}

@Injectable({ providedIn: 'root' })
export class JoVendorNavigationService {
    /** Holds the pre-fill data until VendorEntryComponent consumes it */
    readonly pendingPayload = signal<JoVendorPayload | null>(null);

    /** Incrementing counter — AppComponent watches this to trigger view switch */
    readonly navigationRequested = signal(0);

    navigateToVendorEntry(payload: JoVendorPayload): void {
        this.pendingPayload.set(payload);
        this.navigationRequested.update(n => n + 1);
    }

    /** Call once from VendorEntryComponent.ngOnInit — returns and clears the payload */
    consumePayload(): JoVendorPayload | null {
        const p = this.pendingPayload();
        if (p) this.pendingPayload.set(null);
        return p;
    }
}
