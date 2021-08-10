async function activateBlankTab(windowId, addIfNotExists=true) {
  var window = await browser.windows.get(windowId, { populate: true });
  for (var tab of window.tabs) {
    var isBlankTab = tab.url === 'about:newtab' || tab.url === 'about:home';
    if (isBlankTab) {
      await browser.tabs.update(tab.id, { active: true });
      return
    }
  }
  if (addIfNotExists) {
    await browser.tabs.create({ windowId: window.id, active: true });
  }
}

async function activateBlankTabs(skipActiveWindow=false, addIfNotExists=true) {
  var windows = await browser.windows.getAll();
  for (var window of windows) {
    var skipWindow = skipActiveWindow && window.focused;
    if (!skipWindow) {
      await activateBlankTab(window.id, addIfNotExists);
    }
  }
}

async function focusTabIfUndiscarded(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (!tab.discarded) {
    await browser.tabs.update(tabId, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
    //await browser.tabs.reload(tabId);
  }
}

async function focusFirstUndiscardableTab() {
  var tabs = await browser.tabs.query({ discarded: false });
  if (tabs.length > 0) {
    for (var tab of tabs) {
      if (!isAboutTab(tab)) {
        await focusTabIfUndiscarded(tab.id);
        break;
      }
    }
  }
}

function getTabIds(tabs) {
  var tabIds = tabs.map((tab) => tab.id);
  return tabIds;
}

async function unloadAllTabs() {
  await activateBlankTabs();
  var tabs = await browser.tabs.query({});
  var tabIds = getTabIds(tabs)
  await browser.tabs.discard(tabIds);
  await focusFirstUndiscardableTab();
  window.close();
}

async function unloadAllTabsExceptActiveTab() {
  await activateBlankTabs(skipActiveWindow=true);
  var currentWindowTabs = await browser.tabs.query({ currentWindow: true, active: true });
  var activeTab = currentWindowTabs[0];
  var tabs = await browser.tabs.query({});
  var tabIds = getTabIds(tabs);
  var tabIdsFiltered = tabIds.filter((tabId) => tabId != activeTab.id);
  await browser.tabs.discard(tabIdsFiltered);
}

async function unloadAllTabsExceptActiveWindow() {
  await activateBlankTabs(skipActiveWindow=true);
  var nonCurrentWindowTabs = await browser.tabs.query({ currentWindow: false });
  var tabIds = getTabIds(nonCurrentWindowTabs);
  await browser.tabs.discard(tabIds);
}

async function activateAlternativeLoadedTab(_windowId, activeTabId) {
  var tabs = await browser.tabs.query({ windowId: _windowId, discarded: false });
  var alternativeTabActivated = false;
  for (var tab of tabs) {
    var isActiveTab = tab.id == activeTabId;
    if (!isAboutTab(tab) && !isActiveTab) {
      await browser.tabs.update(tab.id, { active: true });
      alternativeTabActivated = true;
      break;
    }
  }
  return alternativeTabActivated;
}

async function unloadTab(e) {
  var tabLink = e.currentTarget;
  var tabId = tabLink.tabId;
  var tab = await browser.tabs.get(tabId);
  var windowId = tab.windowId;
  if (tab.active) {
    var alternativeTabActivated = await activateAlternativeLoadedTab(windowId, tab.id);
    if (!alternativeTabActivated) {
      await activateBlankTab(windowId);
    }
  }
  await browser.tabs.discard(tabId);
  await focusTabIfUndiscarded(tabId);
}

async function unloadWindowTabs(e) {
  var windowLink = e.currentTarget;
  var windowId = windowLink.windowId;
  var tabs = await browser.tabs.query({ windowId: windowId, discarded: false });
  var tabIds = getTabIds(tabs);
  await activateBlankTab(windowId);
  await browser.tabs.discard(tabIds);
  await focusFirstUndiscardableTab();
}

function isAboutTab(tab) {
  var result = tab.url.startsWith('about');
  return result;
}

async function focusWindow(e) {
  var windowId = e.currentTarget.windowId;
  await browser.windows.update(windowId, { focused: true });
}

async function focusTab(e) {
  var tabLink = e.currentTarget;
  await browser.tabs.update(tabLink.tabId, { active: true });
  await browser.windows.update(tabLink.windowId, { focused: true });
}

async function showDiscardableTabs() {
  var tabList = document.getElementById('tab-list');
  tabList.textContent = '';
  var windows = await browser.windows.getAll({ populate: true });
  var windowNr = 1;
  for (var window of windows) {
    var tabCount = 0;
    for (var tab of window.tabs) {
      var isTabDiscardable = !tab.discarded && !isAboutTab(tab);
      if (isTabDiscardable) {
        tabCount++;
        // create window link
        if (tabCount == 1) {
          let windowLink = document.createElement('div');
          windowLink.setAttribute('id', `window${window.id}`);
          windowLink.textContent = `Unload Window ${windowNr}`;
          windowLink.classList.add('windowlink');
          windowLink.classList.add('link');
          windowLink.classList.add('bold');
          windowLink.windowId = window.id;
          windowLink.addEventListener('click', unloadWindowTabs);
          windowLink.addEventListener('contextmenu', focusWindow);
          tabList.appendChild(windowLink);
        }
        // create tab link
        let tabLink = document.createElement('div');
        tabLink.setAttribute('id', `tab${tab.id}`);
        tabLink.classList.add('link');
        tabLink.classList.add('tabinfo');
        tabLink.tabId = tab.id;
        tabLink.windowId = window.id;
        tabLink.addEventListener('click', unloadTab);
        tabLink.addEventListener('contextmenu', focusTab);

        let tabIcon = document.createElement('img');
        tabIcon.setAttribute('id', `icon${tab.id}`);
        tabIcon.setAttribute('class', 'favicon');
        tabIcon.setAttribute('src', tab.favIconUrl);
        tabLink.appendChild(tabIcon);

        let tabTitle = document.createElement('span');
        tabTitle.textContent = `${tab.title}`;
        tabLink.appendChild(tabTitle);

        tabList.appendChild(tabLink);
      }
    }
    windowNr++;
  }
}

async function hasDiscardableTabs(_windowId) {
  var tabs = await browser.tabs.query({ windowId: _windowId, discarded: false });
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      return true;
    }
  }
  return false;
}

async function getDiscardableTabs(_windowId) {
  var tabs = await browser.tabs.query({ windowId: _windowId, discarded: false });
  var discardableTabs = [];
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      discardableTabs.push(tab);
    }
  }
  return discardableTabs;
}

function removeWindowLink(windowId) {
  var windowLink = document.getElementById(`window${windowId}`);
  windowLink.remove();
}

async function removeTabLink(eventTabId) {
  var tabLink = document.getElementById(`tab${eventTabId}`);
  var windowId = tabLink.windowId;
  tabLink.remove();
  var discardableTabs = await getDiscardableTabs(windowId);
  var discardableTabIds = getTabIds(discardableTabs);
  var hasDiscardableTabs = discardableTabIds.length > 0 && !discardableTabIds.includes(eventTabId);
  if (!hasDiscardableTabs) {
    removeWindowLink(windowId);
  }
}

// problem: if popup is opened while tabs are still loading
//   corresponding favicons are not loaded properly
// solution: once tab is loaded reset image src
//   unfortunately it doesn't work 100% (2021-8-6)
async function updateTabIcon(eventTabId) {
  var tabIcon = document.getElementById(`icon${eventTabId}`);
  var tab = await browser.tabs.get(eventTabId);
  var isTabLoaded = tab.status === 'complete';
  if (isTabLoaded) {
    tabIcon.setAttribute('src', tab.favIconUrl);
  }
}

async function unloadActiveWindow() {
  var window = await browser.windows.getCurrent();
  var _hasDiscardableTabs = await hasDiscardableTabs(window.id);
  if (_hasDiscardableTabs) {
    await activateBlankTab(window.id);
    var tabs = await browser.tabs.query({ currentWindow: true, discarded: false });
    var tabIds = getTabIds(tabs);
    await browser.tabs.discard(tabIds);
  }
}

async function unloadActiveTab() {
  var activeTabs = await browser.tabs.query({ currentWindow: true, active: true });
  var activeTab = activeTabs[0];
  if (isAboutTab(activeTab)) {
    return;
  }
  var windowId = activeTab.windowId;
  var alternativeTabActivated = await activateAlternativeLoadedTab(windowId, activeTab.id);
  if (!alternativeTabActivated) {
    await activateBlankTab(windowId);
  }
  await browser.tabs.discard(activeTab.id);
}

document.addEventListener("DOMContentLoaded", showDiscardableTabs);
document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
document.getElementById('keep-active-tab').addEventListener('click', unloadAllTabsExceptActiveTab);
document.getElementById('keep-active-window').addEventListener('click', unloadAllTabsExceptActiveWindow);
document.getElementById('unload-active-window').addEventListener('click', unloadActiveWindow);
document.getElementById('unload-active-tab').addEventListener('click', unloadActiveTab);

browser.tabs.onUpdated.addListener(removeTabLink, { properties: ['discarded'] });
browser.tabs.onUpdated.addListener(updateTabIcon, { properties: ['status'] });
browser.tabs.onRemoved.addListener(removeTabLink);

// cancel default menu
window.oncontextmenu = function() { return false; }
