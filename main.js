async function addAndActivateBlankTab(window) {
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
  var windows = await browser.windows.getAll({ populate: true });
  for (var window of windows) {
    var skipWindow = skipActiveWindow && window.focused;
    if (skipWindow) {
      continue;
    }
    await addAndActivateBlankTab(window);
  }
}

async function unloadAllTabs() {
  await addAndActivateBlankTabs();
  var tabs = await browser.tabs.query({});
  var tabIds = tabs.map((tab) => tab.id);
  await browser.tabs.discard(tabIds);
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
  if (tabLink.tab.active) {
    await addAndActivateBlankTab(tabLink.window);
  }
  await browser.tabs.discard(tabLink.tabId);
}

async function unloadWindowTabs(e) {
  var windowLink = e.currentTarget;
  var window = windowLink.window;
  var tabs = await browser.tabs.query({ windowId: window.id, discarded: false });
  var tabIds = tabs.map((tab) => tab.id);
  await addAndActivateBlankTab(window);
  await browser.tabs.discard(tabIds);
}

function isAboutTab(tab) {
  var result = tab.url.startsWith('about');
  return result;
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

async function hasUnloadableTabs(window) {
  var _hasUnloadableTabs = false;
  var tabs = await browser.tabs.query({ windowId: window.id, discarded: false });
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
  var _hasUnloadableTabs = await hasUnloadableTabs(window);
  if (!_hasUnloadableTabs) {
    removeWindowLink(window.id);
  }
}

document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
document.getElementById('keep-active-tab').addEventListener('click', unloadAllTabsExceptActiveTab);
document.getElementById('keep-active-window').addEventListener('click', unloadAllTabsExceptActiveWindow);
document.getElementById('toggle-tab-list').addEventListener('click', toggleTabList);

browser.tabs.onUpdated.addListener(removeTabLink, { properties: ['discarded'] });
//browser.tabs.onUpdated.addListener(showUnloadableTabs, { properties: ['status'] });
