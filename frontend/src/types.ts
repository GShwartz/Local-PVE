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