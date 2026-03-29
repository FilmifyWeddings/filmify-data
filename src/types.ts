export interface SubLink {
  id: string;
  title: string;
  url: string;
}

export interface LinkItem {
  id: string;
  title: string;
  subLinks: SubLink[];
  isEditable?: boolean;
}

export interface DeliveryType {
  id: string;
  title: string;
  color?: string;
  items: { id: string, title: string }[];
  enabled?: boolean;
}

export interface Client {
  ID: string;
  Name: string;
  Date: string;
  Type: string;
  Storage: string;
  Secure: boolean;
  Links: Record<string, LinkItem[]>;
  EnabledSections?: Record<string, boolean>;
}

export interface AppData {
  clients: Client[];
  settings: {
    functionTypes: string[];
    storageTypes: string[];
  };
}
