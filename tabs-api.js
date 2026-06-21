// Chrome uses chrome.*, Firefox uses browser.*. Normalize to browser.
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  window.browser = chrome;
}
// Chrome uses contextMenus, Firefox uses menus
if (typeof browser !== 'undefined' && browser.contextMenus && !browser.menus) {
  browser.menus = browser.contextMenus;
}

function isBlankTab(tab) {
  return tab.url === 'about:newtab' || tab.url === 'about:home';
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
  await discardInactiveTabs();
  await switchToBlankTabs();
  await discardInactiveTabs();
  var currentWindow = await browser.windows.getCurrent();
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
}

async function unloadAllTabsExceptCurrentTab() {
  await discardInactiveTabs();
  await switchToBlankTabs(true);
  await discardInactiveTabs();
}

async function unloadAllTabsExceptCurrentWindow() {
  await discardInactiveTabs({ currentWindow: false });
  await switchToBlankTabs(true);
  await discardInactiveTabs({ currentWindow: false });
}
