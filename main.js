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

async function switchToBlankTabs(skipActiveWindow=false, addIfNotExists=true) {
  var windows = await browser.windows.getAll();
  for (var window of windows) {
    var skipWindow = skipActiveWindow && window.focused;
    if (!skipWindow) {
      await switchToBlankTab(window.id, addIfNotExists);
    }
  }
}

async function switchToWindowWithId(windowId) {
  await browser.windows.update(windowId, { focused: true });
}

function isTabLoaded(tab) {
  var isStatusComplete = tab.status.startsWith('complete');
  var isNotDiscarded = tab.discarded == false;
  return isStatusComplete && isNotDiscarded;
}

async function switchToTabIfLoaded(tabId) {
  var tab = await browser.tabs.get(tabId);
  if (isTabLoaded(tab)) {
    await switchToTabWithId(tabId);
    await switchToWindowWithId(tab.windowId);
  }
}

async function getFullyLoadedTabs(tabProperties={}) {
  console.log('getFullyLoadedTabs tabProperties', tabProperties);
  tabProperties['discarded'] = false;
  tabProperties['status'] = 'complete';
  console.log('getFullyLoadedTabs tabProperties', tabProperties);
  var fullyLoadedTabs = await browser.tabs.query(tabProperties);
  console.log('getFullyLoadedTabs fullyLoadedTabs', fullyLoadedTabs);
  return fullyLoadedTabs;
}

// switch to tab that hasn't been discarded likely due to user editing
async function switchToFirstUndiscardedTabIfExists(windowId) {
  var tabs = await getFullyLoadedTabs({ windowId: windowId });
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      await switchToTabIfLoaded(tab.id);
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
  var tabs = await getFullyLoadedTabs();
  var tabIds = getTabIds(tabs)
  await unloadTabs(tabIds);
  var currentWindow = await browser.windows.getCurrent();
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
  window.close();
}

async function getActiveTabOfCurrentWindow() {
  var activeTabs = await getFullyLoadedTabs({ currentWindow: true, active: true });
  var activeTab = activeTabs[0];
  return activeTab;
}

async function unloadAllTabsExceptActiveTab() {
  await switchToBlankTabs(skipActiveWindow=true);
  var activeTab = await getActiveTabOfCurrentWindow();
  var allTabs = await getFullyLoadedTabs();
  var allTabIds = getTabIds(allTabs);
  var allTabIdsExceptActiveTab = allTabIds.filter((tabId) => tabId != activeTab.id);
  await unloadTabs(allTabIdsExceptActiveTab);
}

async function unloadAllTabsExceptActiveWindow() {
  await switchToBlankTabs(skipActiveWindow=true);
  var nonCurrentWindowTabs = await getFullyLoadedTabs({ currentWindow: false });
  var nonCurrentWindowTabIds = getTabIds(nonCurrentWindowTabs);
  await unloadTabs(nonCurrentWindowTabIds);
}

async function switchToLoadedInactiveTab(windowId, activeTabId) {
  var tabs = await getFullyLoadedTabs({ windowId: windowId });
  var switchedToAnotherTab = false;
  for (var tab of tabs) {
    var isActiveTab = tab.id == activeTabId;
    if (!isAboutTab(tab) && !isActiveTab) {
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
    var switchedToInactiveTab = await switchToLoadedInactiveTab(windowId, tab.id);
    if (!switchedToInactiveTab) {
      await switchToBlankTab(windowId, addIfNotExists=true);
    }
  }
  await unloadTabs(tabId);
  //await switchToTabIfLoaded(tabId);
}

async function unloadTab(e) {
  var tabLink = e.currentTarget;
  var tabId = tabLink.tabId;
  await unloadTabWithId(tabId);
}

async function unloadWindowTabs(e) {
  var windowLink = e.currentTarget;
  var windowId = windowLink.windowId;
  var tabs = await getFullyLoadedTabs({ windowId: windowId });
  var tabIds = getTabIds(tabs);
  await switchToBlankTab(windowId, addIfNotExists=true);
  await unloadTabs(tabIds);
  await switchToFirstUndiscardedTabIfExists(windowId);
}

function isAboutTab(tab) {
  var result = tab.url.startsWith('about');
  return result;
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

async function listLoadedTabs() {
  var tabList = document.getElementById('tab-list');
  tabList.textContent = '';
  var windows = await browser.windows.getAll({ populate: true });
  var windowNr = 1;
  for (var window of windows) {
    var tabCount = 0;
    for (var tab of window.tabs) {
      //var isTabDiscardable = isTabLoaded(tab) && !isAboutTab(tab);
      var isTabDiscardable = isTabLoaded(tab) && !isBlankTab(tab);
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
          windowLink.addEventListener('contextmenu', switchToWindow);
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
        tabLink.addEventListener('contextmenu', switchToTab);

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

function removeWindowLink(windowId) {
  var windowLink = document.getElementById(`window${windowId}`);
  if (windowLink) {
    windowLink.remove();
  }
}

async function removeTabLink(eventTabId) {
  var tabLink = document.getElementById(`tab${eventTabId}`);
  if (!tabLink) {
    return;
  }
  var windowId = tabLink.windowId;
  tabLink.remove();
  var tabs = await getFullyLoadedTabs({ windowId: windowId });
  var tabIds = getTabIds(tabs);
  var existsOtherLoadedTab = tabIds.length > 0 && !tabIds.includes(eventTabId);
  if (!existsOtherLoadedTab) {
    removeWindowLink(windowId);
  }
}

// problem: if popup is opened while tabs are still loading
//   corresponding favicons are not loaded properly
// solution: once tab is loaded reset image src
//   unfortunately it doesn't work 100% (2021-8-6)
async function updateTabIcon(eventTabId) {
  var tab = await browser.tabs.get(eventTabId);
  var isTabLoaded = tab.status === 'complete';
  if (isTabLoaded) {
    var tabIcon = document.getElementById(`icon${eventTabId}`);
    if (tabIcon) {
      tabIcon.setAttribute('src', tab.favIconUrl);
    }
  }
}

async function unloadActiveWindow() {
  var currentWindow = await browser.windows.getCurrent();
  await switchToBlankTab(currentWindow.id, addIfNotExists=true);
  var tabs = await getFullyLoadedTabs({ currentWindow: true })
  var tabIds = getTabIds(tabs);
  await unloadTabs(tabIds);
  await switchToFirstUndiscardedTabIfExists(currentWindow.id);
}

async function unloadActiveTab() {
  var activeTab = await getActiveTabOfCurrentWindow();
  var windowId = activeTab.windowId;
  var switchedToInactiveTab = await switchToLoadedInactiveTab(windowId, activeTab.id);
  if (!switchedToInactiveTab) {
    await switchToBlankTab(windowId, addIfNotExists=true);
  }
  await unloadTabs(activeTab.id);
}

document.addEventListener("DOMContentLoaded", listLoadedTabs);
document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
document.getElementById('keep-active-tab').addEventListener('click', unloadAllTabsExceptActiveTab);
document.getElementById('keep-active-window').addEventListener('click', unloadAllTabsExceptActiveWindow);
document.getElementById('unload-active-window').addEventListener('click', unloadActiveWindow);
document.getElementById('unload-active-tab').addEventListener('click', unloadActiveTab);

browser.tabs.onUpdated.addListener(removeTabLink, { properties: ['discarded'] });
browser.tabs.onUpdated.addListener(updateTabIcon, { properties: ['status'] });
browser.tabs.onRemoved.addListener(removeTabLink);

// cancel default menu
//window.oncontextmenu = function() { return false; }
window.oncontextmenu = (e) => { e.preventDefault(); }