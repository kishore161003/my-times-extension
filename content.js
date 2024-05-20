chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("Received message in content script:", message);
  if (message.action === "alertRestricted") {
    console.log("restricted");
    const userConfirmed = confirm(
      "This page is not allowed or you have exceeded the time ."
    );
    if (userConfirmed) {
      chrome.runtime.sendMessage({ action: "closeTab" });
    }
  }
});
