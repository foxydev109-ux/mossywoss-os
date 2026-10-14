/**
 * MossyWoss OS Web Browser - Client Logic & Native Bridge
 */

(function () {
  'use strict';

  const DEFAULT_HOME_URL = 'https://duckduckgo.com';
  const SEARCH_ENGINE_URL = 'https://duckduckgo.com/?q=';

  // State
  let tabs = [];
  let activeTabIndex = -1;
  let bookmarks = [];
  let history = [];

  // DOM Elements
  const tabBar = document.getElementById('tab-bar');
  const addressBar = document.getElementById('address-bar');
  const contentFrame = document.getElementById('content-frame');
  const loadingBar = document.getElementById('loading-bar');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const sidebar = document.getElementById('sidebar');
  const bookmarksBar = document.getElementById('bookmarks-bar');
  const historyList = document.getElementById('history-list');
  const bookmarksList = document.getElementById('bookmarks-list');
  const securityBadge = document.getElementById('security-badge');

  /**
   * Initialize Browser Subsystem
   */
  function init() {
    loadStoredData();
    detectLayout();
    
    // Add default initial tab if none exists
    if (tabs.length === 0) {
      addTab(DEFAULT_HOME_URL, 'DuckDuckGo');
    } else {
      renderTabs();
      switchTab(0);
    }

    renderBookmarks();
    renderHistory();

    // Event listeners
    window.addEventListener('resize', detectLayout);
    
    if (contentFrame) {
      contentFrame.addEventListener('load', onFrameLoad);
      contentFrame.addEventListener('error', onFrameError);
    }

    // Expose MWOBridge for native shell postMessage communication
    setupNativeBridge();
  }

  /**
   * Load Bookmarks & History from LocalStorage
   */
  function loadStoredData() {
    try {
      const storedBookmarks = localStorage.getItem('mwo_browser_bookmarks');
      bookmarks = storedBookmarks ? JSON.parse(storedBookmarks) : [
        { url: 'https://duckduckgo.com', title: 'DuckDuckGo' },
        { url: 'https://wikipedia.org', title: 'Wikipedia' },
        { url: 'https://github.com', title: 'GitHub' }
      ];

      const storedHistory = localStorage.getItem('mwo_browser_history');
      history = storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
      bookmarks = [
        { url: 'https://duckduckgo.com', title: 'DuckDuckGo' }
      ];
      history = [];
    }
  }

  function saveBookmarks() {
    try {
      localStorage.setItem('mwo_browser_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {}
    renderBookmarks();
  }

  function saveHistory() {
    try {
      localStorage.setItem('mwo_browser_history', JSON.stringify(history));
    } catch (e) {}
    renderHistory();
  }

  /**
   * Layout Detection (Phone vs Tablet vs Desktop)
   */
  function detectLayout() {
    const width = window.innerWidth;
    const isPhone = width <= 480;
    const isTablet = width > 480 && width <= 768;
    const isDesktop = width > 768;

    document.body.classList.toggle('layout-phone', isPhone);
    document.body.classList.toggle('layout-tablet', isTablet);
    document.body.classList.toggle('layout-desktop', isDesktop);
  }

  /**
   * URL Normalization & Validation
   */
  function normalizeUrl(input) {
    if (!input || typeof input !== 'string') return DEFAULT_HOME_URL;
    let trimmed = input.trim();
    if (!trimmed) return DEFAULT_HOME_URL;

    // Check if valid URL or search term
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const looksLikeDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);

    if (hasProtocol) {
      return trimmed;
    } else if (looksLikeDomain) {
      return 'https://' + trimmed;
    } else {
      // Treat as search query
      return SEARCH_ENGINE_URL + encodeURIComponent(trimmed);
    }
  }

  /**
   * Navigation Logic
   */
  function navigate(inputUrl) {
    if (activeTabIndex < 0 || activeTabIndex >= tabs.length) return;

    const targetUrl = normalizeUrl(inputUrl);
    const currentTab = tabs[activeTabIndex];

    showLoading(true);
    hideError();

    // Update Tab state
    currentTab.url = targetUrl;
    currentTab.title = extractTitleFromUrl(targetUrl);
    
    // Add to history stack for tab
    if (currentTab.history[currentTab.historyIndex] !== targetUrl) {
      currentTab.history = currentTab.history.slice(0, currentTab.historyIndex + 1);
      currentTab.history.push(targetUrl);
      currentTab.historyIndex = currentTab.history.length - 1;
    }

    // Update Address Bar UI
    addressBar.value = targetUrl;
    updateSecurityBadge(targetUrl);

    // Record in global browsing history
    recordHistory(targetUrl, currentTab.title);

    // Update frame src
    if (contentFrame) {
      contentFrame.src = targetUrl;
    }

    renderTabs();

    // Notify native shell
    notifyNativeShell('navigate', { url: targetUrl, title: currentTab.title });
  }

  function goBack() {
    if (activeTabIndex < 0) return;
    const currentTab = tabs[activeTabIndex];
    if (currentTab.historyIndex > 0) {
      currentTab.historyIndex--;
      const prevUrl = currentTab.history[currentTab.historyIndex];
      navigate(prevUrl);
    }
  }

  function goForward() {
    if (activeTabIndex < 0) return;
    const currentTab = tabs[activeTabIndex];
    if (currentTab.historyIndex < currentTab.history.length - 1) {
      currentTab.historyIndex++;
      const nextUrl = currentTab.history[currentTab.historyIndex];
      navigate(nextUrl);
    }
  }

  function reload() {
    if (activeTabIndex < 0) return;
    const currentTab = tabs[activeTabIndex];
    navigate(currentTab.url);
  }

  function goHome() {
    navigate(DEFAULT_HOME_URL);
  }

  function search(query) {
    if (!query) return;
    navigate(SEARCH_ENGINE_URL + encodeURIComponent(query));
  }

  /**
   * Tab Management
   */
  function addTab(url = DEFAULT_HOME_URL, title = 'New Tab') {
    const normUrl = normalizeUrl(url);
    const newTab = {
      id: Date.now() + Math.random(),
      url: normUrl,
      title: title || extractTitleFromUrl(normUrl),
      history: [normUrl],
      historyIndex: 0
    };

    tabs.push(newTab);
    renderTabs();
    switchTab(tabs.length - 1);
  }

  function closeTab(index, event) {
    if (event) event.stopPropagation();
    if (index < 0 || index >= tabs.length) return;

    tabs.splice(index, 1);

    if (tabs.length === 0) {
      addTab(DEFAULT_HOME_URL, 'DuckDuckGo');
    } else {
      let nextIndex = activeTabIndex;
      if (index <= activeTabIndex) {
        nextIndex = Math.max(0, activeTabIndex - 1);
      }
      renderTabs();
      switchTab(nextIndex);
    }
  }

  function switchTab(index) {
    if (index < 0 || index >= tabs.length) return;
    activeTabIndex = index;
    const tab = tabs[activeTabIndex];

    renderTabs();
    addressBar.value = tab.url;
    updateSecurityBadge(tab.url);

    showLoading(true);
    hideError();

    if (contentFrame && contentFrame.src !== tab.url) {
      contentFrame.src = tab.url;
    } else {
      showLoading(false);
    }
  }

  function renderTabs() {
    if (!tabBar) return;
    tabBar.innerHTML = '';

    tabs.forEach((tab, index) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (index === activeTabIndex ? ' active' : '');
      tabEl.onclick = () => switchTab(index);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.title || 'New Tab';

      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => closeTab(index, e);

      tabEl.appendChild(titleSpan);
      tabEl.appendChild(closeBtn);
      tabBar.appendChild(tabEl);
    });
  }

  /**
   * Bookmark Operations
   */
  function addBookmark(url, title) {
    const targetUrl = url || (tabs[activeTabIndex] ? tabs[activeTabIndex].url : DEFAULT_HOME_URL);
    const targetTitle = title || (tabs[activeTabIndex] ? tabs[activeTabIndex].title : 'Bookmark');

    // Avoid duplicates
    if (!bookmarks.some(b => b.url === targetUrl)) {
      bookmarks.push({ url: targetUrl, title: targetTitle });
      saveBookmarks();
    }
  }

  function renderBookmarks() {
    if (!bookmarksBar || !bookmarksList) return;

    // Render horizontal bar
    bookmarksBar.innerHTML = '';
    bookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.textContent = bm.title;
      item.onclick = () => navigate(bm.url);
      bookmarksBar.appendChild(item);
    });

    // Render sidebar list
    bookmarksList.innerHTML = '';
    bookmarks.forEach(bm => {
      const li = document.createElement('li');
      li.className = 'bookmark-list-item';
      li.innerHTML = `<div class="history-title">${escapeHtml(bm.title)}</div><div class="history-url">${escapeHtml(bm.url)}</div>`;
      li.onclick = () => navigate(bm.url);
      bookmarksList.appendChild(li);
    });
  }

  /**
   * History Tracking
   */
  function recordHistory(url, title) {
    // Remove recent duplicates
    history = history.filter(h => h.url !== url);
    history.unshift({
      url: url,
      title: title || extractTitleFromUrl(url),
      timestamp: new Date().toLocaleTimeString()
    });

    // Keep max 100 history items
    if (history.length > 100) history.pop();
    saveHistory();
  }

  function listHistory() {
    return history;
  }

  function clearHistory() {
    history = [];
    saveHistory();
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';

    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div class="history-title">${escapeHtml(item.title)}</div>
        <div class="history-url">${escapeHtml(item.url)}</div>
      `;
      li.onclick = () => navigate(item.url);
      historyList.appendChild(li);
    });
  }

  /**
   * UI Helpers
   */
  function showLoading(show) {
    if (!loadingBar) return;
    if (show) {
      loadingBar.classList.remove('hidden');
      loadingBar.style.width = '70%';
    } else {
      loadingBar.style.width = '100%';
      setTimeout(() => {
        loadingBar.classList.add('hidden');
        loadingBar.style.width = '0%';
      }, 200);
    }
  }

  function showError(msg) {
    showLoading(false);
    if (errorContainer && errorMessage) {
      errorMessage.textContent = msg || 'Failed to load webpage due to cross-origin security restrictions or network issues.';
      errorContainer.classList.remove('hidden');
    }
  }

  function hideError() {
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }

  function updateSecurityBadge(url) {
    if (!securityBadge) return;
    if (url.startsWith('https://')) {
      securityBadge.innerHTML = '&#128274;';
      securityBadge.style.color = '#2ed573';
      securityBadge.title = 'Secure Connection (HTTPS)';
    } else {
      securityBadge.innerHTML = '&#9888;';
      securityBadge.style.color = '#ffa502';
      securityBadge.title = 'Insecure Connection (HTTP)';
    }
  }

  function onFrameLoad() {
    showLoading(false);
    if (activeTabIndex >= 0 && activeTabIndex < tabs.length && contentFrame) {
      try {
        if (contentFrame.contentDocument && contentFrame.contentDocument.title) {
          tabs[activeTabIndex].title = contentFrame.contentDocument.title;
          renderTabs();
        }
      } catch (e) {
        // Cross-origin restriction expected for external pages
      }
    }
  }

  function onFrameError() {
    showError('Could not load frame resource.');
  }

  function extractTitleFromUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toggleSidebar() {
    if (sidebar) {
      sidebar.classList.toggle('hidden');
    }
  }

  function switchSidebarTab(tabName) {
    const historyPanel = document.getElementById('sidebar-history-panel');
    const bookmarksPanel = document.getElementById('sidebar-bookmarks-panel');
    const tabBtns = document.querySelectorAll('.sidebar-tab');

    tabBtns.forEach(btn => btn.classList.remove('active'));

    if (tabName === 'history') {
      historyPanel.classList.remove('hidden');
      bookmarksPanel.classList.add('hidden');
      if (tabBtns[0]) tabBtns[0].classList.add('active');
    } else {
      historyPanel.classList.add('hidden');
      bookmarksPanel.classList.remove('hidden');
      if (tabBtns[1]) tabBtns[1].classList.add('active');
    }
  }

  /**
   * MWO Native Shell Bridge Protocol
   */
  function setupNativeBridge() {
    // Window global object for native shell bindings
    window.MWOBridge = {
      navigate: function (url) {
        navigate(url);
      },
      open: function (url, title) {
        addTab(url, title);
      },
      close: function (index) {
        closeTab(typeof index === 'number' ? index : activeTabIndex);
      },
      download: function (fileUrl) {
        notifyNativeShell('download', { url: fileUrl });
      },
      getHistory: function () {
        return listHistory();
      }
    };

    // Listen for postMessage from parent desktop shell
    window.addEventListener('message', function (event) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'mwo-navigate':
          navigate(msg.url);
          break;
        case 'mwo-add-tab':
          addTab(msg.url, msg.title);
          break;
        case 'mwo-reload':
          reload();
          break;
        case 'mwo-theme-change':
          if (msg.theme) applyNativeTheme(msg.theme);
          break;
        default:
          break;
      }
    });
  }

  function notifyNativeShell(action, payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'mwo-shell-event',
        action: action,
        data: payload
      }, '*');
    }
  }

  function applyNativeTheme(theme) {
    if (!theme) return;
    if (theme.bg_primary) document.documentElement.style.setProperty('--bg-primary', theme.bg_primary);
    if (theme.accent) document.documentElement.style.setProperty('--accent-color', theme.accent);
  }

  // Global Exports for inline onclick handlers
  window.navigate = navigate;
  window.goBack = goBack;
  window.goForward = goForward;
  window.reload = reload;
  window.goHome = goHome;
  window.addTab = addTab;
  window.closeTab = closeTab;
  window.switchTab = switchTab;
  window.addBookmark = addBookmark;
  window.listHistory = listHistory;
  window.clearHistory = clearHistory;
  window.search = search;
  window.toggleSidebar = toggleSidebar;
  window.switchSidebarTab = switchSidebarTab;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
