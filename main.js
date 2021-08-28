function isBlankTab(tab) {
  var isNewTab = tab.url === 'about:newtab';
  var isHomeTab = tab.url === 'about:home';
  var isNewOrHomeTab = isNewTab || isHomeTab;
  return isNewOrHomeTab;
}

async function switchToTabWithId(tabId) {
  await browser.tabs.update(tabId, { active: true });
}

async function switchToBlankTab(windowId, addIfNotExists=true) {
  var window = await browser.windows.get(windowId, { populate: true });
  for (var tab of window.tabs) {
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
  for (var window of windows) {
    var skipWindow = skipCurrentWindow && window.focused;
    if (!skipWindow) {
      await switchToBlankTab(window.id, addIfNotExists);
    }
  }
}

async function switchToWindowWithId(windowId) {
  await browser.windows.update(windowId, { focused: true });
}

async function getUndiscardedNonBlankTabs(tabProperties={}) {
  tabProperties['discarded'] = false;
  var tabs = await browser.tabs.query(tabProperties);
  var undiscardedNonBlankTabs = [];
  for (var tab of tabs) {
    if (!isBlankTab(tab)) {
      undiscardedNonBlankTabs.push(tab);
    }
  }
  return undiscardedNonBlankTabs;
}

function isAboutTab(tab) {
  var result = tab.url.startsWith('about');
  return result;
}

async function switchToTabIfUndiscardedNonAboutTab(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (!tab.discarded && !isAboutTab(tab)) {
    await switchToTabWithId(tab.id);
  }
}

// switch to tab that hasn't been discarded likely due to user editing
async function switchToFirstUndiscardedTabIfExists(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      await switchToTabWithId(tab.id);
      break;
    }
  }
}

function getTabIds(tabs) {
  var tabIds = tabs.map((tab) => tab.id);
  return tabIds;
}

async function unloadTabs(tabIds) {
  await browser.tabs.discard(tabIds);
}

async function unloadAllTabs() {
  await switchToBlankTabs();
  var tabs = await getUndiscardedNonBlankTabs();
  var tabIds = getTabIds(tabs)
  await unloadTabs(tabIds);
  var currentWindow = await browser.windows.getCurrent();
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
}

async function getActiveTabOfCurrentWindow() {
  var activeTabs = await browser.tabs.query({ currentWindow: true, active: true });
  var activeTab = activeTabs[0];
  return activeTab;
}

async function unloadAllTabsExceptCurrentTab() {
  await switchToBlankTabs(skipCurrentWindow=true);
  var activeTab = await getActiveTabOfCurrentWindow();
  var allTabs = await getUndiscardedNonBlankTabs();
  var allTabIds = getTabIds(allTabs);
  var allTabIdsExceptCurrentTab = allTabIds.filter((tabId) => tabId != activeTab.id);
  await unloadTabs(allTabIdsExceptCurrentTab);
}

async function unloadAllTabsExceptCurrentWindow() {
  await switchToBlankTabs(skipCurrentWindow=true);
  var nonCurrentWindowTabs = await getUndiscardedNonBlankTabs({ currentWindow: false });
  var nonCurrentWindowTabIds = getTabIds(nonCurrentWindowTabs);
  await unloadTabs(nonCurrentWindowTabIds);
}

async function switchToLoadedInactiveTab(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId, active: false });
  var switchedToAnotherTab = false;
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      await switchToTabWithId(tab.id);
      switchedToAnotherTab = true;
      break;
    }
  }
  return switchedToAnotherTab;
}

async function unloadTabWithId(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (tab.active) {
    var windowId = tab.windowId;
    var switchedToInactiveTab = await switchToLoadedInactiveTab(windowId);
    if (!switchedToInactiveTab) {
      await switchToBlankTab(windowId, addIfNotExists=true);
    }
  }
  await unloadTabs(tabId);
  await switchToTabIfUndiscardedNonAboutTab(tabId);
}

async function unloadTab(e) {
  var tabLink = e.currentTarget;
  var tabId = tabLink.tabId;
  await unloadTabWithId(tabId);
}

async function unloadWindowTabs(e) {
  var windowLink = e.currentTarget;
  var windowId = windowLink.windowId;
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  var tabIds = getTabIds(tabs);
  await switchToBlankTab(windowId, addIfNotExists=true);
  await unloadTabs(tabIds);
  await switchToFirstUndiscardedTabIfExists(windowId);
}

async function switchToWindow(e) {
  var windowId = e.currentTarget.windowId;
  await switchToWindowWithId(windowId);
}

async function switchToTab(e) {
  var tabLink = e.currentTarget;
  await switchToTabWithId(tabLink.tabId);
  await switchToWindowWithId(tabLink.windowId);
}

function createWindowLink(window, windowNr) {
  var windowLink = document.createElement('div');
  windowLink.setAttribute('id', `window${window.id}`);
  windowLink.textContent = `Unload Window ${windowNr}`;
  windowLink.classList.add('windowlink');
  windowLink.classList.add('link');
  windowLink.classList.add('bold');
  if (window.focused) {
    windowLink.classList.add('currentwindow');
  }
  windowLink.windowId = window.id;
  windowLink.addEventListener('click', unloadWindowTabs);
  windowLink.addEventListener('contextmenu', switchToWindow);
  return windowLink;
}

async function closeTab(e) {
  // note: auxclick event is also triggered by right mouse button
  var middleMouseButtonClicked = e.which == 2 && e.button == 1;
  if (middleMouseButtonClicked) {
    var tabLink = e.currentTarget;
    var tabId = tabLink.tabId;
    await unloadTabWithId(tabId);
    await browser.tabs.remove(tabId);
  }
}

function getTabLinkTitle(tab) {
  var tabLinkTitle = `${tab.title}`;
  //var tabLinkTitle = `T${tab.id} ${tab.title}`;
  return tabLinkTitle
}

function createTabLinkTitle(tab, windowFocused) {
  var tabLinkTitle = document.createElement('span');
  tabLinkTitle.textContent = getTabLinkTitle(tab);
  tabLinkTitle.setAttribute('id', `tabtitle${tab.id}`);
  var isCurrentTab = tab.active && windowFocused;
  if (isCurrentTab) {
    tabLinkTitle.classList.add('currenttab');
  }
  return tabLinkTitle;
}

function createTabIcon(tab) {
  var tabIcon = document.createElement('img');
  tabIcon.setAttribute('id', `icon${tab.id}`);
  tabIcon.setAttribute('class', 'favicon');
  if (tab.favIconUrl) {
    tabIcon.setAttribute('src', tab.favIconUrl);
  }
  return tabIcon;
}

function createTabLink(tab, windowFocused) {
  var tabId = tab.id;
  var tabLink = document.createElement('div');
  tabLink.setAttribute('id', `tab${tabId}`);
  tabLink.classList.add('link');
  tabLink.classList.add('tabinfo');
  tabLink.tabId = tabId;
  tabLink.windowId = tab.windowId;
  tabLink.addEventListener('click', unloadTab);
  tabLink.addEventListener('auxclick', closeTab);
  tabLink.addEventListener('contextmenu', switchToTab);
  var tabIcon = createTabIcon(tab);
  var tabLinkTitle = createTabLinkTitle(tab, windowFocused);
  tabLink.appendChild(tabIcon);
  tabLink.appendChild(tabLinkTitle);
  return tabLink;
}

async function listUndiscardedNonBlankTabs() {
  var tabList = document.getElementById('tab-list');
  tabList.textContent = '';
  var windows = await browser.windows.getAll({ populate: true });
  var windowNr = 1;
  for (var window of windows) {
    var tabCount = 0;
    for (var tab of window.tabs) {
      var isUndiscardedNonBlankTab = !tab.discarded && !isBlankTab(tab);
      if (isUndiscardedNonBlankTab) {
        tabCount++;
        if (tabCount == 1) {
          var windowLink = createWindowLink(window, windowNr);
          tabList.appendChild(windowLink);
        }
        let tabLink = createTabLink(tab, window.focused);
        tabList.appendChild(tabLink);
      }
    }
    windowNr++;
  }
}

function removeWindowLink(windowId) {
  var windowLink = document.getElementById(`window${windowId}`);
  if (windowLink) {
    windowLink.classList.add('display-none');
    windowLink.remove();
  }
}

async function removeTabLink(eventTabId) {
  var tabLink = document.getElementById(`tab${eventTabId}`);
  if (!tabLink) {
    return;
  }
  var windowId = tabLink.windowId;
  tabLink.classList.add('display-none');
  tabLink.remove();
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  var tabIds = getTabIds(tabs);
  var existsOtherLoadedTab = tabs.length > 0 && !tabIds.includes(eventTabId);
  if (!existsOtherLoadedTab) {
    removeWindowLink(windowId);
  }
}

async function unloadCurrentWindow() {
  var currentWindow = await browser.windows.getCurrent();
  await switchToBlankTab(currentWindow.id, addIfNotExists=true);
  var tabs = await getUndiscardedNonBlankTabs({ currentWindow: true })
  var tabIds = getTabIds(tabs);
  await unloadTabs(tabIds);
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
}

async function unloadCurrentTab() {
  var activeTab = await getActiveTabOfCurrentWindow();
  var activeTabId = activeTab.id;
  var windowId = activeTab.windowId;
  var switchedToInactiveTab = await switchToLoadedInactiveTab(windowId);
  if (!switchedToInactiveTab) {
    await switchToBlankTab(windowId, addIfNotExists=true);
  }
  await unloadTabs(activeTabId);
  await switchToTabIfUndiscardedNonAboutTab(activeTabId);
}

async function updateTabTitle(tabId) {
  var tab = await browser.tabs.get(tabId);
  var tabLinkTitle = document.getElementById(`tabtitle${tabId}`);
  if (tabLinkTitle) {
    tabLinkTitle.textContent = getTabLinkTitle(tab);
  }
}

async function updateTabIcon(tabId) {
  var tabIcon = document.getElementById(`icon${tabId}`);
  if (tabIcon) {
    var tab = await browser.tabs.get(tabId);
    var isFavIconUrlAvailable = typeof tab.favIconUrl !== 'undefined';
    if (isFavIconUrlAvailable) {
      tabIcon.setAttribute('src', tab.favIconUrl);
    }
  }
}

async function updateTabLink(tabId) {
  updateTabTitle(tabId);
  updateTabIcon(tabId);
}

async function updateTabLinkFontStyle(info) {
  var window = await browser.windows.get(info.windowId);
  var deactivatedTabLinkTitle = document.getElementById(`tabtitle${info.previousTabId}`);
  if (deactivatedTabLinkTitle) {
    deactivatedTabLinkTitle.classList.remove('currenttab');
  }
  var activatedTabLinkTitle = document.getElementById(`tabtitle${info.tabId}`);
  if (activatedTabLinkTitle && window.focused) {
    activatedTabLinkTitle.classList.add('currenttab');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  listUndiscardedNonBlankTabs();
  document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
  document.getElementById('keep-current-tab').addEventListener('click', unloadAllTabsExceptCurrentTab);
  document.getElementById('keep-current-window').addEventListener('click', unloadAllTabsExceptCurrentWindow);
  document.getElementById('unload-current-window').addEventListener('click', unloadCurrentWindow);
  document.getElementById('unload-current-tab').addEventListener('click', unloadCurrentTab);
});

browser.tabs.onUpdated.addListener(removeTabLink, { properties: ['discarded'] });
browser.tabs.onUpdated.addListener(updateTabLink, { properties: ['status', 'url'] });
browser.tabs.onActivated.addListener(updateTabLinkFontStyle);
browser.tabs.onRemoved.addListener(removeTabLink);

// cancel default menu
//window.oncontextmenu = function() { return false; }
window.oncontextmenu = (e) => { e.preventDefault(); }