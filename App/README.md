# Edify App

This folder is the Windows desktop version of Edify.

It keeps the same premium UI as the web build, but adds Electron native features:

- `.edify` local project files
- Windows save/open/import dialogs
- autosave and recovery
- recent projects
- relink media flow
- packaging as a Windows installer

## Run Desktop App

```powershell
npm.cmd install
npm.cmd run dev
```

## Build

```powershell
npm.cmd run build
```

## Create Windows Installer

```powershell
npm.cmd run package:win
```

The installer is created in:

```text
App/release/Edify Setup 0.1.0.exe
```

For production signing, convert `resources/icon.svg` to `resources/icon.ico`, add the icon path back to `package.json`, and enable signing/resource editing in a Windows environment with the needed privileges.
