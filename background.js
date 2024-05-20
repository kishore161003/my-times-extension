let previousTabId = null;
let previousTabUrl = null;
let previousStartTime = null;
let userData = null;
let timeoutId = null;

const timeSpentOnWebsites = {};
let restrictedWebsites = {};

function getCurrentDate() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function updateTimeSpentAndResetTimeout(tabId, url) {
  const currentTime = Date.now();
  const elapsedTime = currentTime - previousStartTime; // Calculate elapsed time
  const timeSpentToday = timeSpentOnWebsites[previousTabUrl]?.time_spend || 0; // Get the time spent on the previous website

  if (previousTabUrl !== null && previousStartTime !== null) {
    if (elapsedTime >= 10000) {
      // If 10 seconds have passed
      if (previousTabUrl === url) {
        // If the user stayed on the same website
        const carry = Math.floor(elapsedTime / 10000); // Calculate how many 10-second intervals have passed
        updateTimeSpentOnWebsite(previousTabUrl, previousTabId, carry * 10); // Update time spent
        previousStartTime += carry * 10000; // Adjust previousStartTime
      } else {
        const timeSpent = elapsedTime / 1000; // Convert to seconds
        updateTimeSpentOnWebsite(previousTabUrl, previousTabId, timeSpent); // Update time spent
      }
    }
  }

  previousTabUrl = url;
  previousStartTime = currentTime;

  if (timeSpentOnWebsites.hasOwnProperty(url)) {
    const websiteEntry = timeSpentOnWebsites[url];
    if (websiteEntry.timeout !== -1) {
      const timeoutMillis = websiteEntry.timeout * 1000;
      const remainingTime = Math.max(0, timeoutMillis - timeSpentToday * 1000);
      console.log(
        "Setting timeout for",
        new Date(currentTime + remainingTime).toLocaleTimeString(),
        new Date(currentTime).toLocaleTimeString()
      );
      timeoutId = setTimeout(() => {
        handleTimeout(url, tabId);
      }, remainingTime);
    }
  }
}

function handleTimeout(currentTabUrl, currentTabId) {
  console.log("Timeout reached for", currentTabUrl);
  // Set the website as restricted for the day
  if (currentTabUrl === "chrome://newtab/") {
    return;
  }
  timeSpentOnWebsites[currentTabUrl].daily_limit_exceeded = true;
  chrome.tabs.get(currentTabId, function (tab) {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving tab:", chrome.runtime.lastError.message);
      return;
    }
    if (!tab) {
      console.log("Tab does not exist.");
      return;
    }
    console.log("Sending message to tab:", currentTabId);
    chrome.scripting.executeScript(
      {
        target: { tabId: currentTabId },
        function: () => {
          confirm("You have exceeded the daily time limit for this website.");
        },
      },
      () => {
        chrome.tabs.remove(currentTabId, function () {
          console.log("Tab removed.");
        });
      }
    );
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("Receiving message");
  if (message.action === "getUserData") {
    console.log(userData);
    sendResponse({ success: true, data: userData });
  }
});

const initUserData = () => {
  chrome.storage.local.get(["userData"], function (result) {
    userData = result.userData;
  });
};


setInterval(initUserData, 1000);

// Function to store data in Chrome extension's local storage
function storeUserData(userData) {
  chrome.storage.local.set({ userData: userData }, function () {
    console.log("User data stored:", userData);
  });
}

setInterval(async () => {
  const currentTime = Date.now();

  for (const [url, data] of Object.entries(timeSpentOnWebsites)) {
    var carry = 0;
    if ((currentTime - previousStartTime) / 1000 >= 10) {
      carry = Math.floor((currentTime - previousStartTime) / 1000 - 10);
      previousStartTime = currentTime;
    }

    try {
      const payload = {
        url: url,
        time_spend: data.time_spend + carry,
        timeout: data.timeout,
        restricted: data.restricted,
        user_id: data.user_id,
      };

      const response = await fetch(
        "https://mysite-1wyv.onrender.com/update_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update data for ${url}. Status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("result", result);
      timeSpentOnWebsites[url].time_spend = result.time_spent;
      timeSpentOnWebsites[url].daily_limit_exceeded =
        result.time_spent >= timeSpentOnWebsites[url].timeout &&
        timeSpentOnWebsites[url].timeout !== -1;

      if (result.daily_limit_exceeded) {
        handleTimeout(url, data.tab_id);
      } else {
        console.log(`Successfully updated time for ${url}`);
        console.log(result);
      }
    } catch (e) {
      console.error(`Error updating data for ${url}: ${e.message}`);
    }
  }
}, 10000);

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    console.log("recieving");
    if (message.action === "storeUserData") {
      const userData = message.data;
      storeUserData(userData);
      sendResponse({ status: "success" });
    } else {
      sendResponse({ error: "Invalid request" });
    }
  }
);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "closeTab") {
    console.log("closing tab");
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

chrome.tabs.onActivated.addListener(handleTabActivation);

chrome.tabs.onUpdated.addListener(handleTabUpdate);

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (previousTabUrl !== null && tabId === previousTabId) {
    const currentTime = Date.now();
    const timeSpent = (currentTime - previousStartTime) / 1000; // Convert to seconds
    updateTimeSpentOnWebsite(previousTabUrl, previousTabId, timeSpent);
    clearTimeout(timeoutId); // Clear the timeout if the tab is removed
    previousTabUrl = null;
    previousTabId = null;
    previousStartTime = null;
  }
});

function isRestricted(url) {
  return (
    restrictedWebsites.hasOwnProperty(url) ||
    (timeSpentOnWebsites.hasOwnProperty(url) &&
      timeSpentOnWebsites[url].daily_limit_exceeded)
  );
}

function injectAndSendMessage(tabId, message) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ["content.js"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.sendMessage(tabId, message);
    }
  );
}

function updateTimeSpentOnWebsite(website, tabId, timeSpent) {
  if (timeSpentOnWebsites.hasOwnProperty(website)) {
    const entry = timeSpentOnWebsites[website];
    entry.time_spend = (entry.time_spend || 0) + timeSpent;
    entry.tab_id = tabId;
  } else {
    timeSpentOnWebsites[website] = {
      restricted: false,
      time_spend: timeSpent,
      timeout: -1,
      tab_id: tabId,
      user_id: userData?.id,
      daily_limit_exceeded: false,
    };
  }
}

function handleTabActivation(activeInfo) {
  const currentTabId = activeInfo.tabId;
  chrome.tabs.get(currentTabId, function (tab) {
    const currentTabUrl = tab.url;
    const currentTime = Date.now(); // Get the current time here
    if (currentTabUrl && timeSpentOnWebsites.hasOwnProperty(currentTabUrl)) {
      timeSpentOnWebsites[currentTabUrl].tab_id = currentTabId;
    }
    if (previousTabUrl !== null && previousStartTime !== null) {
      const timeSpent = (currentTime - previousStartTime) / 1000; // Convert to seconds
      updateTimeSpentOnWebsite(previousTabUrl, previousTabId, timeSpent);
    }

    if (previousTabId !== null) {
      clearTimeout(timeoutId); // Clear the previous timeout
    }

    if (currentTabUrl && isRestricted(currentTabUrl)) {
      injectAndSendMessage(currentTabId, { action: "alertRestricted" });
    } else {
      previousTabUrl = currentTabUrl;
    }

    previousStartTime = currentTime;

    const websiteEntry = timeSpentOnWebsites[currentTabUrl];
    if (websiteEntry && websiteEntry.timeout !== -1) {
      const timeoutMillis = websiteEntry.timeout * 1000;
      const timeSpentToday = websiteEntry.time_spend || 0;
      const remainingTime = Math.max(0, timeoutMillis - timeSpentToday * 1000);
      console.log(
        "Setting timeout for",
        new Date(currentTime + remainingTime).toLocaleTimeString(),
        new Date(currentTime).toLocaleTimeString()
      );
      timeoutId = setTimeout(() => {
        handleTimeout(currentTabUrl, currentTabId);
      }, remainingTime);
    }

    previousTabId = currentTabId;
  });
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.url && changeInfo.url !== previousTabUrl) {
    updateTimeSpentAndResetTimeout(tabId, changeInfo.url);
  }

  if (changeInfo.url && isRestricted(changeInfo.url)) {
    injectAndSendMessage(tabId, { action: "alertRestricted" });
  }
}

setInterval(async () => {
  if (!userData) return;
  try {
    console.log(userData.id, "user");
    const res = await fetch(
      `https://mysite-1wyv.onrender.com/websites/with_restriction_or_timeout/${userData.id}`
    );
    const data = await res.json();
    restrictedWebsites = {};
    data.forEach((website) => {
      restrictedWebsites[website.url] = website;
    });
    console.log(restrictedWebsites);
    console.log(timeSpentOnWebsites, "time spent on websites");
  } catch (e) {
    console.log(e);
  }
}, 10000);

// Initial fetch for restricted websites
