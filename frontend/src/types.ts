// types.ts

// Authentication
export interface Auth {
  ticket: string;
  csrf_token: string;
}

// Virtual Machine
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

// Snapshot
export interface Snapshot {
  name: string;
  description?: string;
  snaptime?: number;
}

// Task Status
export interface TaskStatus {
  status: string;
  exitstatus?: string;
}

// Create / Update VM
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

// **New**: Clone VM request (matches backend VMCloneRequest)
export interface VMCloneRequest {
  /** Name for the new cloned VM */
  name: string;
  /** Full clone (true) or linked clone (false) */
  full: boolean;
  /** Target node on which to create the clone */
  target: string;
  /** Optional storage identifier for the clone */
  storage?: string;
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
  /** The newly allocated VMID: usually fetched from /cluster/nextid */
  newid: number;
  /** Name for the clone */
  name?: string;
  /** Optional description */
  description?: string;
  /** Target node (same as VMCloneRequest.target) */
  target?: string;
  /** Full clone? */
  full?: boolean;
}

// Utility types
export type VMStatus = 'running' | 'stopped' | 'suspended' | 'paused';
export type TaskType =
  | 'start'
  | 'stop'
  | 'restart'
  | 'shutdown'
  | 'suspend'
  | 'resume'
  | 'clone'
  | 'migrate';

// React Query keys
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
