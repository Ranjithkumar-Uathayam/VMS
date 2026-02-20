import { Component, inject, OnInit, signal, ViewChild, ElementRef  } from '@angular/core';
import { MaterialEntryService } from '../../services/material-entry.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';


declare var Swal: any;

@Component({
  selector: 'warehouse-approval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-approval.component.html',
  styleUrls: ['./warehouse-approval.component.css']
})
export class WarehouseApprovalComponent implements OnInit {

    private materialService = inject(MaterialEntryService);
    private auth = inject(AuthService);

    pendingEntries = this.materialService.pendingApprovalEntries;
    selectedEntry: any = signal<any | null>(null);

    expectedReceiveDate = signal<string>('');
    warehouseAddress = signal<string>('');      
    isApproving = signal(false);
    currentUser = this.auth.currentUser;

    warehouses: any[] = [];
    selectedWarehouse: string = '';
    scheduledTotal = signal(0);      
    today = new Date().toISOString().split('T')[0];   

    @ViewChild('pendingScroll')
    pendingScroll!: ElementRef<HTMLDivElement>;

    refreshWarehouse!: Subscription;

    scrollPending(direction: number) {
        const el = this.pendingScroll.nativeElement;
        const scrollAmount = el.clientWidth * 0.8;

        el.scrollBy({
            left: direction * scrollAmount,
            behavior: 'smooth'
        })
    }

    async ngOnInit() {
        await this.materialService.fetchEntries();
        this.materialService.filterPendingApprovals();

        // Load warehouses
        this.materialService.getWarehouses().subscribe(res => {
            if (res.status) {
                this.warehouses = res.data.map((w: any) => ({
                    code: w.WhsCode,
                    name: w.WhsName,
                    fullAddress: `${w.WhsName || ''} ${w.Street || ''} ${w.StreetNo || ''}, ${w.City || ''}, ${w.State || ''}, ${w.ZipCode || ''}`.trim()
                }));
            }
        });

        // 🔁 Auto refresh every 30 sec
        this.refreshWarehouse = interval(30000).subscribe(() => {
            this.materialService.fetchEntries();
            this.materialService.filterPendingApprovals();
        });
    }

    ngOnDestroy(): void {
        this.refreshWarehouse?.unsubscribe();
    }

    selectEntry(entry: any) {
        this.selectedEntry.set(entry);

        this.expectedReceiveDate.set(entry.ExpectedReceiveDate || '');

        // If entry already has warehouse address → pre-select matching dropdown
        const savedAddress = entry.WarehouseAddress || '';
        this.warehouseAddress.set(savedAddress);
        this.selectedWarehouse = savedAddress;
    }

    async approveSelectedEntry(): Promise<void> {
        const entry = this.selectedEntry();
        if (!entry) {
            Swal.fire('Error', 'Please select an entry.', 'error');
            return;
        }

        // Warehouse should come from dropdown
        if (!this.selectedWarehouse) {
            Swal.fire('Error', 'Please select a warehouse.', 'error');
            return;
        }

        if (!this.expectedReceiveDate()) {
            Swal.fire('Error', 'Expected receive date required.', 'error');
            return;
        }

        this.isApproving.set(true);

        try {
            let user = this.currentUser();
            let userName: string = user?.name || '';

            await this.materialService.approveEntry(
                entry,
                this.expectedReceiveDate(),
                this.selectedWarehouse,      // IMPORTANT
                userName
            );

            Swal.fire({
                icon: 'success',
                title: 'Approved!',
                text: `Entry ${entry.DocNum} has been approved.`,
                timer: 2000,
                showConfirmButton: false,
            });

            this.clearSelection();
            await this.materialService.fetchEntries();
            this.materialService.filterPendingApprovals();
        }
        catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Approval Failed',
                text: 'Could not approve entry. Please try again.',
            });
        }
        finally {
            this.isApproving.set(false);
        }
    }

    clearSelection(): void {
        this.selectedEntry.set(null);
        this.expectedReceiveDate.set('');
        this.selectedWarehouse = '';
        this.warehouseAddress.set('');
    }

    handleDateChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.expectedReceiveDate.set(input.value);
        
        this.materialService.getScheduleCount(input.value).subscribe(res => {
            this.scheduledTotal.set(res.total || 0)
        })
    }

}
