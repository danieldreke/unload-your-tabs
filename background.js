async function getTabCount(eventTabId, isOnRemoved) {
  var tabCount = 0;
  var tabs = await browser.tabs.query({ discarded: false });
  for (var tab of tabs) {
    var isEventTab = tab.id == eventTabId;
    var isTabOnRemoved = isEventTab && isOnRemoved == true;
    var isBlankTab = tab.url.startsWith('about:new') || tab.url.startsWith('about:home');
    var isTabDiscardable = !isBlankTab && !isTabOnRemoved;
    if (isTabDiscardable) {
      tabCount++;
    }
  }
  return tabCount;
}

async function updateBadgeTabCounter(eventTabId, isOnRemoved) {
  var tabCount = await getTabCount(eventTabId, isOnRemoved);
  browser.browserAction.setBadgeText({text: tabCount.toString()});
  var badgeBgColor = 'green';
  badgeBgColor = (tabCount > 9) ? 'orange' : badgeBgColor;
  badgeBgColor = (tabCount > 19) ? 'red' : badgeBgColor;
  browser.browserAction.setBadgeBackgroundColor({'color': badgeBgColor});
  var badgeTextColor = 'white';
  badgeTextColor = (tabCount > 9 && tabCount < 20) ? 'black' : badgeTextColor;
  browser.browserAction.setBadgeTextColor({'color': badgeTextColor});
}

browser.tabs.onRemoved.addListener((tabId) => { updateBadgeTabCounter(tabId, true); }); // [1]
browser.tabs.onUpdated.addListener(updateBadgeTabCounter, { properties: ['status', 'discarded'] }); // [2]

updateBadgeTabCounter(); // for setting badge tab counter initially

// [1] tab count on badge: https://github.com/mdn/webextensions-examples/blob/master/tabs-tabs-tabs/background.js
// [2] tabs.onUpdated API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated
