export interface Link {
  id: string;
  title: string;
  url: string;
}

export interface Client {
  ID: string;
  Name: string;
  Date: string;
  Type: string;
  Storage: string;
  Secure: boolean;
  Links: {
    cloud?: Link[];
    photos?: Link[];
    videos?: Link[];
  };
}

export interface AppData {
  clients: Client[];
  settings: {
    functionTypes: string[];
    storageTypes: string[];
  };
}
