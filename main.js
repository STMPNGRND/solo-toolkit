'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const dialog = electron.dialog;
var client = require('electron-connect').client;
const ipcMain = require('electron').ipcMain;
const globalShortcut = require('electron').globalShortcut;
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;


// TODO - doing some work on the build system. Will write a bunch of config variables to /app/.env.json to be loaded and parsed by the app
// This will replace current method of using environment variables
const ENV = require('./app/.env.json');


// If we're developing the app we'll use electron-connect and open the dev tools by default
const DEVELOP = (ENV.dev_env);
const VERSION = app.getVersion();

global.sharedConfig = {dev_env:DEVELOP, version:VERSION};
console.log(global.sharedConfig);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  };
});

ipcMain.on('open-dir-dialog', function(event, arg) {
    var dirPath = dialog.showOpenDialog(mainWindow, { properties: [ 'openDirectory', 'multiSelections' ]})
    event.sender.send('open-dir-dialog-reply', dirPath);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  //Set basic window options
  var window_options = {
    "minWidth": 770,
    "minHeight": 450,
  };

  // Create the browser window.
  mainWindow = new BrowserWindow(window_options);

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  if (DEVELOP) client.create(mainWindow, {sendBounds: true});

  // Open the DevTools.
  if (DEVELOP) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('activate', function () {
  // Create a new window when the window has been closed but the user clicks on the dock icon
  if (mainWindow === null) {
    createWindow()
  }
})
