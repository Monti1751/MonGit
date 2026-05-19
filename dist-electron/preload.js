//#endregion
//#region electron/preload.js
var { contextBridge, ipcRenderer } = (/* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, { get: (a, b) => (typeof require !== "undefined" ? require : a)[b] }) : x)(function(x) {
	if (typeof require !== "undefined") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + x + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}))("electron");
contextBridge.exposeInMainWorld("electronAPI", {
	selectFolder: () => ipcRenderer.invoke("select-folder"),
	getGitStatus: (folderPath) => ipcRenderer.invoke("get-git-status", folderPath),
	commitChanges: (folderPath, files, message) => ipcRenderer.invoke("commit-changes", folderPath, files, message),
	pushChanges: (folderPath) => ipcRenderer.invoke("push-changes", folderPath)
});
//#endregion
