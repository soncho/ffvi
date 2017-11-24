home = 'https://www.google.co.jp';
search_base_url = 'https://www.google.com/search?q=';

// chrome.tabs.onRemoved.addListener(
//   function(tabId, removeInfo) {
//     console.log(chrome.tabs.get(tabId));
//     console.log(removeInfo);

//   }
// );

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch (request.action) {
      case 'move_left_tab':
        changeActiveTab(-1);
        break;

      case 'move_right_tab':
        changeActiveTab(1);
        break;

      case 'create_new_tab':
        openTab(request.url);
        break;

      case 'close_tab':
        closeTab();
        break;

      case 'reload_tab':
        chrome.tabs.reload();
        break;

      case 'search':
        request_url = search_base_url + request.query;
        if (request.newTab)
          openTab(request_url);
        else
          chrome.tabs.update({url: request_url});
        break;

      case 'paste_url':
        if (request.newTab)
          openTab(request.url);
        else
          chrome.tabs.update({url: request.url});
        break;

      case "go_home":
        // var url = browser.browserSettings.homepageOverride.get({}).value
        chrome.tabs.update({url: home});
        break;
    }
  }
);

function query(options) {
  return new Promise(function(resolve) {
    chrome.tabs.query(options, resolve);
  });
}

function getAllTab() {
  return query({}).then(
    function (tabs) { return tabs; });
}

function getTab(options) {
  return query(options).then(
    function (tabs) { return tabs[0]; });
}

function getActiveTab() {
  return query({active: true, currentWindow: true }).then(
    function (tabs) { return tabs[0]; });
}

// Action
function changeActiveTab(diff) {
  Promise.all([getAllTab(), getActiveTab()]).then(function (values) {
    tab_num = values[0].length;
    tab_index = values[1].index;
    return (tab_index + diff + tab_num) % tab_num;
  }).then(function (index) {
    return getTab({index: index});
  }).then(function (tab) {
    chrome.tabs.update(tab.id, {active: true});
  })
}

function closeTab() {
  getActiveTab().then(function (tab) {
    chrome.tabs.remove(tab.id);
  });
};

function openTab(url) {
  getActiveTab().then(function (tab) {
    chrome.tabs.create({url: url, index: tab.index + 1});
  })
}
