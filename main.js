async function unloadListSelectedTab(e) {
  var tabLink = e.currentTarget;
  await unloadTabWithId(tabLink.tabId);
}

async function unloadListSelectedWindow(e) {
  var windowId = e.currentTarget.windowId;
  await unloadWindow(windowId);
}

async function switchToListSelectedWindow(e) {
  await switchToWindowWithId(e.currentTarget.windowId);
}

async function switchToListSelectedTab(e) {
  var tabLink = e.currentTarget;
  await switchToTabWithId(tabLink.tabId);
  await switchToWindowWithId(tabLink.windowId);
}

async function closeListSelectedTab(e) {
  // note: auxclick event is also triggered by right mouse button
  var middleMouseButtonClicked = e.which == 2 && e.button == 1;
  if (middleMouseButtonClicked) {
    var tabId = e.currentTarget.tabId;
    await unloadTabWithId(tabId);
    await browser.tabs.remove(tabId);
  }
}

function getTabLinkTitle(tab) {
  return tab.title;
}

function getTooltipText(tab) {
  return tab.title + '\n---\n' + tab.url;
}

function setTabLinkTooltip(tabLink, tab) {
  tabLink.setAttribute('title', getTooltipText(tab));
}

function createTabLinkTitle(tab, windowFocused) {
  var tabLinkTitleElem = document.createElement('span');
  tabLinkTitleElem.textContent = getTabLinkTitle(tab);
  tabLinkTitleElem.setAttribute('id', `tabtitle${tab.id}`);
  if (tab.active && windowFocused) {
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

function createTabLinkMarker(tab, windowFocused) {
  var marker = document.createElement('span');
  marker.setAttribute('id', `tabmarker${tab.id}`);
  marker.classList.add('tabmarker');
  marker.textContent = '·';
  if (tab.active && windowFocused) {
    marker.classList.add('visible');
  }
  return marker;
}

function createTabLink(tab, windowFocused) {
  var tabLink = document.createElement('div');
  tabLink.setAttribute('id', `tab${tab.id}`);
  setTabLinkTooltip(tabLink, tab);
  tabLink.classList.add('link');
  tabLink.classList.add('tabinfo');
  tabLink.tabId = tab.id;
  tabLink.windowId = tab.windowId;
  tabLink.addEventListener('click', unloadListSelectedTab);
  tabLink.addEventListener('auxclick', closeListSelectedTab);
  tabLink.addEventListener('contextmenu', switchToListSelectedTab);
  tabLink.appendChild(createTabLinkMarker(tab, windowFocused));
  tabLink.appendChild(createTabIcon(tab));
  tabLink.appendChild(createTabLinkTitle(tab, windowFocused));
  return tabLink;
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

async function listUndiscardedNonBlankTabs() {
  var tabList = document.getElementById('tab-list');
  tabList.textContent = '';
  var windows = await browser.windows.getAll({ populate: true });
  var windowNr = 1;
  for (let window of windows) {
    var tabCount = 0;
    for (let tab of window.tabs) {
      if (!tab.discarded && !isBlankTab(tab)) {
        tabCount++;
        if (tabCount === 1) {
          tabList.appendChild(createWindowLink(window, windowNr));
        }
        tabList.appendChild(createTabLink(tab, window.focused));
      }
    }
    if (tabCount > 0) {
      windowNr++;
    }
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
  var tabs = await getUndiscardedNonBlankTabs({ windowId: windowId });
  var tabIds = getTabIds(tabs);
  var otherLoadedTabsExist = tabs.length > 0 && !tabIds.includes(eventTabId);
  if (!otherLoadedTabsExist) {
    removeWindowLink(windowId);
  }
}

async function unloadCurrentWindow() {
  var currentWindow = await browser.windows.getCurrent();
  await unloadWindow(currentWindow.id);
}

async function unloadCurrentTab() {
  var activeTab = await getActiveTabOfCurrentWindow();
  await unloadTabWithId(activeTab.id);
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
    if (typeof tab.favIconUrl !== 'undefined') {
      tabIcon.setAttribute('src', tab.favIconUrl);
    }
  }
}

function updateTabLinkToolTip(tab) {
  var tabLink = document.getElementById(`tab${tab.id}`);
  if (tabLink) {
    setTabLinkTooltip(tabLink, tab);
  }
}

async function updateTabLink(tabId) {
  var tab = await browser.tabs.get(tabId);
  updateTabLinkToolTip(tab);
  updateTabLinkTitle(tab);
  updateTabLinkIcon(tabId);
}

async function updateTabLinkFontStyle(info) {
  var currentWindow = await browser.windows.getCurrent();
  if (currentWindow.id !== info.windowId) {
    return;
  }
  var deactivatedTitle = document.getElementById(`tabtitle${info.previousTabId}`);
  deactivatedTitle && deactivatedTitle.classList.remove('currenttab');
  var deactivatedMarker = document.getElementById(`tabmarker${info.previousTabId}`);
  deactivatedMarker && deactivatedMarker.classList.remove('visible');
  var activatedTitle = document.getElementById(`tabtitle${info.tabId}`);
  activatedTitle && activatedTitle.classList.add('currenttab');
  var activatedMarker = document.getElementById(`tabmarker${info.tabId}`);
  activatedMarker && activatedMarker.classList.add('visible');
}

document.addEventListener("DOMContentLoaded", () => {
  listUndiscardedNonBlankTabs();
  document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
  document.getElementById('keep-current-tab').addEventListener('click', unloadAllTabsExceptCurrentTab);
  document.getElementById('keep-current-window').addEventListener('click', unloadAllTabsExceptCurrentWindow);
  document.getElementById('unload-current-window').addEventListener('click', unloadCurrentWindow);
  document.getElementById('unload-current-tab').addEventListener('click', unloadCurrentTab);
});

browser.tabs.onUpdated.addListener(removeTabLink);
browser.tabs.onUpdated.addListener(updateTabLink);
browser.tabs.onActivated.addListener(updateTabLinkFontStyle);
browser.tabs.onRemoved.addListener(removeTabLink);

window.oncontextmenu = (e) => { e.preventDefault(); };
