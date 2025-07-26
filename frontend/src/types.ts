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
  ram?: number;
  source?: string;
}