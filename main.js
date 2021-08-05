async function addAndActivateBlankTab(window) {
  var hasBlankTab = false;
  for (var tab of window.tabs) {
    var isBlankTab = tab.url === 'about:newtab';
    if (isBlankTab) {
      hasBlankTab = true;
      browser.tabs.update(tab.id, { active: true });
      break;
    }
  }
  if (!hasBlankTab) {
    browser.tabs.create({ windowId: window.id, active: true });
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
  window.close();
}

async function unloadAllTabsExceptActiveWindow() {
  await addAndActivateBlankTabs(skipActiveWindow=true);
  var nonCurrentWindowTabs = await browser.tabs.query({ currentWindow: false });
  var tabIds = nonCurrentWindowTabs.map((tab) => tab.id);
  await browser.tabs.discard(tabIds);
  window.close();
}

document.getElementById('unload-all-tabs').addEventListener('click', unloadAllTabs);
document.getElementById('keep-active-tab').addEventListener('click', unloadAllTabsExceptActiveTab);
document.getElementById('keep-active-window').addEventListener('click', unloadAllTabsExceptActiveWindow);
