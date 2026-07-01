// Chrome uses chrome.*, Firefox uses browser.*. Normalize to browser.
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  window.browser = chrome;
}
// Chrome uses contextMenus, Firefox uses menus
if (typeof browser !== 'undefined' && browser.contextMenus && !browser.menus) {
  browser.menus = browser.contextMenus;
}

var BLANK_TAB_URL_PREFIXES = [
  'about:blank',
  'about:newtab',
  'about:home',
  'chrome://newtab/',
  'chrome://new-tab-page/',
  'edge://newtab/',
];

// Matches by prefix (not exact equality) since browsers append query strings
// or trailing slashes to these URLs (e.g. 'chrome://new-tab-page/?...').
// Also checks pendingUrl, since a tab just switched to or just created can
// report an empty/stale url while the new-tab page is still navigating.
function isBlankUrl(url) {
  return !!url && BLANK_TAB_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isBlankTab(tab) {
  return isBlankUrl(tab.url) || isBlankUrl(tab.pendingUrl);
}

function isAboutTab(tab) {
  return tab.url.startsWith('about:');
}

async function switchToTabWithId(tabId) {
  await browser.tabs.update(tabId, { active: true });
}

async function switchToWindowWithId(windowId) {
  await browser.windows.update(windowId, { focused: true });
}

async function switchToBlankTab(windowId, addIfNotExists=true) {
  var window = await browser.windows.get(windowId, { populate: true });
  for (let tab of window.tabs) {
    if (isBlankTab(tab)) {
      await switchToTabWithId(tab.id);
      return;
    }
  }
  if (addIfNotExists) {
    await browser.tabs.create({ windowId: window.id, active: true });
  }
}

async function switchToBlankTabs(skipCurrentWindow=false, addIfNotExists=true) {
  var windows = await browser.windows.getAll();
  for (let window of windows) {
    if (!skipCurrentWindow || !window.focused) {
      await switchToBlankTab(window.id, addIfNotExists);
    }
  }
}

async function getUndiscardedNonBlankTabs(tabProperties={}) {
  tabProperties['discarded'] = false;
  var tabs = await browser.tabs.query(tabProperties);
  return tabs.filter(tab => !isBlankTab(tab));
}

async function switchToTabIfUndiscardedNonAboutTab(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (!tab.discarded && !isAboutTab(tab)) {
    await switchToTabWithId(tab.id);
  }
}

async function switchToFirstUndiscardedTabIfExists(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  for (let tab of tabs) {
    if (!isAboutTab(tab)) {
      await switchToTabWithId(tab.id);
      break;
    }
  }
}

async function switchToLoadedInactiveTab(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId, active: false });
  for (let tab of tabs) {
    if (!isAboutTab(tab)) {
      await switchToTabWithId(tab.id);
      return true;
    }
  }
  return false;
}

function getTabIds(tabs) {
  return tabs.map(tab => tab.id);
}

async function discardTabIds(tabIds) {
  for (const tabId of tabIds) {
    await browser.tabs.discard(tabId);
  }
}

async function discardTabs(tabs) {
  await discardTabIds(getTabIds(tabs));
}

async function discardTab(tab) {
  await browser.tabs.discard(tab.id);
}

async function discardInactiveTabs(tabProperties={}) {
  tabProperties['active'] = false;
  var inactiveTabs = await getUndiscardedNonBlankTabs(tabProperties);
  await discardTabs(inactiveTabs);
}

async function unloadTabWithId(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (tab.active) {
    // Switch to a blank tab first so the browser allows discarding the original.
    // Browsers silently refuse to discard the active tab, even immediately after
    // switching away via tabs.update (race condition). The blank-tab intermediate
    // step is the same pattern used by unloadWindow / unloadAllTabs.
    await switchToBlankTab(tab.windowId, true);
  }
  await browser.tabs.discard(tabId);
  if (tab.active) {
    await switchToFirstUndiscardedTabIfExists(tab.windowId);
  }
}

async function unloadWindow(windowId) {
  var currentWindow = await browser.windows.getCurrent();
  var isCurrentWindow = windowId === currentWindow.id;
  await discardInactiveTabs({ windowId: windowId });
  await switchToBlankTab(windowId, isCurrentWindow);
  await discardInactiveTabs({ windowId: windowId });
  await switchToFirstUndiscardedTabIfExists(windowId);
}

async function getActiveTabOfCurrentWindow() {
  var activeTabs = await browser.tabs.query({ currentWindow: true, active: true });
  return activeTabs[0];
}

async function unloadAllTabs() {
  // Capture the focused window before touching other windows' active tabs,
  // since switching tabs in background windows can steal OS focus in Chromium.
  var currentWindow = await browser.windows.getCurrent();
  await discardInactiveTabs();
  await switchToBlankTabs();
  await discardInactiveTabs();
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
  await browser.windows.update(currentWindow.id, { focused: true });
}

async function unloadAllTabsExceptCurrentTab() {
  var currentWindow = await browser.windows.getCurrent();
  await discardInactiveTabs();
  await switchToBlankTabs(true);
  await discardInactiveTabs();
  await browser.windows.update(currentWindow.id, { focused: true });
}

async function unloadAllTabsExceptCurrentWindow() {
  var currentWindow = await browser.windows.getCurrent();
  await discardInactiveTabs({ currentWindow: false });
  await switchToBlankTabs(true);
  await discardInactiveTabs({ currentWindow: false });
  await browser.windows.update(currentWindow.id, { focused: true });
}
