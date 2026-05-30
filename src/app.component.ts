import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendorEntryComponent } from './components/vendor-entry/vendor-entry.component';
import { WarehouseApprovalComponent } from './components/warehouse-approval/warehouse-approval.component';
import { GateEntryComponent } from './components/gate-entry/gate-entry.component';
import { LoginComponent } from './components/login/login.component';
import { AuthService } from './services/auth.service';
import { UserRole } from './models/user.model';
import { DashboardComponent } from './components/dashboard/dashboard';
import { PartyBinMasterComponent } from './components/party-bin-master/party-bin-master.component';
import { GrnPushingComponent } from './components/grn-pushing/grn-pushing.component';

type View = 'dashBoard' | 'vendor' | 'warehouse' | 'gate' | 'partyBinMaster' | 'grnPushing';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  // FIX: Corrected typo from `Change.DetectionStrategy` to `ChangeDetectionStrategy`.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LoginComponent, VendorEntryComponent, WarehouseApprovalComponent, GateEntryComponent, DashboardComponent, PartyBinMasterComponent, GrnPushingComponent]
})
export class AppComponent {
  authService = inject(AuthService);
  
  currentUser = this.authService.currentUser;
  activeView = signal<View>('dashBoard');
  isSidebarOpen = signal(false);

  // Role-based access control signals
  canSeeVendor = computed(() => this.hasRole(['admin', 'vendor', 'inventory']));
  canSeeWarehouse = computed(() => this.hasRole(['admin', 'manager']));
  canSeeGate = computed(() => this.hasRole(['admin', 'manager', 'watchman']));
  canSeeDashBoard = computed(() => this.hasRole(['admin', 'manager', 'watchman']));
  canSeePartyBinMaster = computed(() => this.hasRole(['admin', 'inventory']));
  canSeeGrnPushing = computed(() => this.hasRole(['admin', 'inventory']));

  constructor() {
    effect(() => {
        const user = this.currentUser();
        if (!user) return;

        if (this.canSeeVendor()) {
            this.setView('vendor');
        } else if (this.canSeeWarehouse()) {
            this.setView('warehouse');
        } else if (this.canSeeGate()) {
            this.setView('gate');
        } else if (this.canSeeDashBoard()) {
            this.setView('dashBoard');
        } else if (this.canSeePartyBinMaster()) {
            this.setView('partyBinMaster');
        }
    }, { allowSignalWrites: true });
  }

  private hasRole(roles: UserRole[]): boolean {
    const userRole = this.currentUser()?.role;
    if (!userRole) return false;
    return roles.includes(userRole);
  }

  setView(view: View): void {
    this.activeView.set(view);
    this.isSidebarOpen.set(false); // Close sidebar on navigation
  }
  
  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}