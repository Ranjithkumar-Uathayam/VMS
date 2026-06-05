import {
    ChangeDetectionStrategy, ChangeDetectorRef,
    Component, computed, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrnPushingService } from '../../services/grn-pushing.service';
import { AuthService } from '../../services/auth.service';

declare const Swal: any;

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'grn-pushing',
    templateUrl: './grn-pushing.component.html',
    styleUrls: ['./grn-pushing.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrnPushingComponent implements OnInit {

    private api  = inject(GrnPushingService);
    private auth = inject(AuthService);
    private cdr  = inject(ChangeDetectorRef);   // explicit CD control for OnPush + async

    currentUser = this.auth.currentUser;

    // ── list ─────────────────────────────────────────────────────────────
    grnList       = this.api.grnList;
    isListLoading = this.api.isListLoading;

    // ── detail ───────────────────────────────────────────────────────────
    selectedGrn     = signal<any | null>(null);
    detailRows      = signal<any[]>([]);
    isDetailLoading = signal(false);
    detailError     = signal<string | null>(null);

    // ── push ─────────────────────────────────────────────────────────────
    isPushing  = signal(false);
    pushResult = signal<{ status: number; message: string } | null>(null);

    // ── search / filter ──────────────────────────────────────────────────
    searchTerm = signal('');

    // ── pagination ───────────────────────────────────────────────────────
    readonly pageSize = 10;
    currentPage = signal(1);

    // Request-ID pattern: each new API call gets a higher ID.
    // When the response arrives we check whether it's still the latest call.
    private _detailReqId = 0;

    // ── computed ─────────────────────────────────────────────────────────
    filteredList = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        const list = this.grnList();
        if (!term) return list;
        return list.filter(r =>
            String(r.DocNum    || '').toLowerCase().includes(term) ||
            String(r.PartyName || '').toLowerCase().includes(term) ||
            String(r.DocEntry  || '').toLowerCase().includes(term) ||
            String(r.Status    || '').toLowerCase().includes(term)
        );
    });

    totalPages = computed(() =>
        Math.max(1, Math.ceil(this.filteredList().length / this.pageSize))
    );

    paginatedList = computed(() => {
        const safePage = Math.min(this.currentPage(), this.totalPages());
        const start    = (safePage - 1) * this.pageSize;
        return this.filteredList().slice(start, start + this.pageSize);
    });

    totalPagesArray = computed(() =>
        Array.from({ length: this.totalPages() }, (_, i) => i + 1)
    );

    totalQty = computed(() =>
        this.detailRows().reduce((s, r) => s + Number(r.Quantity  || 0), 0)
    );
    totalRequested = computed(() =>
        this.detailRows().reduce((s, r) => s + Number(r.Requested || r.Quantity || 0), 0)
    );
    totalBinned = computed(() =>
        this.detailRows().reduce((s, r) => s + Number(r.Binned    || 0), 0)
    );

    // ── lifecycle ─────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.loadList();
    }

    // ── list actions ──────────────────────────────────────────────────────
    async loadList(): Promise<void> {
        try {
            await this.api.fetchGrnList();
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Load Failed',
                text: err?.message || 'Could not fetch GRN list' });
        }
        this.cdr.markForCheck();
    }

    onSearch(term: string): void {
        this.searchTerm.set(term);
        this.currentPage.set(1);
    }

    previousPage(): void { this.currentPage.update(p => Math.max(1, p - 1)); }
    nextPage():     void { this.currentPage.update(p => Math.min(this.totalPages(), p + 1)); }
    goToPage(p: number): void { this.currentPage.set(p); }

    // ── GRN selection ─────────────────────────────────────────────────────
    async selectGrn(row: any): Promise<void> {
        const docEntry = row.DocEntry ?? row.docEntry;
        if (!docEntry) return;

        // ── FIX 1: No isDetailLoading guard ──────────────────────────────
        // Any click immediately starts a fresh load. The request-ID pattern
        // below discards responses from superseded calls.
        const reqId = ++this._detailReqId;

        // ── FIX 2: Always spread to a NEW object ─────────────────────────
        // Signal equality is by reference. If the user clicks the same row
        // again, `row` is the same reference → signal won't fire → view won't
        // update. Spreading creates a new object every time.
        this.selectedGrn.set({ ...row });
        this.detailRows.set([]);
        this.detailError.set(null);
        this.pushResult.set(null);
        this.isDetailLoading.set(true);

        // ── FIX 3: markForCheck so OnPush re-renders immediately ──────────
        this.cdr.markForCheck();

        try {
            const process = row.Type || row.type || row.Process || 'GRPO';
            const res: any = await this.api.fetchGrnDetails(docEntry, 'Binning', process, 'Pending');

            // Discard stale response if user already clicked a newer row
            if (reqId !== this._detailReqId) return;

            if (res?.status === 1) {
                const rows = (res.data || []).map((r: any) => this.normaliseDetailRow(r));
                this.detailRows.set(rows);
                this.detailError.set(
                    rows.length === 0 ? 'No GRN Details Found for this document.' : null
                );
            } else {
                this.detailRows.set([]);
                this.detailError.set(res?.message || 'No GRN Details found.');
            }
        } catch (err: any) {
            if (reqId !== this._detailReqId) return;
            this.detailRows.set([]);
            this.detailError.set(err?.message || 'Failed to load GRN details. Please try again.');
        } finally {
            // Only reset loading for the latest request
            if (reqId === this._detailReqId) {
                this.isDetailLoading.set(false);
            }
            this.cdr.markForCheck();   // force re-render after async completes
        }
    }

    async retryDetail(): Promise<void> {
        const grn = this.selectedGrn();
        if (grn) {
            // Re-select using the stored row — spread ensures a new object reference
            await this.selectGrn({ ...grn });
        }
    }

    // Normalise detail rows — ...r FIRST so explicit keys override raw nulls
    private normaliseDetailRow(r: any): any {
        return {
            ...r,
            LineNo:    r.LineNo    ?? r.lineNo    ?? r.LINENO      ?? null,
            ItemCode:  r.ItemCode  ?? r.itemCode  ?? r.ITEMCODE    ?? r.ProductCode  ?? r.productCode  ?? '',
            ItemName:  r.ItemName  ?? r.itemName  ?? r.ITEMNAME    ?? r.ProductName  ?? r.productName  ?? '',
            Quantity:  Number(r.Quantity  ?? r.quantity  ?? r.Qty      ?? r.qty         ?? 0),
            Requested: Number(r.Requested ?? r.requested ?? r.ReqQty   ?? r.reqQty      ?? r.Quantity    ?? 0),
            Binned:    Number(r.Binned    ?? r.binned    ?? r.BinnedQty ?? r.binnedQty   ?? 0),
            DocType:   r.DocType   ?? r.docType   ?? '',
            DocNum:    r.DocNum    ?? r.docNum    ?? '',
            DocEntry:  r.DocEntry  ?? r.docEntry  ?? null,
        };
    }

    // ── push ──────────────────────────────────────────────────────────────
    async pushGrn(): Promise<void> {
        const grn = this.selectedGrn();
        if (!grn || this.detailRows().length === 0) return;

        const docNum    = grn.DocNum    || grn.docNum    || '';
        const partyName = grn.PartyName || grn.partyName || '—';
        const docEntry  = grn.DocEntry  ?? grn.docEntry;

        const { isConfirmed } = await Swal.fire({
            icon: 'question',
            title: 'Push GRN to ERP?',
            html:  `<b>Doc#:</b> ${docNum}<br><b>Party:</b> ${partyName}<br><b>Entry:</b> ${docEntry}`,
            showCancelButton:   true,
            confirmButtonText:  'Yes, Push',
            cancelButtonText:   'Cancel',
            confirmButtonColor: '#4f46e5'
        });
        if (!isConfirmed) return;

        this.isPushing.set(true);
        this.pushResult.set(null);

        try {
            const res: any = await this.api.pushGrnTransaction({
                docEntry,
                type:    'Binning',
                process: grn.Type || grn.type || grn.Process || 'GRPO',
                status:  'Pending'
            });

            const success = res?.status === 1;
            this.pushResult.set({
                status:  res?.status ?? 0,
                message: res?.Reason || res?.message ||
                         (success ? 'GRN pushed successfully' : 'Push failed')
            });

            if (success) {
                await this.loadList();
                this.clearSelection();
            }
        } catch (err: any) {
            this.pushResult.set({ status: 0, message: err?.message || 'An unexpected error occurred' });
        } finally {
            this.isPushing.set(false);
            this.cdr.markForCheck();
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────
    clearSelection(): void {
        this._detailReqId++;          // invalidate any in-flight detail request
        this.selectedGrn.set(null);
        this.detailRows.set([]);
        this.detailError.set(null);
        this.pushResult.set(null);
        this.isDetailLoading.set(false);
    }

    refresh(): void {
        this.clearSelection();
        this.searchTerm.set('');
        this.currentPage.set(1);
        this.loadList();
    }

    getStatusClass(status: string): string {
        const s = (status || '').toLowerCase();
        if (s === 'pending')                                      return 'grn-status--pending';
        if (s === 'completed' || s === 'success' || s === 'done') return 'grn-status--success';
        if (s === 'failed'    || s === 'error')                   return 'grn-status--error';
        if (s === 'initiated')                                    return 'grn-status--initiated';
        return 'grn-status--default';
    }

    rowStatus(row: any): string {
        return row.Status || row.status || row.DocStatus || '';
    }

    // Used in template comparisons — ensures numeric vs string DocEntry never mismatches
    str(v: any): string {
        return v == null ? '' : String(v);
    }
}
