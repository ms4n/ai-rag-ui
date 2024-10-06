import puppeteer from "puppeteer";

const WEBSITE_URL =
  "https://tailwindui.com/components/marketing/sections/cta-sections";

async function scrape() {
  console.log("Starting scrape function");
  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging, true for production
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Browser launched");

  // Override permissions for clipboard access
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(WEBSITE_URL, [
    "clipboard-read",
    "clipboard-write",
    "clipboard-sanitized-write",
  ]);
  console.log("Clipboard permissions overridden");

  const page = await browser.newPage();
  console.log("New page created");

  console.log("Navigating to the page...");
  await page.goto(WEBSITE_URL);
  console.log("Page loaded");

  // Find the unique component ID using regex
  console.log("Searching for unique component ID...");
  const componentId = await page.evaluate(() => {
    const pageContent = document.body.innerHTML;
    const idPattern = /id="frame-([a-f0-9]{32})"/;
    const match = pageContent.match(idPattern);
    return match ? match[1] : null;
  });

  if (componentId) {
    console.log(`Found component ID: ${componentId}`);

    // Use the component ID to find and click the copy button
    console.log("Searching for copy button...");
    const copyButtonClicked = await page.evaluate((id) => {
      const copyButton = document.querySelector(
        `#component-${id} > div > div.ml-6.flex.items-center > button`
      );
      if (copyButton) {
        copyButton.click();
        return true;
      }
      return false;
    }, componentId);

    if (copyButtonClicked) {
      console.log("Copy button found and clicked");
    } else {
      console.log("Copy button not found");
      await browser.close();
      return;
    }

    // Wait a moment for the clipboard to be updated
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Attempt to get the copied content
    console.log("Attempting to read copied content...");
    const copiedContent = await page.evaluate(() => {
      return navigator.clipboard.readText().catch(() => null);
    });

    if (copiedContent) {
      console.log("Copied content:");
      console.log(copiedContent);
    } else {
      console.log(
        "Failed to read copied content. Attempting to find content in the DOM..."
      );

      // If we can't access the clipboard, try to find the content in the DOM
      const codeContent = await page.evaluate((id) => {
        const component = document.getElementById(`component-${id}`);
        const codeElement = component.querySelector("pre > code");
        return codeElement ? codeElement.textContent : null;
      }, componentId);

      if (codeContent) {
        console.log("Found code content in the DOM:");
        console.log(codeContent);
      } else {
        console.log("Failed to find code content in the DOM");
      }
    }
  } else {
    console.log("Failed to find unique component ID");
  }

  await browser.close();
  console.log("Browser closed");
}

scrape().catch((error) => {
  console.error("An error occurred:", error);
});

// #component-11e5dbce11b8c462441792503ea864fc > div > div.ml-6.flex.items-center > button
