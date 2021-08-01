function getTabCount(tabs, eventTabId, isOnRemoved) {
  var tabCount = 0;
  for (var tab of tabs) {
    var isAboutTab = tab.url.startsWith('about');
    var isEventTab = tab.id == eventTabId;
    var isTabOnRemoved = isEventTab && isOnRemoved == true;
    var isTabDiscardable = !tab.discarded && !isAboutTab && !isTabOnRemoved;
    if (isTabDiscardable) {
      tabCount++;
    }
  }
  return tabCount;
}

async function updateBadgeTabCounter(eventTabId, isOnRemoved) {
  var tabs = await browser.tabs.query({});
  var tabCount = getTabCount(tabs, eventTabId, isOnRemoved);
  browser.browserAction.setBadgeText({text: tabCount.toString()});
  var badgeBgColor = 'green';
  badgeBgColor = (tabCount > 9) ? 'orange' : badgeBgColor;
  badgeBgColor = (tabCount > 19) ? 'red' : badgeBgColor;
  browser.browserAction.setBadgeBackgroundColor({'color': badgeBgColor});
}

browser.tabs.onRemoved.addListener((tabId) => { updateBadgeTabCounter(tabId, true); }); // [1]
browser.tabs.onUpdated.addListener(updateBadgeTabCounter, { properties: ['status', 'discarded'] }); // [2]

updateBadgeTabCounter(); // for setting badge tab counter initially

// [1] tab count on badge: https://github.com/mdn/webextensions-examples/blob/master/tabs-tabs-tabs/background.js
// [2] tabs.onUpdated API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated
