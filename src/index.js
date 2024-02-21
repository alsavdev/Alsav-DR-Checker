const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require('fs')
const { proccess, stopProccess } = require("./main");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#fff",
      symbolColor: "#198754",
    },
    // icon: path.join(__dirname, './assets/traffic-3.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  app.isPackaged && Menu.setApplicationMenu(null);

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update_progress", progress.percent);
  });

  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on("update-available", () => {
    updateCheckInProgress = false;
    mainWindow.webContents.send("update_available");
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update_downloaded");
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("app_version", (event) => {
  event.sender.send("app_version", {
    version: app.getVersion(),
  });
});

ipcMain.on("restart_app", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on("main", async (event, data) => {
  const logs = [];
  const prog = [];
  const reports = [];

  const log = (message) => {
    logs.push(message);
    event.sender.send("log", logs.join("\n"));
  };

  const proggress = (pros) => {
    prog.push(pros);
    event.sender.send("proggress", prog);
  };

  const logToTable = (url, hasil) => {
    reports.push({
      url,
      hasil,
    });
    event.sender.send("logToTable", reports);
  };

  try {
    event.sender.send("run");
    log("[INFO] PROCESS STARTED...\n");
    await proccess(log, proggress, logToTable, data);
    log("\n[INFO] PROCESS COMPLETED SUCCESSFULLY\n");
    event.sender.send("force");
  } catch (error) {
    log(`[ERROR] ${error}`);
    event.sender.send("force");
  }
});

ipcMain.on("stop", (event) => {
  stopProccess();
  event.sender.send("force");
});

ipcMain.on('save-excel-data', (event, data) => {
  const options = {
      title: 'Save the data',
      defaultPath: `data-trafic.xlsx`,
      filters: [{
          name: '.xlsx',
          extensions: ['xlsx']
      }]
  };

  dialog.showSaveDialog(options).then(result => {
      if (!result.canceled) {
          fs.writeFileSync(result.filePath, new Uint8Array(data));
          dialog.showMessageBox({
              type: 'info',
              title: 'Alert',
              message: 'Success save the file report',
              buttons: ['OK']
          });
      } else {
          dialog.showMessageBox({
              type: 'info',
              title: 'Alert',
              message: 'File save cancelled',
              buttons: ['OK']
          });
      }
  }).catch(err => {
      console.error(err);
      dialog.showMessageBox({
          type: 'error',
          title: 'Error',
          message: 'An error occurred while saving the file.',
          buttons: ['OK']
      });
  });
});
