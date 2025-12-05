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
  config?: Record<string, string>;
  node: string;
  net0_mac?: string;
  net0_ip?: string;
  net0_bridge?: string;
  net0_model?: string;
  net0_firewall?: boolean;
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

export interface VMCloneRequest {
  name: string;
  full: boolean;
  target: string;
  storage?: string;
}

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

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  errors: Record<string, string>;
}

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

export interface ProxmoxVMConfig {
  // NICs: net0, net1, net2, ... unlimited
  [key: `net${number}`]: string | undefined;

  // Common VM hardware settings
  name?: string;
  cores?: number;
  memory?: number;
  ostype?: string;
  agent?: number;

  // Disks
  [key: `scsi${number}`]: string | undefined;
  [key: `virtio${number}`]: string | undefined;
  [key: `sata${number}`]: string | undefined;
  [key: `ide${number}`]: string | undefined;

  // Fallback for any other Proxmox config keys
  [key: string]: any;
}

export interface VMConfigResponse {
  vmid: number;
  name: string;
  cores: number;
  memory: number;
  ostype: string;
  hdd_sizes: string;
  num_hdd: number;
  hdd_free: string;
  ip_address: string;
  status: string;
  config: ProxmoxVMConfig;
}

