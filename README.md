# Edify

Ce dossier contient maintenant seulement les deux versions actuelles.

```text
App/
  Vraie application Windows Electron.
  Le nouvel installateur est dans App/release/Edify Setup 0.1.0.exe

Web/
  Version web/preview.
  Ouvre Web/index.html directement : il redirige vers Web/dist/index.html.
```

## Lancer L'App

Sans reinstaller le setup, double-clique :

```text
Launch Edify.bat
```

Pour mettre a jour l'app locale sans refaire l'installateur, double-clique :

```text
Update Edify App.bat
```

Pour le mode developpement avec rechargement rapide :

```text
Start Edify Dev.bat
```

Ou en terminal :

```powershell
cd App
npm.cmd run dev
```

## Refaire L'Installateur Windows

```powershell
cd App
npm.cmd run package:win
```

## Lancer Le Web

```powershell
cd Web
npm.cmd run dev
```

Tu peux aussi ouvrir `Web/index.html`; si tu l'ouvres en double-cliquant, il renvoie vers la version buildée dans `Web/dist`.
