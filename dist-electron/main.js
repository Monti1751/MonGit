import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
//#region electron/main.js
var execAsync = promisify(exec);
ipcMain.handle("select-folder", async () => {
	const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ["openDirectory"] });
	if (!canceled && filePaths.length > 0) return filePaths[0];
	return null;
});
ipcMain.handle("get-git-status", async (event, folderPath) => {
	try {
		const { stdout } = await execAsync("git status --porcelain", { cwd: folderPath });
		return stdout.split("\n").filter((line) => line.trim() !== "").map((line) => {
			return {
				status: line.substring(0, 2),
				path: line.substring(3)
			};
		});
	} catch (err) {
		console.error("get-git-status error:", err);
		return null;
	}
});
ipcMain.handle("commit-changes", async (event, folderPath, files, message) => {
	try {
		for (const file of files) await execAsync(`git add "${file}"`, { cwd: folderPath });
		await execAsync(`git commit -m "${message.replace(/"/g, "\\\"")}"`, { cwd: folderPath });
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err.message
		};
	}
});
ipcMain.handle("push-changes", async (event, folderPath) => {
	try {
		await execAsync("git push", { cwd: folderPath });
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err.message
		};
	}
});
var __dirname = dirname(fileURLToPath(import.meta.url));
app.setAppUserModelId("MonGit");
var win = null;
async function createWindow() {
	win = new BrowserWindow({
		title: "MonGit",
		width: 1200,
		height: 800,
		icon: join(__dirname, "../public/favicon.svg"),
		webPreferences: {
			preload: join(__dirname, "../dist-electron/preload.js"),
			nodeIntegration: true,
			contextIsolation: true
		},
		autoHideMenuBar: true
	});
	if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
	else win.loadFile(join(__dirname, "../dist/index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
	win = null;
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
//#endregion
