// discard*() - wrapper function for browser.tabs.discard()
// unload*() - switches to inactive or blank tab(s) before discarding

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
  for (let tab of tabs) {
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

// switch to non-about tab that hasn't been discarded
async function switchToFirstUndiscardedTabIfExists(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  for (let tab of tabs) {
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

async function discardTabIds(tabIds) {
  await browser.tabs.discard(tabIds);
}

async function discardTabs(tabs) {
  var tabIds = getTabIds(tabs);
  await discardTabIds(tabIds);
}

async function discardTab(tab) {
  await discardTabIds(tab.id);
}

async function discardInactiveTabs(tabProperties={}) {
  tabProperties['active'] = false;
  var inactiveTabs = await getUndiscardedNonBlankTabs(tabProperties);
  await discardTabs(inactiveTabs);
}

async function unloadAllTabs() {
  await discardInactiveTabs();
  await switchToBlankTabs();
  await discardInactiveTabs();
  var currentWindow = await browser.windows.getCurrent();
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
}

async function getActiveTabOfCurrentWindow() {
  var activeTabs = await browser.tabs.query({ currentWindow: true, active: true });
  var activeTab = activeTabs[0];
  return activeTab;
}

async function unloadAllTabsExceptCurrentTab() {
  await discardInactiveTabs();
  await switchToBlankTabs(skipCurrentWindow=true);
  await discardInactiveTabs();
}

async function unloadAllTabsExceptCurrentWindow() {
  await discardInactiveTabs({ currentWindow: false });
  await switchToBlankTabs(skipCurrentWindow=true);
  await discardInactiveTabs({ currentWindow: false });
}

async function switchToLoadedInactiveTab(windowId) {
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId, active: false });
  var switchedToAnotherTab = false;
  for (let tab of tabs) {
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
  await discardTab(tab);
  await switchToTabIfUndiscardedNonAboutTab(tabId);
}

async function unloadListSelectedTab(e) {
  var tabLink = e.currentTarget;
  var tabId = tabLink.tabId;
  await unloadTabWithId(tabId);
}

async function unloadListSelectedWindow(e) {
  var windowLink = e.currentTarget;
  var windowId = windowLink.windowId;
  await discardInactiveTabs({ windowId: windowId });
  await switchToBlankTab(windowId, addIfNotExists=true);
  await discardInactiveTabs({ windowId: windowId });
  await switchToFirstUndiscardedTabIfExists(windowId);
}

async function switchToListSelectedWindow(e) {
  var windowId = e.currentTarget.windowId;
  await switchToWindowWithId(windowId);
}

async function switchToListSelectedTab(e) {
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
  windowLink.addEventListener('click', unloadListSelectedWindow);
  windowLink.addEventListener('contextmenu', switchToListSelectedWindow);
  return windowLink;
}

async function closeListSelectedTab(e) {
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

function getTooltipText(tab) {
  var tooltipText = tab.title + '\n---\n' + tab.url;
  return tooltipText;
}

function setTabLinkTooltip(tabLink, tab) {
  tabLink.setAttribute('title', getTooltipText(tab));
}

function createTabLinkTitle(tab, windowFocused) {
  var tabLinkTitleElem = document.createElement('span');
  var tabLinkTitle = getTabLinkTitle(tab);
  tabLinkTitleElem.textContent = tabLinkTitle;
  tabLinkTitleElem.setAttribute('id', `tabtitle${tab.id}`);
  var isCurrentTab = tab.active && windowFocused;
  if (isCurrentTab) {
    tabLinkTitleElem.classList.add('currenttab');
  }
  return tabLinkTitleElem;
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
  setTabLinkTooltip(tabLink, tab);
  tabLink.classList.add('link');
  tabLink.classList.add('tabinfo');
  tabLink.tabId = tabId;
  tabLink.windowId = tab.windowId;
  tabLink.addEventListener('click', unloadListSelectedTab);
  tabLink.addEventListener('auxclick', closeListSelectedTab);
  tabLink.addEventListener('contextmenu', switchToListSelectedTab);
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
  for (let window of windows) {
    var tabCount = 0;
    for (let tab of window.tabs) {
      var isUndiscardedNonBlankTab = !tab.discarded && !isBlankTab(tab);
      if (isUndiscardedNonBlankTab) {
        tabCount++;
        if (tabCount == 1) {
          var windowLink = createWindowLink(window, windowNr);
          tabList.appendChild(windowLink);
        }
        var tabLink = createTabLink(tab, window.focused);
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
  await discardInactiveTabs({ currentWindow: true });
  var currentWindow = await browser.windows.getCurrent();
  await switchToBlankTab(currentWindow.id, addIfNotExists=true);
  await discardInactiveTabs({ currentWindow: true });
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
  await discardTab(activeTab);
  await switchToTabIfUndiscardedNonAboutTab(activeTabId);
}

async function updateTabLinkTitle(tab) {
  var tabLinkTitle = document.getElementById(`tabtitle${tab.id}`);
  if (tabLinkTitle) {
    tabLinkTitle.textContent = getTabLinkTitle(tab);
  }
}

async function updateTabLinkIcon(tabId) {
  var tabIcon = document.getElementById(`icon${tabId}`);
  if (tabIcon) {
    var tab = await browser.tabs.get(tabId);
    var isFavIconUrlAvailable = typeof tab.favIconUrl !== 'undefined';
    if (isFavIconUrlAvailable) {
      tabIcon.setAttribute('src', tab.favIconUrl);
    }
  }
}

function updateTabLinkToolTip(tab) {
  var tabLink = document.getElementById(`tab${tab.id}`);
  setTabLinkTooltip(tabLink, tab);
}

async function updateTabLink(tabId) {
  var tab = await browser.tabs.get(tabId);
  updateTabLinkToolTip(tab);
  updateTabLinkTitle(tab);
  updateTabLinkIcon(tabId);
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