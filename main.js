async function addAndActivateBlankTab(windowId) {
  var window = await browser.windows.get(windowId, { populate: true });
  var hasBlankTab = false;
  for (var tab of window.tabs) {
    var isBlankTab = tab.url === 'about:newtab';
    if (isBlankTab) {
      hasBlankTab = true;
      await browser.tabs.update(tab.id, { active: true });
      break;
    }
  }
  if (!hasBlankTab) {
    await browser.tabs.create({ windowId: window.id, active: true });
  }
}

async function addAndActivateBlankTabs(skipActiveWindow=false) {
  var windows = await browser.windows.getAll();
  for (var window of windows) {
    var skipWindow = skipActiveWindow && window.focused;
    if (!skipWindow) {
      await addAndActivateBlankTab(window.id);
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

async function unloadAllTabs() {
  await addAndActivateBlankTabs();
  var tabs = await browser.tabs.query({});
  var tabIds = tabs.map((tab) => tab.id);
  await browser.tabs.discard(tabIds);
  await focusFirstUndiscardableTab();
  window.close();
}

async function unloadAllTabsExceptActiveTab() {
  await addAndActivateBlankTabs(skipActiveWindow=true);
  var currentWindowTabs = await browser.tabs.query({ currentWindow: true, active: true });
  var activeTab = currentWindowTabs[0];
  var tabs = await browser.tabs.query({});
  var tabIds = tabs.map((tab) => tab.id);
  var tabIdsFiltered = tabIds.filter((tabId) => tabId != activeTab.id);
  await browser.tabs.discard(tabIdsFiltered);
}

async function unloadAllTabsExceptActiveWindow() {
  await addAndActivateBlankTabs(skipActiveWindow=true);
  var nonCurrentWindowTabs = await browser.tabs.query({ currentWindow: false });
  var tabIds = nonCurrentWindowTabs.map((tab) => tab.id);
  await browser.tabs.discard(tabIds);
}

async function unloadTab(e) {
  var tabLink = e.currentTarget;
  var tabId = tabLink.tab.id;
  var tab = await browser.tabs.get(tabId);
  if (tab.active) {
    await addAndActivateBlankTab(tabLink.window.id);
  }
  await browser.tabs.discard(tabId);
  focusTabIfUndiscarded(tabId);
}

async function unloadWindowTabs(e) {
  var windowLink = e.currentTarget;
  var window = windowLink.window;
  var tabs = await browser.tabs.query({ windowId: window.id, discarded: false });
  var tabIds = tabs.map((tab) => tab.id);
  await addAndActivateBlankTab(window.id);
  await browser.tabs.discard(tabIds);
  await focusFirstUndiscardableTab();
}

function isAboutTab(tab) {
  var result = tab.url.startsWith('about');
  return result;
}

async function focusWindow(e) {
  var window = e.currentTarget.window;
  await browser.windows.update(window.id, { focused: true });
}

async function focusTab(e) {
  var tab = e.currentTarget.tab;
  var window = e.currentTarget.window;
  await browser.tabs.update(tab.id, { active: true });
  await browser.windows.update(window.id, { focused: true });
}

async function showUnloadableTabs() {
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
          windowLink.classList.add('link');
          windowLink.classList.add('bold');
          windowLink.window = window;
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
        tabLink.window = window;
        tabLink.tab = tab;
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

async function toggleTabList() {
  let toggleLink = document.getElementById('toggle-tab-list');
  if (toggleLink.textContent.includes('Show')) {
    toggleLink.textContent = toggleLink.textContent.replace('Show', 'Hide');
    await showUnloadableTabs();
  }
  else {
    toggleLink.textContent = toggleLink.textContent.replace('Hide', 'Show');
  }
  let tabList = document.getElementById('tab-list');
  tabList.classList.toggle('display-none');
}

async function hasUnloadableTabs(_windowId) {
  var _hasUnloadableTabs = false;
  var tabs = await browser.tabs.query({ windowId: _windowId, discarded: false });
  for (var tab of tabs) {
    if (!isAboutTab(tab)) {
      _hasUnloadableTabs = true;
    }
  }
  return _hasUnloadableTabs;
}

function removeWindowLink(windowId) {
  var windowLink = document.getElementById(`window${windowId}`);
  windowLink.remove();
}

async function removeTabLink(eventTabId) {
  var tabLink = document.getElementById(`tab${eventTabId}`);
  var window = tabLink.window;
  tabLink.remove();
  var _hasUnloadableTabs = await hasUnloadableTabs(window.id);
  if (!_hasUnloadableTabs) {
    removeWindowLink(window.id);
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
  var _hasUnloadableTabs = await hasUnloadableTabs(window.id);
  if (_hasUnloadableTabs) {
    await addAndActivateBlankTab(window.id);
    var tabs = await browser.tabs.query({ currentWindow: true, discarded: false });
    var tabIds = tabs.map((tab) => tab.id);
    await browser.tabs.discard(tabIds);
  }
}

document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
document.getElementById('keep-active-tab').addEventListener('click', unloadAllTabsExceptActiveTab);
document.getElementById('keep-active-window').addEventListener('click', unloadAllTabsExceptActiveWindow);
document.getElementById('unload-active-window').addEventListener('click', unloadActiveWindow);
document.getElementById('toggle-tab-list').addEventListener('click', toggleTabList);

browser.tabs.onUpdated.addListener(removeTabLink, { properties: ['discarded'] });
browser.tabs.onUpdated.addListener(updateTabIcon, { properties: ['status'] });

// cancel default menu
window.oncontextmenu = function() { return false; }
