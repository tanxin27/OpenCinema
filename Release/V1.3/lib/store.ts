import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { projectAssets: number; jobs: number };
}

export interface AssetFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface AssetFile {
  id: string;
  assetId: string;
  name: string;
  url: string;
  type: string;
  size: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type AssetTag = "character" | "scene" | "audio" | "video" | "other";

export const ASSET_TAG_LABELS: Record<AssetTag, string> = {
  character: "角色",
  scene: "场景",
  audio: "音频",
  video: "视频",
  other: "其他",
};

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  tag: AssetTag | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  files: AssetFile[];
}

export interface Job {
  id: string;
  projectId: string;
  type: string;
  params: Record<string, unknown>;
  status: string;
  resultUrl: string | null;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditorFile {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  name: string;
}

interface AppState {
  projects: Project[];
  folders: AssetFolder[];
  assets: Asset[];
  jobs: Job[];
  pendingEditorFiles: EditorFile[];
  setProjects: (projects: Project[]) => void;
  setFolders: (folders: AssetFolder[]) => void;
  setAssets: (assets: Asset[]) => void;
  setJobs: (jobs: Job[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (project: Project) => void;
  addFolder: (folder: AssetFolder) => void;
  removeFolder: (id: string) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  updateAsset: (asset: Asset) => void;
  addJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  pushPendingEditorFiles: (files: EditorFile[]) => void;
  clearPendingEditorFiles: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  folders: [],
  assets: [],
  jobs: [],
  pendingEditorFiles: [],
  setProjects: (projects) => set({ projects }),
  setFolders: (folders) => set({ folders }),
  setAssets: (assets) => set({ assets }),
  setJobs: (jobs) => set({ jobs }),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
  updateProject: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
    })),
  addFolder: (folder) =>
    set((state) => ({ folders: [folder, ...state.folders] })),
  removeFolder: (id) =>
    set((state) => ({ folders: state.folders.filter((f) => f.id !== id) })),
  addAsset: (asset) =>
    set((state) => ({ assets: [asset, ...state.assets] })),
  removeAsset: (id) =>
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),
  updateAsset: (asset) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === asset.id ? asset : a)),
    })),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === job.id ? job : j)),
    })),
  pushPendingEditorFiles: (files) =>
    set((state) => ({
      pendingEditorFiles: [...state.pendingEditorFiles, ...files],
    })),
  clearPendingEditorFiles: () => set({ pendingEditorFiles: [] }),
}));
