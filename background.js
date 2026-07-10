chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "start-typing-test",
    title: "Lazy TypeTest",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "start-typing-test") {
    
    chrome.tabs.sendMessage(tab.id, { action: "initTest" });
  }
});
