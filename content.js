// LinkedIn Sales Navigator Integration Content Script
console.log('[HP Extension] Content script loaded on:', window.location.href);

class LinkedInSalesNavIntegration {
  constructor() {
    console.log('[HP Extension] LinkedInSalesNavIntegration constructor called');
    this.allowedPaths = {
      salesNavigatorPeople: 'https://www.linkedin.com/sales/search/people',
      salesNavigatorCompany: 'https://www.linkedin.com/sales/search/company'
    };
    this.init();
  }

  init() {
    console.log('[HP Extension] Initializing LinkedIn Sales Navigator Integration');
    const urlCheck = this.isAllowedUrl();
    console.log('[HP Extension] URL check result:', urlCheck);
    
    if (urlCheck.allowed) {
      console.log('[HP Extension] URL is allowed, injecting UI and setting up event listeners');
      this.injectUI();
      this.setupEventListeners();
    } else {
      console.log('[HP Extension] URL is not allowed, skipping initialization');
    }
  }

  isAllowedUrl() {
    const url = window.location.href;
    console.log('[HP Extension] Checking URL:', url);
    
    // Comprehensive Sales Navigator URL detection
    // Handle all possible Sales Navigator search patterns
    
    // 1. People searches - any URL containing /sales/search/people
    if (url.includes('/sales/search/people')) {
      console.log('[HP Extension] Detected Sales Navigator people search');
      return { allowed: true, type: 'salesNavigatorPeople' };
    }
    
    // 2. Company searches - any URL containing /sales/search/company  
    if (url.includes('/sales/search/company')) {
      console.log('[HP Extension] Detected Sales Navigator company search');
      return { allowed: true, type: 'salesNavigatorCompany' };
    }
    
    // 3. Additional Sales Navigator paths that might exist
    // Handle any other sales navigator search paths
    if (url.includes('/sales/') && (url.includes('/search/') || url.includes('/leads/') || url.includes('/accounts/'))) {
      console.log('[HP Extension] Detected Sales Navigator search page');
      // Determine type based on URL content
      if (url.includes('/people') || url.includes('/leads')) {
        return { allowed: true, type: 'salesNavigatorPeople' };
      } else if (url.includes('/company') || url.includes('/accounts')) {
        return { allowed: true, type: 'salesNavigatorCompany' };
      } else {
        // Default to people search if unclear
        return { allowed: true, type: 'salesNavigatorPeople' };
      }
    }
    
    console.log('[HP Extension] URL does not match allowed patterns');
    return { allowed: false };
  }

  injectUI() {
    console.log('[HP Extension] Setting up UI injection observer');
    
    // Try to inject immediately first
    this.tryInjectUI();
    
    // Comprehensive mutation observer for search results
    const observer = new MutationObserver(() => {
      // Check for any search results indicators
      const searchResults = document.querySelector('[data-test-search-results]') || 
                           document.querySelector('.search-results-container') ||
                           document.querySelector('.search-results') ||
                           document.querySelector('[data-test-id="search-results"]') ||
                           document.querySelector('.artdeco-entity-lockup') ||
                           document.querySelector('.reusable-search__result-container') ||
                           document.querySelector('[data-sn-view-name="lead-search"]') ||
                           document.querySelector('[data-sn-view-name="module-lead-search-results"]') ||
                           document.querySelector('.search-results-list') ||
                           document.querySelector('.search-results__list') ||
                           document.querySelector('.entity-lockup') ||
                           document.querySelector('.entity-lockup__container') ||
                           document.querySelector('.search-results__container') ||
                           document.querySelector('.search-results__content');
      
      console.log('[HP Extension] MutationObserver triggered, checking for search results:', !!searchResults);
      console.log('[HP Extension] Existing integration container:', !!document.getElementById('hp-integration-container'));
      
      if (searchResults && !document.getElementById('hp-integration-container')) {
        console.log('[HP Extension] Creating integration UI');
        this.createIntegrationUI();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Multiple injection attempts with different timings
    setTimeout(() => {
      this.tryInjectUI();
    }, 1000);

    setTimeout(() => {
      this.tryInjectUI();
    }, 3000);

    setTimeout(() => {
      this.tryInjectUI();
    }, 5000);

    // Final fallback - inject after 8 seconds regardless
    setTimeout(() => {
      if (!document.getElementById('hp-integration-container')) {
        console.log('[HP Extension] Final fallback - injecting UI at top of page');
        this.createIntegrationUI();
      }
    }, 8000);

    // Additional fallback for slow-loading pages
    setTimeout(() => {
      if (!document.getElementById('hp-integration-container')) {
        console.log('[HP Extension] Extended fallback - forcing UI injection');
        this.createIntegrationUI();
      }
    }, 15000);
  }

  tryInjectUI() {
    console.log('[HP Extension] Trying to inject UI');
    if (!document.getElementById('hp-integration-container')) {
      // Comprehensive list of possible containers for button injection
      const possibleContainers = [
        // Primary search result containers
        document.querySelector('.search-results-container'),
        document.querySelector('[data-test-search-results]'),
        document.querySelector('.search-results'),
        document.querySelector('.scaffold-layout__content'),
        
        // LinkedIn Sales Navigator specific selectors
        document.querySelector('[data-sn-view-name="lead-search"]'),
        document.querySelector('[data-sn-view-name="module-lead-search-results"]'),
        document.querySelector('.search-results-container'),
        document.querySelector('.artdeco-entity-lockup')?.parentElement,
        document.querySelector('.reusable-search__result-container')?.parentElement,
        
        // Additional LinkedIn selectors
        document.querySelector('.search-results-list'),
        document.querySelector('.search-results__list'),
        document.querySelector('.entity-lockup'),
        document.querySelector('.entity-lockup__container'),
        document.querySelector('.search-results__container'),
        document.querySelector('.search-results__content'),
        
        // Fallback containers
        document.querySelector('main'),
        document.querySelector('[role="main"]'),
        document.querySelector('.main-content'),
        document.querySelector('.content'),
        document.querySelector('.page-content'),
        
        // LinkedIn specific fallbacks
        document.querySelector('.scaffold-layout'),
        document.querySelector('.scaffold-layout__main'),
        document.querySelector('.application-outlet'),
        document.querySelector('.global-nav'),
        document.querySelector('.global-nav')?.nextElementSibling,
        
        // Ultimate fallback - body
        document.body
      ].filter(Boolean);

      console.log('[HP Extension] Found possible containers:', possibleContainers.length);
      
      if (possibleContainers.length > 0) {
        console.log('[HP Extension] Creating integration UI with first available container');
        this.createIntegrationUI(possibleContainers[0]);
      } else {
        console.log('[HP Extension] No suitable container found, will retry with observer');
      }
    }
  }

  createIntegrationUI(targetContainer = null) {
    console.log('[HP Extension] Creating integration UI elements');
    const container = document.createElement('div');
    container.id = 'hp-integration-container';
    container.className = 'hp-integration-container';
    
    const button = document.createElement('button');
    button.id = 'hp-integration-button';
    button.className = 'hp-integration-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Add to Highperformr
    `;
    
    container.appendChild(button);
    console.log('[HP Extension] Integration button created');
    
    // Try to find a good insertion point
    let insertionPoint = targetContainer;
    
    if (!insertionPoint) {
      // Comprehensive list of possible insertion points
      insertionPoint = document.querySelector('[data-test-search-results]') ||
                     document.querySelector('.search-results-container') ||
                     document.querySelector('.search-results') ||
                     document.querySelector('.scaffold-layout__content') ||
                     document.querySelector('[data-sn-view-name="lead-search"]') ||
                     document.querySelector('[data-sn-view-name="module-lead-search-results"]') ||
                     document.querySelector('.search-results-list') ||
                     document.querySelector('.search-results__list') ||
                     document.querySelector('.entity-lockup')?.parentElement ||
                     document.querySelector('.reusable-search__result-container')?.parentElement ||
                     document.querySelector('.search-results__container') ||
                     document.querySelector('.search-results__content') ||
                     document.querySelector('main') ||
                     document.querySelector('[role="main"]') ||
                     document.querySelector('.main-content') ||
                     document.querySelector('.content') ||
                     document.querySelector('.page-content') ||
                     document.querySelector('.scaffold-layout') ||
                     document.querySelector('.scaffold-layout__main') ||
                     document.querySelector('.application-outlet');
    }
    
    console.log('[HP Extension] Insertion point found:', !!insertionPoint);
    
    if (insertionPoint) {
      // Try multiple insertion strategies
      try {
        // Strategy 1: Insert at the beginning of the container
        if (insertionPoint.firstChild) {
          insertionPoint.insertBefore(container, insertionPoint.firstChild);
          console.log('[HP Extension] Integration UI inserted at beginning of container');
        } else {
          insertionPoint.appendChild(container);
          console.log('[HP Extension] Integration UI appended to container');
        }
      } catch (error) {
        console.log('[HP Extension] Failed to insert into container, trying fallback:', error);
        // Fallback: insert at the top of the body
        document.body.insertBefore(container, document.body.firstChild);
        console.log('[HP Extension] Integration UI inserted at top of body (fallback)');
      }
    } else {
      // Fallback: insert at the top of the body
      console.log('[HP Extension] No suitable container found, inserting at top of body');
      document.body.insertBefore(container, document.body.firstChild);
    }
  }

  setupEventListeners() {
    console.log('[HP Extension] Setting up event listeners');
    document.addEventListener('click', (event) => {
      console.log('[HP Extension] Click event detected on:', event.target.id);
      if (event.target.id === 'hp-integration-button') {
        console.log('[HP Extension] Integration button clicked');
        this.handleIntegrationClick();
      }
    });

    // Handle page visibility changes (e.g., when switching tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !document.getElementById('hp-integration-container')) {
        console.log('[HP Extension] Page became visible, checking for button injection');
        setTimeout(() => {
          this.tryInjectUI();
        }, 1000);
      }
    });

    // Handle page focus changes
    window.addEventListener('focus', () => {
      if (!document.getElementById('hp-integration-container')) {
        console.log('[HP Extension] Page focused, checking for button injection');
        setTimeout(() => {
          this.tryInjectUI();
        }, 1000);
      }
    });
  }

  async handleIntegrationClick() {
    console.log('[HP Extension] Handling integration click');
    try {
      // Check authentication
      console.log('[HP Extension] Checking authentication...');
      const isAuth = await this.checkAuthentication();
      console.log('[HP Extension] Authentication result:', isAuth);
      
      if (!isAuth) {
        console.log('[HP Extension] Not authenticated, showing auth modal');
        this.showAuthModal();
        return;
      }

      // Show workspace/segment selection modal
      console.log('[HP Extension] Authenticated, showing workspace modal');
      this.showWorkspaceModal();
    } catch (error) {
      console.error('[HP Extension] Error handling integration click:', error);
      this.showError('An error occurred. Please try again.');
    }
  }

  async checkAuthentication() {
    console.log('[HP Extension] Starting authentication check');
    try {
      // First check if we have valid stored cookies
      const storedData = await chrome.storage.local.get(['isAuthenticated', 'userId', 'accountId', 'highperformrCookies', 'cookieCaptureTime']);
      console.log('[HP Extension] Local storage result:', {
        isAuthenticated: storedData.isAuthenticated,
        hasUserId: !!storedData.userId,
        hasAccountId: !!storedData.accountId,
        hasCookies: !!storedData.highperformrCookies,
        cookieAge: storedData.cookieCaptureTime ? (Date.now() - storedData.cookieCaptureTime) / 1000 / 60 : 'unknown'
      });
      
      // Check if we have recent cookies (less than 1 hour old)
      const hasRecentCookies = storedData.highperformrCookies && 
                               storedData.cookieCaptureTime && 
                               (Date.now() - storedData.cookieCaptureTime) < 3600000; // 1 hour
      
      // If we have stored auth data AND recent cookies, try to verify the session
      if (storedData.isAuthenticated && storedData.userId && storedData.accountId && hasRecentCookies) {
        console.log('[HP Extension] Found stored auth data with recent cookies, verifying session...');
        
        try {
          const sessionValid = await this.verifyStoredSession();
          if (sessionValid) {
            console.log('[HP Extension] Stored session is valid, using existing authentication');
            return true;
          } else {
            console.log('[HP Extension] Stored session is invalid, clearing stored data');
            // Clear invalid stored data
            await chrome.storage.local.remove(['isAuthenticated', 'userId', 'accountId']);
          }
        } catch (error) {
          console.log('[HP Extension] Error verifying stored session:', error.message);
          // Clear potentially invalid stored data
          await chrome.storage.local.remove(['isAuthenticated', 'userId', 'accountId']);
        }
      }
      
      // Check if user is logged in on the platform by trying to access it via background script
      console.log('[HP Extension] Checking platform session via background script...');
      try {
        // Get cookies first to ensure we have them stored
        const cookies = await this.getHighperformrCookies();
        console.log('[HP Extension] Retrieved cookies for session check:', cookies.length);
        
        if (!cookies) {
          console.log('[HP Extension] No cookies available, authentication required');
          return false;
        }
        
        // Use background script to verify session (avoids CORS issues)
        const sessionResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'VERIFY_SESSION'
          }, (response) => {
            console.log('[HP Extension] Session verification response from background:', response);
            resolve(response);
          });
        });
        
        if (sessionResult && sessionResult.success && sessionResult.authenticated) {
          console.log('[HP Extension] Platform session verified via background script');
          return true;
        } else {
          console.log('[HP Extension] Session verification failed:', sessionResult?.error || 'Unknown error');
          return false;
        }
      } catch (error) {
        // Platform not accessible or user not logged in
        console.log('[HP Extension] Platform session verification error:', error.message);
      }
      
      console.log('[HP Extension] No authentication found');
      return false;
    } catch (error) {
      console.error('[HP Extension] Error checking authentication:', error);
      return false;
    }
  }

  async verifyStoredSession() {
    console.log('[HP Extension] Verifying stored session via background script');
    try {
      // Use background script to verify session (avoids CORS issues)
      const sessionResult = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'VERIFY_SESSION'
        }, (response) => {
          console.log('[HP Extension] Stored session verification response from background:', response);
          resolve(response);
        });
      });
      
      if (sessionResult && sessionResult.success && sessionResult.authenticated) {
        console.log('[HP Extension] Stored session verification successful');
        return true;
      } else {
        console.log('[HP Extension] Stored session verification failed:', sessionResult?.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('[HP Extension] Stored session verification error:', error);
      return false;
    }
  }

  showAuthModal() {
    console.log('[HP Extension] Showing authentication modal');
    const modal = document.createElement('div');
    modal.className = 'hp-modal-overlay';
    modal.innerHTML = `
      <div class="hp-modal">
        <div class="hp-modal-header">
          <h3>Authentication Required</h3>
          <button class="hp-modal-close">&times;</button>
        </div>
        <div class="hp-modal-body">
          <p>Please authenticate with Highperformr.ai to continue.</p>
        </div>
        <div class="hp-modal-footer">
          <button class="hp-btn-secondary" id="hp-cancel-auth">Cancel</button>
          <button class="hp-btn-primary" id="hp-authenticate">Authenticate</button>
        </div>
      </div>
    `;

    // Setup event listeners
    modal.querySelector('.hp-modal-close').onclick = () => {
      console.log('[HP Extension] Auth modal closed');
      this.closeModal(modal);
    };
    modal.querySelector('#hp-cancel-auth').onclick = () => {
      console.log('[HP Extension] Auth modal cancelled');
      this.closeModal(modal);
    };
    modal.querySelector('#hp-authenticate').onclick = () => {
      console.log('[HP Extension] Auth modal authenticate clicked');
      this.closeModal(modal);
      this.authenticate();
    };

    document.body.appendChild(modal);
    console.log('[HP Extension] Authentication modal added to page');
  }

  async authenticate() {
    console.log('[HP Extension] Starting authentication process');
    try {
      // Open authentication popup
      const authUrl = 'https://auth.highperformr.ai/auth/chrome-extension';
      console.log('[HP Extension] Opening auth popup to:', authUrl);
      
      const authWindow = window.open(
        authUrl,
        'highperformr_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        console.error('[HP Extension] Failed to open auth popup - popups blocked?');
        this.showError('Please allow popups for authentication.');
        return;
      }

      console.log('[HP Extension] Auth popup opened, starting polling');
      let pollCount = 0;
      const maxPolls = 60; // 30 seconds max (500ms * 60)
      
      // Poll for authentication completion with shorter interval
      const checkAuth = setInterval(async () => {
        pollCount++;
        console.log('[HP Extension] Poll attempt:', pollCount, '/', maxPolls);
        try {
          if (authWindow.closed) {
            console.log('[HP Extension] Auth popup closed');
            clearInterval(checkAuth);
            return;
          }

          // Check current URL
          const url = authWindow.location.href;
          console.log('[HP Extension] Auth popup URL:', url);
          
          // Check if redirected to success page
          if (url.includes('/auth/success')) {
            console.log('[HP Extension] Auth success detected');
            clearInterval(checkAuth);
            
            // Wait for redirect to app.highperformr.ai and capture cookies from there
            await this.waitForAppRedirectAndCaptureCookies(authWindow);
            
            authWindow.close();
            this.handleAuthSuccess();
          }
          // Check if redirected to main app (already logged in)
          else if (url.includes('app.highperformr.ai') && !url.includes('/auth/') && !url.includes('chrome-extension')) {
            console.log('[HP Extension] Already logged in - detected app.highperformr.ai');
            clearInterval(checkAuth);
            
            // Wait a moment for cookies to be set in app context, then capture
            console.log('[HP Extension] Waiting for cookies to be set in app.highperformr.ai context...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Capture cookies from app.highperformr.ai context
            await this.captureCookiesFromAppDomain();
            
            authWindow.close();
            this.handleAlreadyLoggedIn();
          }
          // Also check for any highperformr.ai domain (in case of redirects)
          else if (url.includes('highperformr.ai') && !url.includes('/auth/') && !url.includes('chrome-extension')) {
            console.log('[HP Extension] Detected highperformr.ai domain, treating as logged in');
            clearInterval(checkAuth);
            
            // Wait for redirect to app.highperformr.ai and capture cookies from there
            await this.waitForAppRedirectAndCaptureCookies(authWindow);
            
            authWindow.close();
            this.handleAlreadyLoggedIn();
          }
          // Check if we're on the main app page (any path after app.highperformr.ai)
          else if (url.includes('app.highperformr.ai/') && url !== 'https://app.highperformr.ai/' && !url.includes('/auth/')) {
            console.log('[HP Extension] Detected main app page, treating as logged in');
            clearInterval(checkAuth);
            
            // Wait a moment for cookies to be set in app context, then capture
            console.log('[HP Extension] Waiting for cookies to be set in app.highperformr.ai context...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Capture cookies from app.highperformr.ai context
            await this.captureCookiesFromAppDomain();
            
            authWindow.close();
            this.handleAlreadyLoggedIn();
          }
        } catch (error) {
          // Cross-origin error - expected during auth flow
          console.log('[HP Extension] Cross-origin error (expected):', error.message);
          // If we get cross-origin errors, it might mean we're on a different domain
          // Try to detect if we're on highperformr.ai by checking the error
          if (error.message.includes('cross-origin') || error.message.includes('SecurityError')) {
            console.log('[HP Extension] Cross-origin error suggests we might be on highperformr.ai domain');
            // After a few cross-origin errors, assume we're logged in
            if (pollCount > 10) {
              console.log('[HP Extension] Multiple cross-origin errors, assuming logged in');
              clearInterval(checkAuth);
              
              // Wait for cookies to be set in app.highperformr.ai context
              console.log('[HP Extension] Waiting 3 seconds for cookies to be set in app.highperformr.ai...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Capture cookies from app.highperformr.ai context specifically
              await this.captureCookiesFromAppDomain();
              
              authWindow.close();
              
              // Wait another second after closing the window before verifying
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              this.handleAlreadyLoggedIn();
              return;
            }
          }
        }
        
        // Timeout after max polls
        if (pollCount >= maxPolls) {
          console.log('[HP Extension] Auth polling timeout, closing popup');
          clearInterval(checkAuth);
          authWindow.close();
          this.showError('Authentication timeout. Please try again.');
        }
      }, 500); // Reduced to 500ms for faster response

    } catch (error) {
      console.error('[HP Extension] Authentication error:', error);
      this.showError('Authentication failed. Please try again.');
    }
  }

  async waitForAppRedirectAndCaptureCookies(authWindow) {
    console.log('[HP Extension] Waiting for redirect to app.highperformr.ai...');
    
    try {
      // Wait for potential redirect to app.highperformr.ai
      let redirectWaitCount = 0;
      const maxRedirectWait = 10; // Wait up to 5 seconds for redirect
      
      while (redirectWaitCount < maxRedirectWait) {
        await new Promise(resolve => setTimeout(resolve, 500));
        redirectWaitCount++;
        
        try {
          const currentUrl = authWindow.location.href;
          console.log('[HP Extension] Checking for app redirect, current URL:', currentUrl);
          
          if (currentUrl.includes('app.highperformr.ai')) {
            console.log('[HP Extension] Redirected to app.highperformr.ai, waiting for cookies to be set...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for cookies to be set
            break;
          }
        } catch (error) {
          // Cross-origin error, continue waiting
          console.log('[HP Extension] Cross-origin error while waiting for redirect (expected)');
        }
      }
      
      // Now capture cookies from app.highperformr.ai context
      await this.captureCookiesFromAppDomain();
      
    } catch (error) {
      console.error('[HP Extension] Error waiting for app redirect:', error);
      // Fallback to regular cookie capture
      await this.captureCookiesFromAppDomain();
    }
  }

  async captureCookiesFromAppDomain() {
    console.log('[HP Extension] Capturing cookies specifically from app.highperformr.ai context');
    
    try {
      // Try capturing cookies multiple times with delays to ensure they're fully set
      let attempts = 0;
      const maxAttempts = 5;
      let bestResponse = null;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[HP Extension] App domain cookie capture attempt ${attempts}/${maxAttempts}`);
        
        // Wait between attempts
        if (attempts > 1) {
          const waitTime = attempts > 3 ? 2000 : 1500;
          console.log(`[HP Extension] Waiting ${waitTime}ms before app domain attempt ${attempts}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_COOKIES_FROM_DOMAIN',
            domain: 'app.highperformr.ai' // Specifically target app domain
          }, (response) => {
            console.log(`[HP Extension] App domain cookie capture attempt ${attempts} response:`, response);
            resolve(response);
          });
        });

        if (response && response.success) {
          bestResponse = response;
          
          // Check if we have the session cookie
          if (response.cookies && response.cookies.includes('session=')) {
            console.log('[HP Extension] Found session cookie from app.highperformr.ai, using this response');
            break;
          } else {
            console.log(`[HP Extension] App domain attempt ${attempts} missing session cookie, will try again`);
            console.log(`[HP Extension] App domain cookies captured: ${response.cookies?.substring(0, 200)}...`);
          }
        }
      }

      if (bestResponse && bestResponse.success) {
        console.log('[HP Extension] Successfully captured cookies from app.highperformr.ai domain');
        console.log('[HP Extension] Final app domain cookies:', bestResponse.cookies);
        
        // Store the captured cookies in local storage
        await chrome.storage.local.set({
          highperformrCookies: bestResponse.cookies,
          cookieCaptureTime: Date.now()
        });
        
        console.log('[HP Extension] App domain cookies stored in local storage');
      } else {
        console.log('[HP Extension] Failed to capture cookies from app.highperformr.ai domain after all attempts');
        
        // Fallback: try to capture from broader domain and active tab
        console.log('[HP Extension] Falling back to broader domain cookie capture...');
        await this.captureCookiesFromWindow();
        
        // Also try capturing from active tab if user has app.highperformr.ai open
        console.log('[HP Extension] Also trying to capture from active tab...');
        await this.captureCookiesFromActiveTab();
      }
    } catch (error) {
      console.error('[HP Extension] Error capturing cookies from app domain:', error);
      // Fallback to regular cookie capture
      await this.captureCookiesFromWindow();
    }
  }

  async captureCookiesFromWindow() {
    console.log('[HP Extension] Attempting to capture cookies from broader domain');
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_COOKIES_FROM_DOMAIN',
          domain: '.highperformr.ai'
        }, (response) => {
          console.log('[HP Extension] Broader domain cookie capture response:', response);
          resolve(response);
        });
      });

      if (response && response.success) {
        console.log('[HP Extension] Successfully captured cookies from broader Highperformr domain');
        console.log('[HP Extension] Broader domain cookies:', response.cookies);
        
        // Store the captured cookies in local storage
        await chrome.storage.local.set({
          highperformrCookies: response.cookies,
          cookieCaptureTime: Date.now()
        });
        
        console.log('[HP Extension] Broader domain cookies stored in local storage');
      } else {
        console.log('[HP Extension] Failed to capture cookies from broader Highperformr domain');
      }
    } catch (error) {
      console.error('[HP Extension] Error capturing cookies from broader domain:', error);
    }
  }

  async captureCookiesFromActiveTab() {
    console.log('[HP Extension] Attempting to capture cookies from active tab');
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_COOKIES_FROM_ACTIVE_TAB'
        }, (response) => {
          console.log('[HP Extension] Active tab cookie capture response:', response);
          resolve(response);
        });
      });

      if (response && response.success) {
        console.log('[HP Extension] Successfully captured cookies from active tab');
        console.log('[HP Extension] Active tab cookies:', response.cookies);
        console.log('[HP Extension] Active tab URL:', response.tabUrl);
        
        // Check if we got the session cookie from active tab
        if (response.cookies && response.cookies.includes('session=')) {
          console.log('[HP Extension] 🎯 FOUND SESSION COOKIE FROM ACTIVE TAB!');
          
          // Store the captured cookies in local storage
          await chrome.storage.local.set({
            highperformrCookies: response.cookies,
            cookieCaptureTime: Date.now()
          });
          
          console.log('[HP Extension] Active tab cookies with session stored in local storage');
        } else {
          console.log('[HP Extension] Active tab cookies do not contain session cookie');
        }
      } else {
        console.log('[HP Extension] Failed to capture cookies from active tab:', response?.error);
      }
    } catch (error) {
      console.error('[HP Extension] Error capturing cookies from active tab:', error);
    }
  }

  async handleAuthSuccess() {
    console.log('[HP Extension] Handling auth success');
    try {
      // Get cookies first
      const cookies = await this.getHighperformrCookies();
      console.log('[HP Extension] Retrieved cookies for auth success:', cookies.length);
      
      // Verify authentication with backend using background script
      const sessionResult = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'VERIFY_SESSION'
        }, (response) => {
          console.log('[HP Extension] Auth success verification response from background:', response);
          resolve(response);
        });
      });

      if (sessionResult && sessionResult.success && sessionResult.authenticated) {
        console.log('[HP Extension] Auth success verification successful');
        
        if (sessionResult.userData) {
          console.log('[HP Extension] Auth success user data:', sessionResult.userData);
          
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: sessionResult.userData.data?.id || sessionResult.userData.id,
            accountId: sessionResult.userData.data?.attributes?.accounts?.[0]?.id || sessionResult.userData.accountId,
            workspaces: sessionResult.userData.data?.attributes?.accounts || sessionResult.userData.workspaces,
            highperformrCookies: cookies
          });
        } else {
          console.log('[HP Extension] Auth success but no user data, using fallback');
          // Try to get account ID from workspaces
          let accountId = 'unknown';
          try {
            const workspaces = await this.fetchWorkspacesFromBackground();
            if (workspaces && workspaces.length > 0) {
              accountId = workspaces[0].id;
              console.log('[HP Extension] Using first workspace as accountId:', accountId);
            }
          } catch (error) {
            console.error('[HP Extension] Failed to fetch workspaces for accountId:', error);
          }
          
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: 'unknown',
            accountId: accountId,
            highperformrCookies: cookies
          });
        }
        
        this.showSuccess('Authentication successful!');
        // Show workspace modal after successful auth
        setTimeout(() => {
          this.showWorkspaceModal();
        }, 1000);
      } else {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      console.error('[HP Extension] Auth verification error:', error);
      this.showError('Authentication verification failed. Please try again.');
    }
  }

  async handleAlreadyLoggedIn() {
    console.log('[HP Extension] Handling already logged in scenario');
    try {
      // Get cookies from Highperformr domain
      const cookies = await this.getHighperformrCookies();
      console.log('[HP Extension] Retrieved Highperformr cookies:', cookies.length);
      console.log('[HP Extension] Cookies text:', cookies);
      
      // Verify authentication with backend using background script
      const sessionResult = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'VERIFY_SESSION'
        }, (response) => {
          console.log('[HP Extension] Already logged in verification response from background:', response);
          resolve(response);
        });
      });

      if (sessionResult && sessionResult.success && sessionResult.authenticated) {
        console.log('[HP Extension] Already logged in verification successful');
        
        if (sessionResult.userData) {
          console.log('[HP Extension] User data retrieved:', sessionResult.userData);
          
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: sessionResult.userData.data?.id || sessionResult.userData.id,
            accountId: sessionResult.userData.data?.attributes?.accounts?.[0]?.id || sessionResult.userData.accountId,
            workspaces: sessionResult.userData.data?.attributes?.accounts || sessionResult.userData.workspaces,
            highperformrCookies: cookies
          });
        } else {
          console.log('[HP Extension] Already logged in but no user data, using fallback');
          // Try to get account ID from workspaces
          let accountId = 'unknown';
          try {
            const workspaces = await this.fetchWorkspacesFromBackground();
            if (workspaces && workspaces.length > 0) {
              accountId = workspaces[0].id;
              console.log('[HP Extension] Using first workspace as accountId:', accountId);
            }
          } catch (error) {
            console.error('[HP Extension] Failed to fetch workspaces for accountId:', error);
          }
          
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: 'unknown',
            accountId: accountId,
            highperformrCookies: cookies
          });
        }
        
        this.showSuccess('Already logged in! Using existing session.');
        // Show workspace modal after successful auth
        setTimeout(() => {
          this.showWorkspaceModal();
        }, 1000);
      } else {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      console.error('[HP Extension] Already logged in verification error:', error);
      this.showError('Failed to verify existing session. Please try again.');
    }
  }

  async getHighperformrCookies() {
    console.log('[HP Extension] Getting Highperformr cookies');
    try {
      // First, try to get stored cookies from auth window capture
      const stored = await chrome.storage.local.get(['highperformrCookies', 'cookieCaptureTime']);
      if (stored.highperformrCookies && stored.cookieCaptureTime) {
        const timeSinceCapture = Date.now() - stored.cookieCaptureTime;
        // Use stored cookies if they're less than 1 hour old
        if (timeSinceCapture < 3600000) {
          console.log('[HP Extension] Using stored cookies from auth window capture');
          return stored.highperformrCookies;
        } else {
          console.log('[HP Extension] Stored cookies are too old, refreshing...');
        }
      }

      // Fallback to getting cookies from extension context
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        const cookies = await chrome.cookies.getAll({
          domain: '.highperformr.ai'
        });
        
        console.log('[HP Extension] Found cookies:', cookies.length);
        const cookieString = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');
        
        console.log('[HP Extension] Cookie string length:', cookieString.length);
        return cookieString;
      } else {
        console.log('[HP Extension] chrome.cookies not available, requesting from background script');
        // Request cookies from background script
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'GET_HIGHPERFORMR_COOKIES'
          }, (response) => {
            console.log('[HP Extension] Received cookies from background:', response?.cookies?.length || 0);
            resolve(response?.cookies || '');
          });
        });
      }
    } catch (error) {
      console.error('[HP Extension] Error getting Highperformr cookies:', error);
      return '';
    }
  }

  async getStoredCookies() {
    console.log('[HP Extension] Getting stored cookies');
    try {
      const result = await chrome.storage.local.get(['highperformrCookies']);
      const cookies = result.highperformrCookies || '';
      console.log('[HP Extension] Stored cookies length:', cookies.length);
      return cookies;
    } catch (error) {
      console.error('[HP Extension] Error getting stored cookies:', error);
      return '';
    }
  }

  async fetchWorkspacesFromBackground() {
    console.log('[HP Extension] Fetching workspaces from background script');
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'FETCH_WORKSPACES'
        }, (response) => {
          console.log('[HP Extension] Received workspaces response from background:', response);
          resolve(response);
        });
      });

      if (response && response.success) {
        console.log('[HP Extension] Successfully fetched workspaces:', response.workspaces.length);
        return response.workspaces;
      } else {
        console.error('[HP Extension] Failed to fetch workspaces:', response?.error);
        throw new Error(response?.error || 'Failed to fetch workspaces');
      }
    } catch (error) {
      console.error('[HP Extension] Error fetching workspaces from background:', error);
      throw error;
    }
  }

  async fetchSegmentsFromBackground(workspaceId) {
    console.log('[HP Extension] Fetching segments from background script for workspace:', workspaceId);
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'FETCH_SEGMENTS',
          workspaceId: workspaceId
        }, (response) => {
          console.log('[HP Extension] Received segments response from background:', response);
          resolve(response);
        });
      });

      if (response && response.success) {
        console.log('[HP Extension] Successfully fetched segments:', response.segments.length);
        return response.segments;
      } else {
        console.error('[HP Extension] Failed to fetch segments:', response?.error);
        throw new Error(response?.error || 'Failed to fetch segments');
      }
    } catch (error) {
      console.error('[HP Extension] Error fetching segments from background:', error);
      throw error;
    }
  }

  async showWorkspaceModal() {
    try {
      const userData = await chrome.storage.local.get(['workspaces', 'accountId']);
      console.log('[HP Extension] Retrieved user data for workspace modal:', userData);
      
      let workspaces = [];
      
      // First try to get workspaces from stored session data
      if (userData.workspaces && Array.isArray(userData.workspaces)) {
        console.log('[HP Extension] Using workspaces from session data:', userData.workspaces.length);
        workspaces = userData.workspaces;
      } else {
        console.log('[HP Extension] Fetching workspaces from background script');
        workspaces = await this.fetchWorkspacesFromBackground();
      }

      if (workspaces.length === 0) {
        this.showError('No workspaces found. Please check your account.');
        return;
      }

      // Get current contact limit information
      let contactLimitInfo = null;
      try {
        const limitResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'CHECK_CONTACT_LIMIT',
            contactCount: 0 // Just check current status
          }, (response) => {
            resolve(response);
          });
        });
        
        if (limitResponse && limitResponse.success) {
          contactLimitInfo = limitResponse;
        }
      } catch (error) {
        console.log('[HP Extension] Could not get contact limit info:', error);
      }

      // Create modal with workspaces (segments will be fetched when workspace is selected)
      const modal = this.createWorkspaceModal(workspaces, contactLimitInfo);
      document.body.appendChild(modal);
    } catch (error) {
      console.error('[HP Extension] Error showing workspace modal:', error);
      this.showError('Failed to load workspace information. Please try again.');
    }
  }

  createWorkspaceModal(workspaces, contactLimitInfo = null) {
    // Create contact limit info section
    let contactLimitSection = '';
    if (contactLimitInfo) {
      const remaining = contactLimitInfo.remaining || (1500 - contactLimitInfo.currentTotal);
      const isNearLimit = remaining < 100;
      const limitColor = isNearLimit ? '#e74c3c' : '#27ae60';
      
      contactLimitSection = `
        <div class="hp-form-group" style="margin-bottom: 20px;">
          <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid ${limitColor};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #333;">Daily Contact Limit</strong>
                <div style="font-size: 14px; color: #666; margin-top: 4px;">
                  ${contactLimitInfo.currentTotal || 0} / 1,500 contacts used
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: bold; color: ${limitColor};">
                  ${remaining} remaining
                </div>
                <div style="font-size: 12px; color: #666;">
                  Resets in 24h
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const modal = document.createElement('div');
    modal.className = 'hp-modal-overlay';
    modal.innerHTML = `
      <div class="hp-modal">
        <div class="hp-modal-header">
          <h3>Select Workspace & Segment</h3>
          <button class="hp-modal-close">&times;</button>
        </div>
        <div class="hp-modal-body">
          ${contactLimitSection}
          <div class="hp-form-group">
            <label>Workspace:</label>
            <div class="hp-custom-dropdown" id="hp-workspace-dropdown">
              <div class="hp-dropdown-trigger" id="hp-workspace-trigger">
                <span class="hp-dropdown-text">Select a workspace...</span>
                <span class="hp-dropdown-arrow">▼</span>
              </div>
              <div class="hp-dropdown-content" id="hp-workspace-content">
                <input type="text" id="hp-workspace-search" placeholder="Search workspaces..." />
                <div class="hp-dropdown-list" id="hp-workspace-list">
                  ${workspaces.map(ws => 
    `<div class="hp-dropdown-item" data-value="${ws.id}">${ws.name}</div>`
  ).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="hp-form-group">
            <label>Segment:</label>
            <div class="hp-custom-dropdown" id="hp-segment-dropdown">
              <div class="hp-dropdown-trigger" id="hp-segment-trigger" disabled>
                <span class="hp-dropdown-text">Select a workspace first...</span>
                <span class="hp-dropdown-arrow">▼</span>
              </div>
              <div class="hp-dropdown-content" id="hp-segment-content">
                <input type="text" id="hp-segment-search" placeholder="Search segments..." disabled />
                <div class="hp-dropdown-list" id="hp-segment-list">
                  <div class="hp-dropdown-item">Select a workspace to load segments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="hp-modal-footer">
          <button class="hp-btn-secondary" id="hp-cancel">Cancel</button>
          <button class="hp-btn-primary" id="hp-import" disabled>Import</button>
        </div>
      </div>
    `;

    this.setupWorkspaceModalEvents(modal, workspaces);
    return modal;
  }

  setupWorkspaceModalEvents(modal, workspaces) {
    // Close modal
    modal.querySelector('.hp-modal-close').onclick = () => this.closeModal(modal);
    modal.querySelector('#hp-cancel').onclick = () => this.closeModal(modal);

    // Get references to elements
    const workspaceDropdown = modal.querySelector('#hp-workspace-dropdown');
    const workspaceTrigger = modal.querySelector('#hp-workspace-trigger');
    const workspaceSearch = modal.querySelector('#hp-workspace-search');
    const workspaceList = modal.querySelector('#hp-workspace-list');
    const workspaceText = workspaceTrigger.querySelector('.hp-dropdown-text');
    
    const segmentDropdown = modal.querySelector('#hp-segment-dropdown');
    const segmentTrigger = modal.querySelector('#hp-segment-trigger');
    const segmentSearch = modal.querySelector('#hp-segment-search');
    const segmentList = modal.querySelector('#hp-segment-list');
    const segmentText = segmentTrigger.querySelector('.hp-dropdown-text');
    
    const importButton = modal.querySelector('#hp-import');

    let selectedWorkspaceId = '';
    let selectedSegmentId = '';
    let currentSegments = [];

    // Workspace dropdown functionality
    workspaceTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (workspaceTrigger.hasAttribute('disabled')) {
        return;
      }
      
      // Close other dropdowns
      segmentDropdown.classList.remove('hp-dropdown-open');
      
      // Toggle workspace dropdown
      workspaceDropdown.classList.toggle('hp-dropdown-open');
      if (workspaceDropdown.classList.contains('hp-dropdown-open')) {
        workspaceSearch.focus();
      }
    });

    // Workspace search functionality
    workspaceSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredWorkspaces = workspaces.filter(ws => 
        ws.name.toLowerCase().includes(searchTerm)
      );
      
      workspaceList.innerHTML = filteredWorkspaces.map(ws => 
        `<div class="hp-dropdown-item" data-value="${ws.id}">${ws.name}</div>`
      ).join('');
    });

    // Workspace item selection
    workspaceList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('hp-dropdown-item')) {
        const workspaceId = e.target.getAttribute('data-value');
        const workspaceName = e.target.textContent;
        
        selectedWorkspaceId = workspaceId;
        workspaceText.textContent = workspaceName;
        workspaceDropdown.classList.remove('hp-dropdown-open');
        workspaceSearch.value = '';
        
        console.log('[HP Extension] Workspace selected:', workspaceId);
        
        // Reset segment selection
        selectedSegmentId = '';
        segmentText.textContent = 'Loading segments...';
        segmentTrigger.setAttribute('disabled', 'true');
        segmentSearch.disabled = true;
        importButton.disabled = true;
        
        try {
          const segments = await this.fetchSegmentsFromBackground(workspaceId);
          console.log('[HP Extension] Fetched segments for workspace:', segments.length);
          currentSegments = segments;
          
          if (segments.length > 0) {
            segmentList.innerHTML = segments.map(seg => 
              `<div class="hp-dropdown-item" data-value="${seg.id}">${seg.name}</div>`
            ).join('');
            segmentText.textContent = 'Select a segment...';
            segmentTrigger.removeAttribute('disabled');
            segmentSearch.disabled = false;
            segmentSearch.placeholder = 'Search segments...';
          } else {
            segmentList.innerHTML = '<div class="hp-dropdown-item">No segments found</div>';
            segmentText.textContent = 'No segments found';
            segmentSearch.placeholder = 'No segments available';
          }
        } catch (error) {
          console.error('[HP Extension] Error fetching segments:', error);
          segmentList.innerHTML = '<div class="hp-dropdown-item">Error loading segments</div>';
          segmentText.textContent = 'Error loading segments';
          segmentSearch.placeholder = 'Error loading segments';
        }
      }
    });

    // Segment dropdown functionality
    segmentTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (segmentTrigger.hasAttribute('disabled')) {
        return;
      }
      
      // Close other dropdowns
      workspaceDropdown.classList.remove('hp-dropdown-open');
      
      // Toggle segment dropdown
      segmentDropdown.classList.toggle('hp-dropdown-open');
      if (segmentDropdown.classList.contains('hp-dropdown-open')) {
        segmentSearch.focus();
      }
    });

    // Segment search functionality
    segmentSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredSegments = currentSegments.filter(seg => 
        seg.name.toLowerCase().includes(searchTerm)
      );
      
      segmentList.innerHTML = filteredSegments.map(seg => 
        `<div class="hp-dropdown-item" data-value="${seg.id}">${seg.name}</div>`
      ).join('');
    });

    // Segment item selection
    segmentList.addEventListener('click', (e) => {
      if (e.target.classList.contains('hp-dropdown-item')) {
        const segmentId = e.target.getAttribute('data-value');
        const segmentName = e.target.textContent;
        
        if (segmentId) {
          selectedSegmentId = segmentId;
          segmentText.textContent = segmentName;
          segmentDropdown.classList.remove('hp-dropdown-open');
          segmentSearch.value = '';
          
          console.log('[HP Extension] Segment selected:', segmentId);
          
          // Enable import button
          importButton.disabled = false;
        }
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!workspaceDropdown.contains(e.target)) {
        workspaceDropdown.classList.remove('hp-dropdown-open');
      }
      if (!segmentDropdown.contains(e.target)) {
        segmentDropdown.classList.remove('hp-dropdown-open');
      }
    });

    // Import button
    importButton.onclick = () => {
      if (!selectedWorkspaceId || !selectedSegmentId) {
        this.showError('Please select both workspace and segment');
        return;
      }

      this.closeModal(modal);
      this.startDataImport(selectedWorkspaceId, selectedSegmentId);
    };
  }


  async startDataImport(workspaceId, segmentId) {
    try {
      const urlInfo = this.isAllowedUrl();
      const currentUrl = window.location.href;
      
      // Show progress modal
      this.showProgressModal();
      
      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'START_SALES_NAV_IMPORT',
        url: currentUrl,
        searchType: urlInfo.type,
        workspace: workspaceId,
        segment: segmentId
      });
    } catch (error) {
      console.error('Error starting data import:', error);
      this.showError('Failed to start data import. Please try again.');
    }
  }

  showProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'hp-progress-modal';
    modal.className = 'hp-modal-overlay';
    modal.innerHTML = `
      <div class="hp-modal">
        <div class="hp-modal-header">
          <h3>Importing Data</h3>
        </div>
        <div class="hp-modal-body">
          <div class="hp-progress-container">
            <div class="hp-progress-bar">
              <div class="hp-progress-fill" style="width: 0%"></div>
            </div>
            <div class="hp-progress-text">Starting import...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Listen for progress updates from background script
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'salesNavImport') {
        port.onMessage.addListener((message) => {
          this.handleProgressUpdate(message);
        });
      }
    });
  }

  handleProgressUpdate(message) {
    const modal = document.getElementById('hp-progress-modal');
    if (!modal) {return;}

    const progressFill = modal.querySelector('.hp-progress-fill');
    const progressText = modal.querySelector('.hp-progress-text');

    switch (message.type) {
    case 'PROGRESS_UPDATE':
      progressFill.style.width = `${message.progress}%`;
      progressText.textContent = message.status;
      break;
    case 'COMPLETE':
      progressText.textContent = 'Import completed successfully!';
      progressText.style.color = '#27ae60';
      setTimeout(() => {
        this.closeModal(modal);
      }, 2000);
      break;
    case 'ERROR':
      progressText.textContent = `Error: ${message.error}`;
      progressText.style.color = '#e74c3c';
      break;
    case 'LIMIT_EXCEEDED':
      this.closeModal(modal);
      this.showLimitExceededModal(message);
      break;
    }
  }

  showLimitExceededModal(message) {
    console.log('[HP Extension] Showing limit exceeded modal');
    const modal = document.createElement('div');
    modal.className = 'hp-modal-overlay';
    modal.innerHTML = `
      <div class="hp-modal">
        <div class="hp-modal-header">
          <h3>Daily Contact Limit Reached</h3>
          <button class="hp-modal-close">&times;</button>
        </div>
        <div class="hp-modal-body">
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; color: #e74c3c; margin-bottom: 16px;">⚠️</div>
            <p style="font-size: 16px; margin-bottom: 16px; color: #333;">
              You have reached the daily limit of <strong>1,500 contacts</strong> that can be imported in a 24-hour period.
            </p>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              Please try again in <strong>${message.timeUntilReset}</strong>.
            </p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #e74c3c;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Note:</strong> This limit resets every 24 hours from your first import of the day.
              </p>
            </div>
          </div>
        </div>
        <div class="hp-modal-footer">
          <button class="hp-btn-primary" id="hp-limit-ok">OK</button>
        </div>
      </div>
    `;

    // Setup event listeners
    modal.querySelector('.hp-modal-close').onclick = () => {
      console.log('[HP Extension] Limit exceeded modal closed');
      this.closeModal(modal);
    };
    modal.querySelector('#hp-limit-ok').onclick = () => {
      console.log('[HP Extension] Limit exceeded modal OK clicked');
      this.closeModal(modal);
    };

    document.body.appendChild(modal);
    console.log('[HP Extension] Limit exceeded modal added to page');
  }

  closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'hp-toast hp-toast-error';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hp-toast-show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('hp-toast-show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'hp-toast hp-toast-success';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hp-toast-show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('hp-toast-show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Add a visible indicator that the extension is loaded
const indicator = document.createElement('div');
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #16a085;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10000;
  font-family: Arial, sans-serif;
`;
indicator.textContent = 'HP Extension Loaded';
document.body.appendChild(indicator);

// Remove indicator after 3 seconds
setTimeout(() => {
  if (indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}, 3000);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LinkedInSalesNavIntegration();
  });
} else {
  new LinkedInSalesNavIntegration();
}
