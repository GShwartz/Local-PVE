// types.ts
export interface Auth {
  ticket: string;
  csrf_token: string;
}

export interface VM {
  vmid: number;
  name: string;
  status: string;
  os: string;
  cpus: number;
  ram: number;
  num_hdd: number;
  hdd_sizes: string;
  ip_address: string;
  hdd_free: string;
}

export interface Snapshot {
  name: string;
  description?: string;
  snaptime?: number;
}

export interface TaskStatus {
  status: string;
  exitstatus?: string;
}

export interface VMCreate {
  name: string;
  cpus: number;
  ram: number;
  source: string;
}

export interface VMUpdate {
  vmid: number;
  name?: string;
  cpus?: number;
  ram?: string;
  source?: string;
}

// Additional types you might need for a Proxmox frontend:

export interface Node {
  node: string;
  status: 'online' | 'offline';
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
}

export interface Storage {
  storage: string;
  type: string;
  content: string;
  used: number;
  avail: number;
  total: number;
  enabled: boolean;
}

export interface Container {
  vmid: number;
  name: string;
  status: string;
  cpus: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime?: number;
}

export interface BackupJob {
  id: string;
  enabled: boolean;
  node: string;
  schedule: string;
  vmid?: string;
  storage: string;
  compress: string;
  mode: 'snapshot' | 'suspend' | 'stop';
}

export interface NetworkInterface {
  name: string;
  type: string;
  active: boolean;
  autostart: boolean;
  bridge_ports?: string;
  address?: string;
  netmask?: string;
  gateway?: string;
}

export interface ProxmoxUser {
  userid: string;
  enable: boolean;
  expire?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  groups?: string[];
}

export interface Permission {
  path: string;
  roleid: string;
  type: 'user' | 'group';
  ugid: string;
}

export interface Resource {
  id: string;
  type: 'node' | 'vm' | 'storage' | 'pool';
  node?: string;
  vmid?: number;
  status?: string;
  name?: string;
  pool?: string;
}

export interface VNCInfo {
  cert: string;
  port: number;
  ticket: string;
  upid: string;
  user: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  errors: Record<string, string>;
}

// Form interfaces
export interface LoginForm {
  username: string;
  password: string;
  realm?: string;
}

export interface VMCloneForm {
  newid: number;
  name?: string;
  description?: string;
  target?: string;
  full?: boolean;
}

// Utility types
export type VMStatus = 'running' | 'stopped' | 'suspended' | 'paused';
export type TaskType = 'start' | 'stop' | 'restart' | 'shutdown' | 'suspend' | 'resume' | 'clone' | 'migrate';

// Query keys for React Query
export const QueryKeys = {
  VMS: 'vms',
  VM_DETAIL: 'vm-detail',
  NODES: 'nodes',
  STORAGE: 'storage',
  TASKS: 'tasks',
  SNAPSHOTS: 'snapshots',
  CONTAINERS: 'containers',
  USERS: 'users',
  PERMISSIONS: 'permissions',
} as const;