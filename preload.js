const { contextBridge } = require('electron');

// Expose minimal, safe APIs to the renderer if you need them.
contextBridge.exposeInMainWorld('electron', {
  /* add safe functions here, e.g.
  openFile: (path) => ipcRenderer.invoke('open-file', path)
  */
});
