async function getTabCount(eventTabId, isOnRemoved) {
  var tabs = await browser.tabs.query({ discarded: false });
  var tabCount = 0;
  for (var tab of tabs) {
    var isTabBeingRemoved = tab.id === eventTabId && isOnRemoved === true;
    if (!isBlankTab(tab) && !isTabBeingRemoved) {
      tabCount++;
    }
  }
  return tabCount;
}

async function updateBadgeTabCounter(eventTabId, isOnRemoved) {
  var tabCount = await getTabCount(eventTabId, isOnRemoved);
  browser.browserAction.setBadgeText({ text: tabCount.toString() });
  var badgeBgColor = 'green';
  badgeBgColor = (tabCount > 9) ? 'orange' : badgeBgColor;
  badgeBgColor = (tabCount > 19) ? '#E00000' : badgeBgColor;
  browser.browserAction.setBadgeBackgroundColor({ color: badgeBgColor });
  if (browser.browserAction.setBadgeTextColor) {
    browser.browserAction.setBadgeTextColor({ color: 'white' });
  }
}

browser.tabs.onRemoved.addListener((tabId) => { updateBadgeTabCounter(tabId, true); });
browser.tabs.onUpdated.addListener(updateBadgeTabCounter);

browser.menus.create({
  id: "unload-tab",
  title: "Unload Tab",
  contexts: ["tab", "page"]
});

browser.menus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "unload-tab") {
    unloadTabWithId(tab.id);
  }
});

updateBadgeTabCounter();
