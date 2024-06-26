let user = null;

async function getUserData() {
  chrome.runtime.sendMessage({ action: "getUserData" }, function (response) {
    user = response;
    console.log(response, res);
  });
}

setInterval(() => {
  console.log(user);
}, 1000);

getUserData();

document.getElementById("loginButton").addEventListener("click", function () {
  console.log("clicked");
  if (user !== null) {
    chrome.tabs.create({ url: "https://mytimes-kishorekp.vercel.app" });
  } else {
    chrome.tabs.create({
      url: "https://mytimes-kishorekp.vercel.app/auth/login",
    });
  }
});
