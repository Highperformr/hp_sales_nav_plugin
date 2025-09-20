// Popup Script for LinkedIn Sales Navigator Integration
console.log('[HP Extension Popup] Popup script loaded');

class PopupManager {
  constructor() {
    console.log('[HP Extension Popup] PopupManager constructor called');
    this.init();
  }

  async init() {
    console.log('[HP Extension Popup] Initializing popup');
    await this.checkAuthenticationStatus();
    this.setupEventListeners();
  }

  async checkAuthenticationStatus() {
    console.log('[HP Extension Popup] Checking authentication status');
    try {
      const result = await chrome.storage.local.get(['isAuthenticated', 'userId', 'accountId', 'workspaces']);
      console.log('[HP Extension Popup] Local storage result:', result);
      
      // Check if already authenticated in storage
      if (result.isAuthenticated && result.userId && result.accountId) {
        console.log('[HP Extension Popup] Already authenticated in storage');
        this.showAuthenticatedState(result);
        return;
      }
      
      // Check if user is logged in on the platform by trying to access it
      console.log('[HP Extension Popup] Checking platform session...');
      try {
        const response = await fetch('https://app.highperformr.ai/api/auth/verify', {
          method: 'GET'
        });
        
        console.log('[HP Extension Popup] Platform session check response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('[HP Extension Popup] Platform session found, user data:', userData);
          // Store the session data
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: userData.id,
            accountId: userData.accountId,
            workspaces: userData.workspaces
          });
          console.log('[HP Extension Popup] Platform session data stored');
          this.showAuthenticatedState(userData);
          return;
        }
      } catch (error) {
        // Platform not accessible or user not logged in
        console.log('[HP Extension Popup] Platform session not found:', error.message);
      }
      
      console.log('[HP Extension Popup] No authentication found, showing unauthenticated state');
      this.showUnauthenticatedState();
    } catch (error) {
      console.error('[HP Extension Popup] Error checking authentication status:', error);
      this.showUnauthenticatedState();
    }
  }

  showAuthenticatedState(userData) {
    const statusIcon = document.getElementById('statusIcon');
    const statusMessage = document.getElementById('statusMessage');
    const userInfo = document.getElementById('userInfo');
    const authBtn = document.getElementById('authBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    statusIcon.classList.remove('disconnected');
    statusIcon.classList.add('connected');
    
    statusMessage.textContent = 'Connected to Highperformr.ai';
    
    if (userData.workspaces && userData.workspaces.length > 0) {
      userInfo.innerHTML = `
        <strong>Account:</strong> ${userData.accountId}<br>
        <strong>Workspaces:</strong> ${userData.workspaces.length}
      `;
    } else {
      userInfo.innerHTML = `<strong>Account:</strong> ${userData.accountId}`;
    }
    
    userInfo.classList.remove('hidden');
    authBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  }

  showUnauthenticatedState() {
    const statusIcon = document.getElementById('statusIcon');
    const statusMessage = document.getElementById('statusMessage');
    const userInfo = document.getElementById('userInfo');
    const authBtn = document.getElementById('authBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    statusIcon.classList.remove('connected');
    statusIcon.classList.add('disconnected');
    
    statusMessage.textContent = 'Not connected to Highperformr.ai';
    
    userInfo.classList.add('hidden');
    authBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }

  setupEventListeners() {
    document.getElementById('authBtn').addEventListener('click', () => {
      this.authenticate();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
    });
  }

  async authenticate() {
    try {
      this.showLoading(true);
      
      // Open authentication popup
      const authUrl = 'https://auth.highperformr.ai/auth/chrome-extension';
      
      // Create popup window
      const popup = window.open(
        authUrl,
        'highperformr_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Please allow popups for authentication');
      }

      // Poll for authentication completion
      const checkAuth = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkAuth);
            this.showLoading(false);
            this.checkAuthenticationStatus();
            return;
          }

          // Check current URL
          const url = popup.location.href;
          console.log('[HP Extension Popup] Auth popup URL:', url);
          
          // Check if redirected to success page
          if (url.includes('/auth/success')) {
            clearInterval(checkAuth);
            popup.close();
            this.handleAuthSuccess();
          }
          // Check if redirected to main app (already logged in)
          else if (url.includes('app.highperformr.ai') && !url.includes('/auth/') && !url.includes('chrome-extension')) {
            console.log('[HP Extension Popup] Already logged in - detected app.highperformr.ai');
            clearInterval(checkAuth);
            popup.close();
            this.handleAlreadyLoggedIn();
          }
          // Also check for any highperformr.ai domain (in case of redirects)
          else if (url.includes('highperformr.ai') && !url.includes('/auth/') && !url.includes('chrome-extension')) {
            console.log('[HP Extension Popup] Detected highperformr.ai domain, treating as logged in');
            clearInterval(checkAuth);
            popup.close();
            this.handleAlreadyLoggedIn();
          }
        } catch (error) {
          // Cross-origin error - expected during auth flow
          console.log('[HP Extension Popup] Cross-origin error (expected):', error.message);
        }
      }, 1000);

    } catch (error) {
      console.error('Authentication error:', error);
      this.showLoading(false);
      console.error('[HP Extension Popup] Authentication failed. Please try again.');
    }
  }

  async handleAuthSuccess() {
    console.log('[HP Extension Popup] Handling auth success');
    try {
      this.showLoading(true);
      
      // Verify authentication with backend
      const response = await fetch('https://app.highperformr.ai/api/auth/verify', {
        method: 'GET'
      });

      if (response.ok) {
        const userData = await response.json();
        await chrome.storage.local.set({
          isAuthenticated: true,
          userId: userData.id,
          accountId: userData.accountId,
          workspaces: userData.workspaces
        });
        
        this.showLoading(false);
        await this.checkAuthenticationStatus();
        
        // Show success message
        this.showMessage('Authentication successful!', 'success');
      } else {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      console.error('[HP Extension Popup] Auth verification error:', error);
      this.showLoading(false);
      this.showMessage('Authentication verification failed. Please try again.', 'error');
    }
  }

  async handleAlreadyLoggedIn() {
    console.log('[HP Extension Popup] Handling already logged in scenario');
    try {
      this.showLoading(true);
      
      // Get cookies from Highperformr domain
      const cookies = await this.getHighperformrCookies();
      console.log('[HP Extension Popup] Retrieved Highperformr cookies:', cookies.length);
      
      // Verify authentication with backend using the cookies
      const response = await fetch('https://app.highperformr.ai/api/auth/verify', {
        method: 'GET',
        headers: {
          'Cookie': cookies
        }
      });

      console.log('[HP Extension Popup] Auth verify response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('[HP Extension Popup] User data retrieved:', userData);
        
        await chrome.storage.local.set({
          isAuthenticated: true,
          userId: userData.id,
          accountId: userData.accountId,
          workspaces: userData.workspaces,
          highperformrCookies: cookies
        });
        
        this.showLoading(false);
        await this.checkAuthenticationStatus();
        
        // Show success message
        this.showMessage('Already logged in! Using existing session.', 'success');
      } else {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      console.error('[HP Extension Popup] Already logged in verification error:', error);
      this.showLoading(false);
      this.showMessage('Failed to verify existing session. Please try again.', 'error');
    }
  }

  async getHighperformrCookies() {
    console.log('[HP Extension Popup] Getting Highperformr cookies');
    try {
      const cookies = await chrome.cookies.getAll({
        domain: '.highperformr.ai'
      });
      
      console.log('[HP Extension Popup] Found cookies:', cookies.length);
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('[HP Extension Popup] Cookie string length:', cookieString.length);
      return cookieString;
    } catch (error) {
      console.error('[HP Extension Popup] Error getting Highperformr cookies:', error);
      return '';
    }
  }

  async logout() {
    try {
      // For now, just log out without confirmation in extension context
      console.log('[HP Extension Popup] Logging out user');
      await chrome.storage.local.clear();
      await this.checkAuthenticationStatus();
      this.showMessage('Disconnected successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showMessage('Error during logout', 'error');
    }
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    const content = document.querySelector('.content');
    
    if (show) {
      content.classList.add('hidden');
      loading.classList.remove('hidden');
    } else {
      content.classList.remove('hidden');
      loading.classList.add('hidden');
    }
  }

  showMessage(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
      text-align: center;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
