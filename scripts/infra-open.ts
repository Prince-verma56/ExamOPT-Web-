import { exec } from "child_process";

const url = "http://localhost:5050";

function openBrowser(url: string) {
  const platform = process.platform;
  let command = "";
  if (platform === "win32") {
    command = `start ${url}`;
  } else if (platform === "darwin") {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  console.log(`Opening ${url} in your default browser...`);
  
  exec(command, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`);
    }
  });
}

openBrowser(url);
