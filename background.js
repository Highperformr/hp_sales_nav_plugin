// Background Service Worker for LinkedIn Sales Navigator Integration
console.log('[HP Extension Background] Background script loaded');

// Contact Limit Manager Class
class ContactLimitManager {
  constructor() {
    this.STORAGE_KEY = 'contactImportLimits';
    this.MAX_CONTACTS_PER_24H = 1500;
    this.TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  async getCurrentLimits() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const limits = result[this.STORAGE_KEY] || [];
      
      // Clean up old records (older than 24 hours)
      const now = Date.now();
      const validLimits = limits.filter(record => 
        (now - record.timestamp) < this.TWENTY_FOUR_HOURS_MS
      );
      
      // Update storage if we removed old records
      if (validLimits.length !== limits.length) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: validLimits });
      }
      
      return validLimits;
    } catch (error) {
      console.error('[HP Extension Background] Error getting contact limits:', error);
      return [];
    }
  }

  async getTotalContactsInLast24Hours() {
    const limits = await this.getCurrentLimits();
    return limits.reduce((total, record) => total + record.contactCount, 0);
  }

  async canImportContacts(contactCount) {
    const currentTotal = await this.getTotalContactsInLast24Hours();
    return (currentTotal + contactCount) <= this.MAX_CONTACTS_PER_24H;
  }

  async recordImport(contactCount) {
    try {
      const limits = await this.getCurrentLimits();
      const newRecord = {
        timestamp: Date.now(),
        contactCount: contactCount
      };
      
      limits.push(newRecord);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: limits });
      
      console.log(`[HP Extension Background] Recorded import of ${contactCount} contacts. Total in last 24h: ${await this.getTotalContactsInLast24Hours()}`);
    } catch (error) {
      console.error('[HP Extension Background] Error recording import:', error);
    }
  }

  async getTimeUntilReset() {
    const limits = await this.getCurrentLimits();
    if (limits.length === 0) {
      return 0; // No imports in last 24 hours
    }
    
    // Find the oldest record
    const oldestRecord = limits.reduce((oldest, record) => 
      record.timestamp < oldest.timestamp ? record : oldest
    );
    
    const timeUntilReset = this.TWENTY_FOUR_HOURS_MS - (Date.now() - oldestRecord.timestamp);
    return Math.max(0, timeUntilReset);
  }

  formatTimeUntilReset(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}

class BackgroundService {
  constructor() {
    console.log('[HP Extension Background] BackgroundService constructor called');
    this.setupMessageHandlers();
    this.globalCookieData = null;
    this.rateLimiter = new RateLimiter(30, 60000); // 30 requests per minute (allowing for 2-second delays)
    this.contactLimitManager = new ContactLimitManager();
  }

  setupMessageHandlers() {
    console.log('[HP Extension Background] Setting up message handlers');
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[HP Extension Background] Received message:', message.type, message);
      switch (message.type) {
      case 'START_SALES_NAV_IMPORT':
        console.log('[HP Extension Background] Handling sales nav import');
        this.handleSalesNavImport(message, sender);
        break;
      case 'AUTHENTICATE':
        console.log('[HP Extension Background] Handling authentication');
        this.handleAuthentication(message, sender, sendResponse);
        break;
      case 'LOGOUT':
        console.log('[HP Extension Background] Handling logout');
        this.handleLogout();
        break;
      case 'GET_HIGHPERFORMR_COOKIES':
        console.log('[HP Extension Background] Getting Highperformr cookies');
        this.getHighperformrCookies(sendResponse);
        return true; // Keep message channel open for async response

      case 'CAPTURE_COOKIES_FROM_WINDOW':
        console.log('[HP Extension Background] Capturing cookies from window:', message.windowUrl);
        this.captureCookiesFromWindow(message.windowUrl, sendResponse);
        return true; // Keep message channel open for async response

      case 'CAPTURE_COOKIES_FROM_DOMAIN':
        console.log('[HP Extension Background] Capturing cookies from domain:', message.domain);
        this.captureCookiesFromDomain(message.domain, sendResponse);
        return true; // Keep message channel open for async response
      case 'FETCH_WORKSPACES':
        console.log('[HP Extension Background] Fetching workspaces');
        this.fetchWorkspaces(sendResponse);
        return true; // Keep message channel open for async response
      case 'FETCH_SEGMENTS':
        console.log('[HP Extension Background] Fetching segments for workspace:', message.workspaceId);
        this.fetchSegments(message.workspaceId, sendResponse);
        return true; // Keep message channel open for async response
      case 'VERIFY_SESSION':
        console.log('[HP Extension Background] Verifying session');
        this.verifySession(sendResponse);
        return true; // Keep message channel open for async response
      case 'CAPTURE_COOKIES_FROM_ACTIVE_TAB':
        console.log('[HP Extension Background] Capturing cookies from active tab');
        this.captureCookiesFromActiveTab(sendResponse);
        return true; // Keep message channel open for async response
      case 'CHECK_CONTACT_LIMIT':
        console.log('[HP Extension Background] Checking contact limit for:', message.contactCount);
        this.checkContactLimit(message.contactCount, sendResponse);
        return true; // Keep message channel open for async response
      default:
        console.log('[HP Extension Background] Unknown message type:', message.type);
      }
    });
  }

  async checkContactLimit(contactCount, sendResponse) {
    try {
      console.log('[HP Extension Background] Checking contact limit for', contactCount, 'contacts');
      
      const canImport = await this.contactLimitManager.canImportContacts(contactCount);
      const currentTotal = await this.contactLimitManager.getTotalContactsInLast24Hours();
      
      if (canImport) {
        sendResponse({
          success: true,
          canImport: true,
          currentTotal: currentTotal,
          remaining: this.contactLimitManager.MAX_CONTACTS_PER_24H - currentTotal
        });
      } else {
        const timeUntilReset = await this.contactLimitManager.getTimeUntilReset();
        const formattedTime = this.contactLimitManager.formatTimeUntilReset(timeUntilReset);
        
        sendResponse({
          success: true,
          canImport: false,
          currentTotal: currentTotal,
          limit: this.contactLimitManager.MAX_CONTACTS_PER_24H,
          timeUntilReset: formattedTime,
          timeUntilResetMs: timeUntilReset
        });
      }
    } catch (error) {
      console.error('[HP Extension Background] Error checking contact limit:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async handleSalesNavImport(message, sender) {
    console.log('[HP Extension Background] Starting sales nav import:', message);
    try {
      // Get LinkedIn cookies
      console.log('[HP Extension Background] Getting LinkedIn cookies...');
      await this.getLinkedInCookies();
      
      // Create port for progress updates
      const port = chrome.tabs.connect(sender.tab.id, { name: 'salesNavImport' });
      console.log('[HP Extension Background] Connected to tab for progress updates');
      
      // Start data fetching
      console.log('[HP Extension Background] Starting data fetching...');
      const data = await this.fetchSalesNavData(
        message.url, 
        message.searchType, 
        port
      );
      
      console.log('[HP Extension Background] Data fetching completed, records found:', data.length);
      
      if (data.length === 0) {
        console.log('[HP Extension Background] No data found to import');
        port.postMessage({ 
          type: 'ERROR', 
          error: 'No data found to import' 
        });
        return;
      }

      // Check contact limit before proceeding with import
      console.log('[HP Extension Background] Checking contact limit before import...');
      const canImport = await this.contactLimitManager.canImportContacts(data.length);
      
      if (!canImport) {
        console.log('[HP Extension Background] Contact limit exceeded, blocking import');
        const timeUntilReset = await this.contactLimitManager.getTimeUntilReset();
        const formattedTime = this.contactLimitManager.formatTimeUntilReset(timeUntilReset);
        
        port.postMessage({ 
          type: 'LIMIT_EXCEEDED', 
          error: `Daily contact limit of ${this.contactLimitManager.MAX_CONTACTS_PER_24H} reached. Try again in ${formattedTime}.`,
          timeUntilReset: formattedTime,
          timeUntilResetMs: timeUntilReset
        });
        return;
      }

      // Send to Highperformr API
      console.log('[HP Extension Background] Sending data to Highperformr API...');
      const isCompanySearch = message.searchType && message.searchType.includes('Company');
      await this.sendToHighperformr(data, message.workspace, message.segment, port, isCompanySearch ? 'company' : 'people');
      
      // Record the successful import
      console.log('[HP Extension Background] Recording successful import...');
      await this.contactLimitManager.recordImport(data.length);
      
      console.log('[HP Extension Background] Import completed successfully');
      port.postMessage({ 
        type: 'COMPLETE',
        message: `Successfully imported ${data.length} records`
      });
    } catch (error) {
      console.error('[HP Extension Background] Import failed:', error);
      const port = chrome.tabs.connect(sender.tab.id, { name: 'salesNavImport' });
      port.postMessage({ 
        type: 'ERROR', 
        error: error.message 
      });
    }
  }

  async getLinkedInCookies() {
    try {
      const cookies = await chrome.cookies.getAll({
        domain: '.linkedin.com'
      });
      
      this.globalCookieData = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
    } catch (error) {
      console.error('Error getting LinkedIn cookies:', error);
      throw new Error('Failed to access LinkedIn cookies. Please ensure you are logged into LinkedIn.');
    }
  }

  async fetchSalesNavData(searchUrl, searchType, port) {
    const isCompanySearch = searchType.includes('Company');
    let page = 1;
    let allData = [];
    let hasMore = true;
    const maxPages = isCompanySearch ? 40 : 80; // Allow up to 80 pages for people search (2,000 contacts max with 25 per page)

    port.postMessage({ 
      type: 'PROGRESS_UPDATE', 
      progress: 20, 
      status: 'Initializing data collection steps...' 
    });

    while (hasMore && page <= maxPages) {
      try {
        // Rate limiting
        await this.rateLimiter.canMakeRequest();

        const apiUrl = isCompanySearch 
          ? this.createCompanySalesNaviApiUrl(searchUrl, page)
          : this.createSalesNaviApiUrl(searchUrl, page);

        if (!apiUrl) {
          console.error('Failed to create API URL for page:', page);
          break;
        }
        
        console.log(`[HP Extension Background] Generated API URL for page ${page}:`, apiUrl);

        const response = await this.fetchLinkedInAPI(apiUrl);
        console.log(`[HP Extension Background] LinkedIn API response for page ${page}:`, {
          totalElements: response.elements?.length || 0,
          paging: response.paging,
          url: apiUrl
        });
        
        const processedData = isCompanySearch 
          ? this.processCompanyData(response)
          : this.processPeopleData(response);
          
        console.log(`[HP Extension Background] Processed data for page ${page}:`, {
          transformedCount: processedData.transformedData.length,
          totalRecords: processedData.totalRecords
        });

        allData = allData.concat(processedData.transformedData);

        // Update progress
        const progress = Math.min(40 + (page * 1.5), 60);
        port.postMessage({ 
          type: 'PROGRESS_UPDATE', 
          progress, 
          status: 'Fetching Sales Navigator data...' 
        });

        // Check if we have more data
        const currentBatchSize = processedData.transformedData.length;
        const maxContacts = isCompanySearch ? 1000 : 2000;
        hasMore = currentBatchSize === 25 && allData.length < maxContacts;
        
        console.log(`[HP Extension Background] Page ${page}: Got ${currentBatchSize} contacts, Total: ${allData.length}, HasMore: ${hasMore}, MaxContacts: ${maxContacts}`);
        
        if (currentBatchSize < 25) {
          console.log(`[HP Extension Background] Stopping because batch size (${currentBatchSize}) is less than 25`);
        }
        if (allData.length >= maxContacts) {
          console.log(`[HP Extension Background] Stopping because reached max contacts (${maxContacts})`);
        }
        
        page++;

        // Small delay to be respectful to LinkedIn's servers (2 seconds as per documented flow)
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Error fetching page:', page, error);
        if (error.message.includes('429')) {
          // Rate limited - wait longer
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        break;
      }
    }

    return allData;
  }

  async fetchLinkedInAPI(url) {
    const csrfToken = this.extractCSRFToken();
    
    const response = await fetch(url, {
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'csrf-token': csrfToken,
        'x-li-lang': 'en_US',
        'x-restli-protocol-version': '2.0.0',
        'x-li-identity': 'dXJuOmxpOmVudGVycHJpc2VQcm9maWxlOih1cm46bGk6ZW50ZXJwcmlzZUFjY291bnQ6MzQzNjA1MjM0LDM1NDc2NTQ5NCk',
        'cookie': this.globalCookieData,
        'Referer': 'https://www.linkedin.com/sales/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      method: 'GET'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('LinkedIn authentication expired. Please refresh the page and try again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. Please ensure you have Sales Navigator access.');
      } else if (response.status === 429) {
        throw new Error('Rate limited. Please wait a moment and try again.');
      }
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    return await response.json();
  }

  createSalesNaviApiUrl(salesUrl, page = 1) {
    try {
      const url = new URL(salesUrl);
      const params = new URLSearchParams(url.search);
      const start = (page - 1) * 25;
      
      const recentSearchId = params.get('recentSearchId');
      const savedSearchId = params.get('savedSearchId');
      const sessionId = params.get('sessionId');
      const queryParam = params.get('query');

      const decoration = 'com.linkedin.sales.deco.desktop.searchv2.LeadSearchResult-14';

      if (recentSearchId) {
        return `https://www.linkedin.com/sales-api/salesApiLeadSearch?q=recentSearchId&start=${start}&count=25&recentSearchId=${recentSearchId}&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      } else if (savedSearchId) {
        return `https://www.linkedin.com/sales-api/salesApiLeadSearch?q=savedSearchId&start=${start}&count=25&savedSearchId=${savedSearchId}&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      } else if (queryParam) {
        return `https://www.linkedin.com/sales-api/salesApiLeadSearch?q=searchQuery&query=${queryParam}&start=${start}&count=25&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      }

      return null;
    } catch (error) {
      console.error('Error creating Sales Navigator API URL:', error);
      return null;
    }
  }

  createCompanySalesNaviApiUrl(salesUrl, page = 1) {
    try {
      const url = new URL(salesUrl);
      const params = new URLSearchParams(url.search);
      const start = (page - 1) * 25;
      
      const savedSearchId = params.get('savedSearchId');
      const sessionId = params.get('sessionId');
      const queryParam = params.get('query');
      const recentSearchId = params.get('recentSearchId');

      const decoration = 'com.linkedin.sales.deco.desktop.searchv2.AccountSearchResult-4';

      // Handle saved searches
      if (savedSearchId) {
        return `https://www.linkedin.com/sales-api/salesApiAccountSearch?q=savedSearchId&start=${start}&count=25&savedSearchId=${savedSearchId}&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      } 
      // Handle query searches
      else if (queryParam) {
        return `https://www.linkedin.com/sales-api/salesApiAccountSearch?q=searchQuery&query=${queryParam}&start=${start}&count=25&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      }
      // Handle recent searches
      else if (recentSearchId) {
        return `https://www.linkedin.com/sales-api/salesApiAccountSearch?q=recentSearchId&start=${start}&count=25&recentSearchId=${recentSearchId}&trackingParam=(sessionId:${sessionId})&decorationId=${decoration}`;
      }
      // Handle list searches - extract list parameters from URL
      else {
        // For list searches, we need to extract the list parameters
        const listParams = new URLSearchParams();
        
        // Copy all relevant parameters from the original URL
        for (const [key, value] of params.entries()) {
          if (key !== 'sessionId' && key !== 'savedSearchId' && key !== 'query' && key !== 'recentSearchId') {
            listParams.append(key, value);
          }
        }
        
        // Add pagination and decoration parameters
        listParams.append('start', start.toString());
        listParams.append('count', '25');
        if (sessionId) {
          listParams.append('trackingParam', `(sessionId:${sessionId})`);
        }
        listParams.append('decorationId', decoration);
        
        return `https://www.linkedin.com/sales-api/salesApiAccountSearch?${listParams.toString()}`;
      }
    } catch (error) {
      console.error('Error creating Company Sales Navigator API URL:', error);
      return null;
    }
  }

  processPeopleData(data) {
    try {
      if (!data.elements || !Array.isArray(data.elements)) {
        return { transformedData: [], totalRecords: 0 };
      }

      const transformedData = data.elements.map(element => {
        try {
          const vanityName = element.entityUrn?.split('(')[1]?.split(',')[0];
          const profileURL = vanityName ? `https://www.linkedin.com/in/${vanityName}` : '';
          
          return {
            'Linkedin': profileURL,
            'FullName': element.fullName || '',
            'FirstName': element.firstName || '',
            'LastName': element.lastName || '',
            'CompanyName': element.currentPositions?.[0]?.companyName || '',
            'JobTitle': element.currentPositions?.[0]?.title || '',
            'Location': element.geoRegion || ''
          };
        } catch (error) {
          console.error('Error processing person data:', error);
          return null;
        }
      }).filter(Boolean);

      return { 
        transformedData, 
        totalRecords: data.paging?.total || transformedData.length 
      };
    } catch (error) {
      console.error('Error processing people data:', error);
      return { transformedData: [], totalRecords: 0 };
    }
  }

  processCompanyData(data) {
    try {
      if (!data.elements || !Array.isArray(data.elements)) {
        return { transformedData: [], totalRecords: 0 };
      }

      const transformedData = data.elements.map(element => {
        try {
          // Extract entity ID from entityUrn (format: urn:li:fs_salesCompany:123456)
          const entityUrn = element.entityUrn || '';
          const entityId = entityUrn.replace('urn:li:fs_salesCompany:', '');
          const linkedinUrl = entityId ? `linkedin.com/company/${entityId}` : '';
          
          // Create company details object as specified
          const companyDetails = {
            companyName: element.companyName || '',
            industry: element.industry || ''
          };

          return {
            'contactRecord': companyDetails,
            'CompanyLinkedin': linkedinUrl
          };
        } catch (error) {
          console.error('Error processing company data:', error);
          return null;
        }
      }).filter(Boolean);

      const totalRecords = data.paging?.total || transformedData.length;
      return { 
        transformedData, 
        totalRecords 
      };
    } catch (error) {
      console.error('Error processing company data:', error);
      return { transformedData: [], totalRecords: 0 };
    }
  }

  extractCSRFToken() {
    try {
      const match = this.globalCookieData?.match(/JSESSIONID="([^"]+)"/)?.[1];
      return match || null;
    } catch (error) {
      console.error('Error extracting CSRF token:', error);
      return null;
    }
  }

  async sendToHighperformr(data, workspaceId, segmentId, port, searchType = 'people') {
    try {
      // Set appropriate status message based on search type
      const statusMessage = searchType === 'company' 
        ? 'Adding LinkedIn Company from Sales Navigator as audience to segment...'
        : 'Processing data...';
        
      port.postMessage({ 
        type: 'PROGRESS_UPDATE', 
        progress: 60, 
        status: statusMessage 
      });

      // Get user data
      const userData = await chrome.storage.local.get(['accountId']);
      let accountId = userData.accountId;
      
      // If accountId is not found or is 'unknown', use the workspaceId as fallback
      if (!accountId || accountId === 'unknown') {
        console.log('[HP Extension Background] AccountId not found or unknown, using workspaceId as fallback:', workspaceId);
        accountId = workspaceId;
      }
      
      console.log('[HP Extension Background] Using accountId for API calls:', accountId);

      const api = new HighperformrAPI();
      
      // Determine field mapping based on search type
      let fieldMapping, searchText;
      if (searchType === 'company') {
        searchText = `SN-${new Date().toISOString().replace(/[:.]/g, '-')} - company search`;
        fieldMapping = [
          {
            sourceFieldName: 'contactRecord',
            hpFieldName: 'contact.contactRecord'
          },
          {
            sourceFieldName: 'CompanyLinkedin',
            hpFieldName: 'company.companyLinkedin'
          }
        ];
      } else {
        searchText = `SN-${new Date().toISOString().replace(/[:.]/g, '-')} - people search`;
        fieldMapping = [
          { hpFieldName: 'contact.linkedIn', sourceFieldName: 'Linkedin' },
          { sourceFieldName: 'FullName', hpFieldName: 'contact.fullName' },
          { sourceFieldName: 'FirstName', hpFieldName: 'contact.firstName' },
          { sourceFieldName: 'LastName', hpFieldName: 'contact.lastName' },
          { sourceFieldName: 'JobTitle', hpFieldName: 'contact.title' },
          { sourceFieldName: 'Country', hpFieldName: 'contact.country' },
          { sourceFieldName: 'State', hpFieldName: 'contact.state' },
          { sourceFieldName: 'City', hpFieldName: 'contact.city' },
          { sourceFieldName: 'contactRecord', hpFieldName: 'contact.contactRecord' }
        ];
      }
      
      // Create source data with appropriate field mapping
      const sourceData = [{
        sourceType: 'importFromWebhook',
        sourceMeta: {
          text: searchText,
          config: {
            fieldMapping: fieldMapping
          }
        }
      }];

      port.postMessage({ 
        type: 'PROGRESS_UPDATE', 
        progress: 80, 
        status: 'Creating source...' 
      });

      // Step 1: Create source using exact API from network logs
      console.log('🔨 createSource API call:');
      console.log('  - URL:', `${api.baseURL}/api/sources/bulk-upsert?accountId=${accountId}`);
      console.log('  - Request body:', { sources: sourceData });
      
      const sourceResponse = await api.createSource(accountId, sourceData);
      
      console.log('🔨 createSource response status:', sourceResponse.status);
      console.log('✅ createSource response data:', sourceResponse.data);
      
      port.postMessage({ 
        type: 'PROGRESS_UPDATE', 
        progress: 90, 
        status: 'Adding contacts to source...' 
      });

      // Get the source ID from the response (exact structure from logs)
      // Response structure: {data: {data: [{id: "...", attributes: {...}}]}}
      const sourceId = sourceResponse.data?.data?.[0]?.id;
      
      if (!sourceId) {
        throw new Error('Failed to get source ID from response');
      }

      console.log('🆔 Extracted sourceId:', sourceId);

      // Step 2: Add contacts using exact API from network logs
      console.log('📞 AddContactsToSource API call:');
      console.log('  - URL:', `${api.baseURL}/api/contacts/${sourceId}/bulk-upsert-contacts?accountId=${accountId}`);
      console.log('  - Request body:', { contactsData: data });
      
      const contactsResponse = await api.addContactsToSource(accountId, sourceId, data);
      
      console.log('📞 AddContactsToSource response status:', contactsResponse.status);
      console.log('✅ AddContactsToSource response data:', contactsResponse.data);

      port.postMessage({ 
        type: 'PROGRESS_UPDATE', 
        progress: 95, 
        status: 'Updating segment configuration...' 
      });

      // Step 3: CRITICAL - Update segment to include new source
      console.log('🔧 Updating segment to include new source...');
      await this.updateSegmentWithSource(accountId, sourceId, segmentId);
      
      port.postMessage({ 
        type: 'PROGRESS_UPDATE', 
        progress: 100, 
        status: 'Complete!' 
      });

    } catch (error) {
      console.error('Error sending to Highperformr:', error);
      throw new Error(`Failed to send data to Highperformr.ai: ${error.message}`);
    }
  }

  async updateSegmentWithSource(accountId, sourceId, segment) {
    try {
      // The segment parameter is already the segment ID string
      const segmentId = segment;

      if (!segmentId) {
        throw new Error('Segment ID is required');
      }

      console.log('🔍 Updating segment with ID:', segmentId);
      console.log('🔍 Adding source ID:', sourceId);

      // Step 1: Get existing segment data
      console.log('📋 Getting existing segment data...');
      const cookies = await this.getStoredCookies();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (cookies) {
        headers['Cookie'] = cookies;
        
        // If we have _hp_auth_session but not session, try to use _hp_auth_session as session
        if (cookies.includes('_hp_auth_session') && !cookies.includes('session=')) {
          console.log('[HP Extension Background] Using _hp_auth_session as session cookie for updateSegmentWithSource');
          const authSessionMatch = cookies.match(/_hp_auth_session=([^;]+)/);
          if (authSessionMatch) {
            const sessionValue = authSessionMatch[1];
            headers['Cookie'] = `${cookies}; session=${sessionValue}`;
            console.log('[HP Extension Background] Updated updateSegmentWithSource cookie string with session cookie');
          }
        }
      }

      const getSegmentResponse = await fetch(`https://app.highperformr.ai/api/segments/${segmentId}?accountId=${accountId}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (!getSegmentResponse.ok) {
        throw new Error(`Failed to get segment data: ${getSegmentResponse.status}`);
      }

      const existingSegment = await getSegmentResponse.json();
      console.log('📋 Existing segment data:', existingSegment);

      const existingConditionValues = existingSegment.data?.attributes?.condition?.value || [];
      const existingSegmentSources = existingSegment.data?.attributes?.segmentSources || [];

      console.log('📋 Existing condition values:', existingConditionValues);
      console.log('📋 Existing segment sources:', existingSegmentSources);

      // Step 2: Merge source IDs (avoid duplicates)
      const mergedConditionValues = [...new Set([...existingConditionValues, sourceId])];
      const mergedSegmentSources = [...new Set([...existingSegmentSources, sourceId])];

      console.log('🔄 Merged condition values:', mergedConditionValues);
      console.log('🔄 Merged segment sources:', mergedSegmentSources);

      // Step 3: PATCH segment with updated configuration
      console.log('🔧 PATCHing segment with updated source list...');
      const patchBody = {
        condition: {
          field: 'contact.source',
          value: mergedConditionValues,
          operator: 'IN LIKE'
        },
        segmentSources: mergedSegmentSources
      };

      console.log('🔧 PATCH request body:', patchBody);

      const response = await fetch(`https://app.highperformr.ai/api/segments/${segmentId}?accountId=${accountId}`, {
        method: 'PATCH',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(patchBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to update segment: ${response.status}`);
      }

      const patchResult = await response.json();
      console.log('✅ Segment PATCH completed successfully:', patchResult);

      // Step 4: Verify the update
      console.log('🔍 Verifying segment update...');
      const verifyResponse = await fetch(`https://app.highperformr.ai/api/segments/${segmentId}?accountId=${accountId}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (verifyResponse.ok) {
        const segmentAfterPatch = await verifyResponse.json();
        console.log('✅ Segment state AFTER PATCH:', segmentAfterPatch.data?.attributes?.segmentSources);
        console.log('✅ Condition AFTER PATCH:', segmentAfterPatch.data?.attributes?.condition);
      }

      console.log('✅ Segment update completed - contacts now visible in segment');
      
    } catch (error) {
      console.error('❌ Error updating segment with source:', error);
      throw error;
    }
  }

  handleLogout() {
    chrome.storage.local.clear();
  }

  async getHighperformrCookies(sendResponse) {
    try {
      console.log('[HP Extension Background] Getting Highperformr cookies');
      const cookies = await chrome.cookies.getAll({
        domain: '.highperformr.ai'
      });
      
      console.log('[HP Extension Background] Found cookies:', cookies.length);
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('[HP Extension Background] Cookie string length:', cookieString.length);
      console.log('[HP Extension Background] Cookie string:', cookieString);
      sendResponse({ cookies: cookieString });
    } catch (error) {
      console.error('[HP Extension Background] Error getting Highperformr cookies:', error);
      sendResponse({ cookies: '' });
    }
  }

  async captureCookiesFromWindow(windowUrl, sendResponse) {
    try {
      console.log('[HP Extension Background] Capturing cookies from window:', windowUrl);
      
      // Extract domain from URL
      const url = new URL(windowUrl);
      const domain = url.hostname;
      
      console.log('[HP Extension Background] Extracting cookies for domain:', domain);
      
      // Get all cookies for the domain
      const cookies = await chrome.cookies.getAll({
        domain: domain
      });
      
      console.log('[HP Extension Background] Found cookies for domain:', cookies.length);
      
      // Also get cookies for parent domains (like .highperformr.ai)
      const parentDomain = domain.startsWith('.') ? domain : `.${  domain.split('.').slice(-2).join('.')}`;
      console.log('[HP Extension Background] Also checking parent domain:', parentDomain);
      
      const parentCookies = await chrome.cookies.getAll({
        domain: parentDomain
      });
      
      console.log('[HP Extension Background] Found parent domain cookies:', parentCookies.length);
      
      // Combine all cookies
      const allCookies = [...cookies, ...parentCookies];
      
      // Remove duplicates based on cookie name
      const uniqueCookies = allCookies.reduce((acc, cookie) => {
        if (!acc.find(c => c.name === cookie.name && c.domain === cookie.domain)) {
          acc.push(cookie);
        }
        return acc;
      }, []);
      
      console.log('[HP Extension Background] Unique cookies after deduplication:', uniqueCookies.length);
      
      // Create cookie string
      const cookieString = uniqueCookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('[HP Extension Background] Captured cookie string length:', cookieString.length);
      console.log('[HP Extension Background] Captured cookies text:', cookieString);
      
      // Store cookies in extension storage
      await chrome.storage.local.set({
        highperformrCookies: cookieString,
        cookieCaptureTime: Date.now()
      });
      
      console.log('[HP Extension Background] Cookies stored in extension storage');
      
      sendResponse({ 
        success: true, 
        cookies: cookieString,
        cookieCount: uniqueCookies.length
      });
    } catch (error) {
      console.error('[HP Extension Background] Error capturing cookies from window:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async captureCookiesFromDomain(domain, sendResponse) {
    try {
      console.log('[HP Extension Background] Capturing cookies from domain:', domain);
      
      // Get cookies from ALL possible domain variations to ensure we capture the session cookie
      const domainVariations = [
        domain,
        'app.highperformr.ai',
        'auth.highperformr.ai', 
        'highperformr.ai',
        '.app.highperformr.ai',
        '.auth.highperformr.ai',
        '.highperformr.ai',
        'www.highperformr.ai',
        '.www.highperformr.ai'
      ];
      
      console.log('[HP Extension Background] Trying to capture cookies from domains:', domainVariations);
      
      let allCookies = [];
      
      for (const domainVar of domainVariations) {
        try {
          const cookies = await chrome.cookies.getAll({
            domain: domainVar
          });
          console.log(`[HP Extension Background] Found ${cookies.length} cookies for domain: ${domainVar}`);
          
          // Log individual cookie names for debugging, with special attention to session cookies
          cookies.forEach(cookie => {
            const isSessionCookie = cookie.name === 'session' || cookie.name.includes('session') || cookie.name.includes('auth');
            const logPrefix = isSessionCookie ? '🔑 SESSION COOKIE:' : '[HP Extension Background] Cookie:';
            console.log(`${logPrefix} ${cookie.name} (domain: ${cookie.domain}, path: ${cookie.path}, secure: ${cookie.secure}, httpOnly: ${cookie.httpOnly}, value: ${cookie.value.substring(0, 50)}...)`);
            
            if (cookie.name === 'session') {
              console.log('🎯 FOUND THE SESSION COOKIE! Domain:', cookie.domain, 'Path:', cookie.path);
            }
          });
          
          allCookies = allCookies.concat(cookies);
        } catch (error) {
          console.log(`[HP Extension Background] Error getting cookies for ${domainVar}:`, error.message);
        }
      }
      
      // Remove duplicates based on cookie name and domain
      const uniqueCookies = allCookies.reduce((acc, cookie) => {
        const key = `${cookie.name}_${cookie.domain}`;
        if (!acc.find(c => `${c.name}_${c.domain}` === key)) {
          acc.push(cookie);
        }
        return acc;
      }, []);
      
      console.log('[HP Extension Background] Total unique cookies found:', uniqueCookies.length);
      
      // Create cookie string
      const cookieString = uniqueCookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('[HP Extension Background] Captured cookie string length:', cookieString.length);
      console.log('[HP Extension Background] Captured cookies text:', cookieString);
      
      // Log specific important cookies with detailed analysis
      const importantCookies = ['session', '_hp_auth_session', 'g_csrf_token'];
      importantCookies.forEach(cookieName => {
        const cookie = uniqueCookies.find(c => c.name === cookieName);
        if (cookie) {
          console.log(`[HP Extension Background] Found important cookie ${cookieName}: ${cookie.value.substring(0, 50)}...`);
          console.log(`[HP Extension Background] Cookie ${cookieName} domain: ${cookie.domain}, path: ${cookie.path}, secure: ${cookie.secure}, httpOnly: ${cookie.httpOnly}`);
        } else {
          console.log(`[HP Extension Background] Missing important cookie: ${cookieName}`);
        }
      });
      
      // Check if we have the critical session cookie
      const sessionCookie = uniqueCookies.find(c => c.name === 'session');
      if (!sessionCookie) {
        console.log('[HP Extension Background] CRITICAL: No session cookie found! This will cause 401 errors.');
        
        // Try to find any cookies that might be the session cookie
        const possibleSessionCookies = uniqueCookies.filter(c => 
          c.name.includes('session') || 
          c.name.includes('auth') || 
          (c.value && c.value.startsWith('eyJ')) // JWT tokens start with eyJ
        );
        
        console.log('[HP Extension Background] Possible session cookies found:', possibleSessionCookies.map(c => c.name));
      } else {
        console.log('[HP Extension Background] SUCCESS: Found session cookie!');
      }
      
      // Store cookies in extension storage
      await chrome.storage.local.set({
        highperformrCookies: cookieString,
        cookieCaptureTime: Date.now()
      });
      
      console.log('[HP Extension Background] Cookies stored in extension storage');
      
      sendResponse({ 
        success: true, 
        cookies: cookieString,
        cookieCount: uniqueCookies.length
      });
    } catch (error) {
      console.error('[HP Extension Background] Error capturing cookies from domain:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async captureCookiesFromActiveTab(sendResponse) {
    try {
      console.log('[HP Extension Background] Attempting to capture cookies from active tab');
      
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        console.log('[HP Extension Background] No active tab found');
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      
      const activeTab = tabs[0];
      console.log('[HP Extension Background] Active tab URL:', activeTab.url);
      
      // Check if the active tab is on highperformr.ai
      if (!activeTab.url || !activeTab.url.includes('highperformr.ai')) {
        console.log('[HP Extension Background] Active tab is not on highperformr.ai domain');
        sendResponse({ success: false, error: 'Active tab not on highperformr.ai' });
        return;
      }
      
      // Try to get cookies for the active tab's URL
      const url = new URL(activeTab.url);
      const domain = url.hostname;
      console.log('[HP Extension Background] Extracting cookies for active tab domain:', domain);
      
      const cookies = await chrome.cookies.getAll({ url: activeTab.url });
      console.log('[HP Extension Background] Found cookies for active tab:', cookies.length);
      
      // Log all cookies found
      cookies.forEach(cookie => {
        const isSessionCookie = cookie.name === 'session' || cookie.name.includes('session');
        const logPrefix = isSessionCookie ? '🔑 ACTIVE TAB SESSION COOKIE:' : '[HP Extension Background] Active tab cookie:';
        console.log(`${logPrefix} ${cookie.name} (domain: ${cookie.domain}, value: ${cookie.value.substring(0, 50)}...)`);
      });
      
      // Create cookie string
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('[HP Extension Background] Active tab cookie string length:', cookieString.length);
      
      sendResponse({
        success: true,
        cookies: cookieString,
        cookieCount: cookies.length,
        source: 'active_tab',
        tabUrl: activeTab.url
      });
      
    } catch (error) {
      console.error('[HP Extension Background] Error capturing cookies from active tab:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async fetchWorkspaces(sendResponse) {
    try {
      console.log('[HP Extension Background] Fetching workspaces');
      const cookies = await this.getStoredCookies();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (cookies) {
        headers['Cookie'] = cookies;
        
        // If we have _hp_auth_session but not session, try to use _hp_auth_session as session
        if (cookies.includes('_hp_auth_session') && !cookies.includes('session=')) {
          console.log('[HP Extension Background] Using _hp_auth_session as session cookie for workspaces');
          const authSessionMatch = cookies.match(/_hp_auth_session=([^;]+)/);
          if (authSessionMatch) {
            const sessionValue = authSessionMatch[1];
            headers['Cookie'] = `${cookies}; session=${sessionValue}`;
            console.log('[HP Extension Background] Updated workspaces cookie string with session cookie');
          }
        }
      }

      // Use the session API to get workspaces (accounts)
      const response = await fetch('https://app.highperformr.ai/api/users/session', {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('[HP Extension Background] Workspaces response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch workspaces: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const userData = await response.json();
        console.log('[HP Extension Background] Fetched user data for workspaces:', userData);
        
        // Extract workspaces from the session data
        const workspaces = userData.data?.attributes?.accounts || [];
        console.log('[HP Extension Background] Extracted workspaces:', workspaces.length);
        
        sendResponse({ 
          success: true, 
          workspaces: workspaces 
        });
      } else {
        console.log('[HP Extension Background] Response is not JSON, returning empty workspaces');
        sendResponse({ 
          success: true, 
          workspaces: [] 
        });
      }
    } catch (error) {
      console.error('[HP Extension Background] Error fetching workspaces:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        workspaces: []
      });
    }
  }

  async fetchSegments(workspaceId, sendResponse) {
    try {
      console.log('[HP Extension Background] Fetching segments for workspace:', workspaceId);
      const cookies = await this.getStoredCookies();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (cookies) {
        headers['Cookie'] = cookies;
        
        // If we have _hp_auth_session but not session, try to use _hp_auth_session as session
        if (cookies.includes('_hp_auth_session') && !cookies.includes('session=')) {
          console.log('[HP Extension Background] Using _hp_auth_session as session cookie for segments');
          const authSessionMatch = cookies.match(/_hp_auth_session=([^;]+)/);
          if (authSessionMatch) {
            const sessionValue = authSessionMatch[1];
            headers['Cookie'] = `${cookies}; session=${sessionValue}`;
            console.log('[HP Extension Background] Updated segments cookie string with session cookie');
          }
        }
      }

      // Use the segments API with the workspace ID as accountId
      const response = await fetch(`https://app.highperformr.ai/api/segments/filter-segments?accountId=${workspaceId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ limit: 1000 }),
        credentials: 'include'
      });

      console.log('[HP Extension Background] Segments response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch segments: ${response.status}`);
      }

      const segmentsData = await response.json();
      console.log('[HP Extension Background] Segments response data:', segmentsData);
      
      // Extract segments from the response
      const segments = segmentsData.data || [];
      console.log('[HP Extension Background] Extracted segments:', segments.length);
      
      // Map the segments to the expected format
      const mappedSegments = segments.map(segment => ({
        id: segment.id,
        name: segment.attributes?.name || segment.name || 'Unnamed Segment'
      }));
      
      console.log('[HP Extension Background] Mapped segments:', mappedSegments.length);
      
      sendResponse({ 
        success: true, 
        segments: mappedSegments 
      });
    } catch (error) {
      console.error('[HP Extension Background] Error fetching segments:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        segments: []
      });
    }
  }

  async verifySession(sendResponse) {
    try {
      console.log('[HP Extension Background] Verifying session');
      const cookies = await this.getStoredCookies();
      console.log('[HP Extension Background] Using cookies for verification (length):', cookies.length);
      console.log('[HP Extension Background] Cookie content:', cookies);
      
      // Match the successful browser request headers exactly
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      };
      
      if (cookies) {
        headers['Cookie'] = cookies;
        
        // Check for specific important cookies in the cookie string
        const importantCookies = ['session', '_hp_auth_session', 'g_csrf_token'];
        importantCookies.forEach(cookieName => {
          if (cookies.includes(cookieName)) {
            console.log(`[HP Extension Background] Found ${cookieName} in cookie string`);
          } else {
            console.log(`[HP Extension Background] Missing ${cookieName} in cookie string`);
          }
        });
        
        // Simply use the cookies as captured - the main issue is we need the actual session cookie
        console.log('[HP Extension Background] Using captured cookies directly');
        
        // Check what important cookies we have
        const hasSessionCookie = cookies.includes('session=');
        const hasAuthSessionCookie = cookies.includes('_hp_auth_session=');
        
        console.log('[HP Extension Background] Has session cookie:', hasSessionCookie);
        console.log('[HP Extension Background] Has _hp_auth_session cookie:', hasAuthSessionCookie);
        
        if (!hasSessionCookie) {
          console.log('[HP Extension Background] WARNING: No session cookie found - this will likely cause 401 error');
          console.log('[HP Extension Background] Available cookies:', cookies.split(';').map(c => c.trim().split('=')[0]).join(', '));
        } else {
          console.log('[HP Extension Background] SUCCESS: Found session cookie in request');
        }
        
        console.log('[HP Extension Background] Final cookie string length:', headers['Cookie'].length);
      } else {
        console.log('[HP Extension Background] No cookies available for session verification');
      }

      console.log('[HP Extension Background] Making session API call with headers:', headers);

      // Make the session API call from background script (no CORS restrictions)
      const response = await fetch('https://app.highperformr.ai/api/users/session', {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('[HP Extension Background] Session verification response status:', response.status);
      console.log('[HP Extension Background] Session verification response headers:', [...response.headers.entries()]);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('[HP Extension Background] Response content-type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const userData = await response.json();
          console.log('[HP Extension Background] Session verification successful, user data:', userData);
          
          // Store the session data
          await chrome.storage.local.set({
            isAuthenticated: true,
            userId: userData.id,
            accountId: userData.accountId,
            workspaces: userData.workspaces
          });
          
          sendResponse({ 
            success: true, 
            authenticated: true,
            userData: userData
          });
        } else {
          // Got 200 but not JSON - might still be valid
          console.log('[HP Extension Background] Got 200 but not JSON - considering session valid');
          const responseText = await response.text();
          console.log('[HP Extension Background] Response text (first 200 chars):', responseText.substring(0, 200));
          
          sendResponse({ 
            success: true, 
            authenticated: true,
            userData: null
          });
        }
      } else {
        console.log('[HP Extension Background] Session verification failed with status:', response.status);
        
        // Try to get error response body for more details
        try {
          const errorText = await response.text();
          console.log('[HP Extension Background] Error response body:', errorText);
        } catch (e) {
          console.log('[HP Extension Background] Could not read error response body');
        }
        
        sendResponse({ 
          success: true, 
          authenticated: false,
          error: `Session verification failed: ${response.status}`
        });
      }
    } catch (error) {
      console.error('[HP Extension Background] Session verification error:', error);
      sendResponse({ 
        success: false, 
        authenticated: false,
        error: error.message
      });
    }
  }

  async getStoredCookies() {
    console.log('[HP Extension Background] Getting stored cookies');
    try {
      const result = await chrome.storage.local.get(['highperformrCookies']);
      const cookies = result.highperformrCookies || '';
      console.log('[HP Extension Background] Stored cookies length:', cookies.length);
      return cookies;
    } catch (error) {
      console.error('[HP Extension Background] Error getting stored cookies:', error);
      return '';
    }
  }
}

// Rate Limiter Class
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.canMakeRequest();
    }

    this.requests.push(now);
    return true;
  }
}

// Highperformr API Client
class HighperformrAPI {
  constructor() {
    this.baseURL = 'https://app.highperformr.ai';
  }

  async createSource(accountId, sourceData) {
    console.log('[HP Extension Background] Creating source with accountId:', accountId);
    const cookies = await this.getStoredCookies();
    const headers = { 'Content-Type': 'application/json' };
    
    if (cookies) {
      headers['Cookie'] = cookies;
      
      // If we have _hp_auth_session but not session, try to use _hp_auth_session as session
      if (cookies.includes('_hp_auth_session') && !cookies.includes('session=')) {
        console.log('[HP Extension Background] Using _hp_auth_session as session cookie for createSource');
        const authSessionMatch = cookies.match(/_hp_auth_session=([^;]+)/);
        if (authSessionMatch) {
          const sessionValue = authSessionMatch[1];
          headers['Cookie'] = `${cookies}; session=${sessionValue}`;
          console.log('[HP Extension Background] Updated createSource cookie string with session cookie');
        }
      }
    }

    // Use the exact API endpoint from the network logs
    const response = await fetch(`${this.baseURL}/api/sources/bulk-upsert?accountId=${accountId}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ sources: sourceData }),
      credentials: 'include'
    });

    console.log('[HP Extension Background] Create source response status:', response.status);

    if (!response.ok) {
      throw new Error(`Create source failed: ${response.status}`);
    }

    const responseData = await response.json();
    
    // Return both status and data for logging
    return {
      status: response.status,
      data: responseData
    };
  }

  async addContactsToSource(accountId, sourceId, contactsData) {
    console.log('[HP Extension Background] Adding contacts to source:', sourceId);
    const cookies = await this.getStoredCookies();
    const headers = { 'Content-Type': 'application/json' };
    
    if (cookies) {
      headers['Cookie'] = cookies;
      
      // If we have _hp_auth_session but not session, try to use _hp_auth_session as session
      if (cookies.includes('_hp_auth_session') && !cookies.includes('session=')) {
        console.log('[HP Extension Background] Using _hp_auth_session as session cookie for addContactsToSource');
        const authSessionMatch = cookies.match(/_hp_auth_session=([^;]+)/);
        if (authSessionMatch) {
          const sessionValue = authSessionMatch[1];
          headers['Cookie'] = `${cookies}; session=${sessionValue}`;
          console.log('[HP Extension Background] Updated addContactsToSource cookie string with session cookie');
        }
      }
    }

    // Use the exact API endpoint from the network logs
    const response = await fetch(`${this.baseURL}/api/contacts/${sourceId}/bulk-upsert-contacts?accountId=${accountId}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ contactsData }),
      credentials: 'include'
    });

    console.log('[HP Extension Background] Add contacts response status:', response.status);

    if (!response.ok) {
      throw new Error(`Add contacts failed: ${response.status}`);
    }

    const responseData = await response.json();
    
    // Return both status and data for logging
    return {
      status: response.status,
      data: responseData
    };
  }


  async getStoredCookies() {
    console.log('[HP Extension Background] Getting stored cookies');
    try {
      const result = await chrome.storage.local.get(['highperformrCookies']);
      const cookies = result.highperformrCookies || '';
      console.log('[HP Extension Background] Stored cookies length:', cookies.length);
      return cookies;
    } catch (error) {
      console.error('[HP Extension Background] Error getting stored cookies:', error);
      return '';
    }
  }
}

// Initialize background service
new BackgroundService();
