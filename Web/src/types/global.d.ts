type WebEdifyBridge = {
  bootstrap: () => Promise<any>;
  saveProject: (document: any, filePath?: string) => Promise<any>;
  saveProjectAs: (document: any) => Promise<any>;
  openProjectDialog: () => Promise<any>;
  openProjectPath: (filePath: string) => Promise<any>;
  renameProject: (filePath: string, name: string) => Promise<any>;
  deleteProject: (filePath: string) => Promise<any>;
  importMedia: () => Promise<any>;
  inspectDroppedFiles: (filePaths: string[]) => Promise<any>;
  getPathForFile: (file: File) => string;
  saveRecording: (name: string, buffer: ArrayBuffer) => Promise<any>;
  relinkMedia: () => Promise<any>;
  writeAutosave: (document: any) => Promise<any>;
  readAutosave: () => Promise<any>;
  clearAutosave: () => Promise<any>;
  setSetting: (key: string, value: any) => Promise<any>;
  showItemInFolder: (filePath: string) => Promise<any>;
  chooseExportPath: (request: any) => Promise<any>;
  startExport: (request: any) => Promise<any>;
  cancelExport: (jobId: string) => Promise<any>;
  windowMinimize: () => Promise<any>;
  windowClose: () => Promise<any>;
  onExportProgress: (callback: (event: any) => void) => () => void;
};

declare global {
  interface Window {
    edify?: WebEdifyBridge;
  }
}

export {};
