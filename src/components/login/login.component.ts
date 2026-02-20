import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';

type LoginType = 'business' | 'member';

@Component({
  standalone: true,
  selector: 'login-component',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private authService = inject(AuthService);

    // Form state
    loginType = signal<LoginType>('business');
    
    // Business login state
    mobileNumber = signal('');
    otp = signal('');
    otpSent = signal(false);

    // Member login state
    username = signal('');
    password = signal('');

    // Common state
    errorMessage = signal<string | null>(null);
    isLoading = signal(false);
    
    setLoginType(type: LoginType) {
        this.loginType.set(type);
        this.errorMessage.set(null);
        // Reset state when switching
        this.otpSent.set(false);
        this.isLoading.set(false);
    }

    handleInput(field: 'mobile' | 'otp' | 'username' | 'password', event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.errorMessage.set(null);
        
        switch(field) {
            case 'mobile':
                this.mobileNumber.set(value.replace(/[^0-9]/g, '').slice(0, 10));
                break;
            case 'otp':
                this.otp.set(value.replace(/[^0-9]/g, '').slice(0, 4));
                break;
            case 'username':
                this.username.set(value);
                break;
            case 'password':
                this.password.set(value);
                break;
        }
    }

    async sendOtp() {
        if (this.mobileNumber().length !== 10) {
            this.errorMessage.set('Please enter a valid 10-digit mobile number.');
            return;
        }
        
        this.isLoading.set(true);
        this.errorMessage.set(null);
        
        const result:any = await this.authService.sendOtp(this.mobileNumber());
        if (result.success) 
        {
            this.otpSent.set(true);
        } 
        else {
            this.errorMessage.set(result.message);
        }
        this.isLoading.set(false);
    }

    async handleBusinessLogin() {
        if (this.otp().length !== 4) {
            this.errorMessage.set('Please enter the 4-digit OTP.');
            return;
        }
        this.isLoading.set(true);
        this.errorMessage.set(null);
        
        const success = await this.authService.loginVendor(this.mobileNumber(), this.otp());
        if (!success) {
            this.errorMessage.set('Invalid OTP or vendor not found.');
        }
        // isLoading is set to false in the final block
        this.isLoading.set(false);
    }

    async handleMemberLogin() {
        if (!this.username() || !this.password()) {
            this.errorMessage.set('Please enter both username and password.');
            return;
        }
        this.isLoading.set(true);
        this.errorMessage.set(null);
        
        const success = await this.authService.loginMember(this.username(), this.password());
        if (!success) {
            this.errorMessage.set('Invalid username or password.');
        }
        this.isLoading.set(false);
    }
}