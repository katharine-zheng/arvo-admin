import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {

  email = '';
  password = '';
  isLoginMode = true; // Toggle between login and registration

  constructor(private authService: AuthService) {}

  // Toggle between login and registration modes
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  onSendSignInLink(): void {
    if (this.email) {
      this.authService.sendSignInLink(this.email);
    }
  }

  // Handle form submission based on the mode
  onSubmit(): void {
    if (this.isLoginMode) {
      this.authService.login(this.email, this.password).catch((error) => {
        console.error('Login error:', error);
      });
    } else {
      this.authService.register(this.email, this.password).catch((error) => {
        console.error('Registration error:', error);
      });
    }
  }
}
