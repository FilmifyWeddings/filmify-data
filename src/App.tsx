import { useState, useEffect, useMemo, forwardRef, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Loader2, Cloud, Image as ImageIcon, 
  Video, ChevronDown, ChevronUp, Shield, ShieldCheck, Search, MapPin,
  ExternalLink, X, Moon, Sun, LayoutGrid, Calendar, 
  Settings, Users, Briefcase, BarChart3, LogOut, Bell,
  CheckCircle2, Clock, AlertCircle, Camera, RefreshCw,
  MoreHorizontal, Link as LinkIcon, HardDrive, Edit, Copy
} from 'lucide-react';
import { Client, Link } from './types';

// --- IMPORTANT: REPLACE WITH YOUR DEPLOYED APPS SCRIPT URL ---
const DEFAULT_API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-10 text-center">
          <AlertCircle size={48} className="text-red-500 mb-6" />
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-neutral-400 mb-8 max-w-md">
            The app encountered an error. This usually happens if the connection settings are incorrect.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black rounded-xl font-bold"
            >
              Reload App
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-neutral-800 text-white rounded-xl font-bold"
            >
              Reset All Settings
            </button>
          </div>
          {this.state.error && (
            <pre className="mt-10 p-4 bg-neutral-900 rounded-lg text-xs text-left overflow-auto max-w-full text-red-400 border border-red-900/30">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('filmify_api_url') || DEFAULT_API_URL);
  const [teamSpreadsheetId, setTeamSpreadsheetId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'bin' | 'logs' | 'settings'>('projects');
  const [teamProjects, setTeamProjects] = useState<any[]>([]);
  const [bin, setBin] = useState<Client[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [appName, setAppName] = useState(() => localStorage.getItem('filmify_app_name') || 'Filmify Studio');
  const [storageOptions, setStorageOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('filmify_storage_options');
    return saved ? JSON.parse(saved) : ['HDD 01', 'HDD 02', 'SSD 01', 'SSD 02', 'Cloud Only'];
  });
  const [deliveryLinkTypes, setDeliveryLinkTypes] = useState<{ id: string, title: string, color?: string }[]>(() => {
    const saved = localStorage.getItem('filmify_delivery_link_types');
    return saved ? JSON.parse(saved) : [
      { id: 'cloud', title: 'Cloud Backup', color: '#fef3c7' },
      { id: 'photos', title: 'Photo Delivery', color: '#dcfce7' },
      { id: 'videos', title: 'Video Delivery', color: '#dbeafe' }
    ];
  });
  const [eventTypes, setEventTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('filmify_event_types');
    return saved ? JSON.parse(saved) : ['Wedding', 'Pre-wedding', 'Engagement', 'Maternity', 'Birthday', 'Corporate'];
  });

  const [newStorageName, setNewStorageName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [editingStorageIdx, setEditingStorageIdx] = useState<number | null>(null);
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);

  // Save App Name
  useEffect(() => {
    localStorage.setItem('filmify_app_name', appName);
  }, [appName]);

  // Save Storage Options
  useEffect(() => {
    localStorage.setItem('filmify_storage_options', JSON.stringify(storageOptions));
  }, [storageOptions]);

  // Save Delivery Link Types
  useEffect(() => {
    localStorage.setItem('filmify_delivery_link_types', JSON.stringify(deliveryLinkTypes));
  }, [deliveryLinkTypes]);

  // Save Event Types
  useEffect(() => {
    localStorage.setItem('filmify_event_types', JSON.stringify(eventTypes));
  }, [eventTypes]);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) {
      if (!isBackground) {
        await new Promise(r => setTimeout(r, 800));
        setLoading(false);
      }
      return;
    }
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Connection failed (HTTP ${response.status}). Check if the Apps Script URL is correct.`);
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
          throw new Error("The URL provided returned a web page instead of data. Make sure you are using the 'Web App URL' from Apps Script, NOT the Google Sheet URL.");
        }
        throw new Error("Invalid response format. Please verify your Apps Script deployment.");
      }

      if (data && typeof data === 'object') {
        if (data.clients && Array.isArray(data.clients)) {
          setClients(data.clients);
          setBin(Array.isArray(data.bin) ? data.bin : []);
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          setTeamProjects(Array.isArray(data.teamProjects) ? data.teamProjects : []);
          setTeamError(data.teamError || null);
          if (data.config?.teamSpreadsheetId) {
            setTeamSpreadsheetId(data.config.teamSpreadsheetId);
          }
        } else if (Array.isArray(data)) {
          setClients(data);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      if (!isBackground) setTeamError(error.message || "Failed to connect to Apps Script");
    } finally {
      if (!isBackground) setLoading(false);
      setIsFirstLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Background polling every 20 seconds for "instant" feel
    const interval = setInterval(() => {
      fetchData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Sync Data
  const sync = async (action: 'add' | 'update' | 'delete' | 'restore' | 'permanent_delete', client: Client) => {
    setIsSaving(true);
    const previousClients = [...clients];
    const previousBin = [...bin];

    // Optimistic UI updates
    if (action === 'add') setClients([client, ...clients]);
    else if (action === 'update') setClients(clients.map(c => c.ID === client.ID ? client : c));
    else if (action === 'delete') {
      setClients(clients.filter(c => c.ID !== client.ID));
      setBin([{ ...client, DeletedAt: new Date().toISOString() } as any, ...bin]);
    }
    else if (action === 'restore') {
      setBin(bin.filter(c => c.ID !== client.ID));
      setClients([client, ...clients]);
    }
    else if (action === 'permanent_delete') setBin(bin.filter(c => c.ID !== client.ID));

    if (!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) {
      setTimeout(() => setIsSaving(false), 500);
      return;
    }

    try {
      // If it's a team project not yet in clients, we need to sync it first
      if ((client as any).isTeamProject && (action === 'update' || action === 'delete')) {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'sync_team',
            id: client.ID,
            storage: client.Storage || 'HDD 01'
          })
        });
      }

      const payload = {
        action,
        id: client.ID,
        name: client.Name,
        date: client.Date,
        type: client.Type,
        storage: client.Storage,
        secure: client.Secure,
        links: client.Links || { cloud: [], photos: [], videos: [] }
      };

      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      fetchData(true);
    } catch (error) {
      console.error("Sync failed:", error);
      setClients(previousClients);
      setBin(previousBin);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const allMergedProjects = useMemo(() => {
    // Filter out team projects that are already synced to clients
    const existingIds = new Set(clients.map(c => String(c.ID)));
    
    const teamMapped = teamProjects
      .filter(tp => !existingIds.has(String(tp.ProjectID)))
      .map(tp => ({
        ID: tp.ProjectID,
        Name: tp.ClientName,
        Date: tp.Date,
        Type: tp.Type,
        Storage: 'HDD 01', // Default to first HDD instead of "Team Management"
        Secure: false,
        Links: { cloud: [], photos: [], videos: [] },
        isTeamProject: true
      }));

    return [...clients, ...teamMapped];
  }, [clients, teamProjects]);

  const filteredClients = useMemo(() => {
    let list = allMergedProjects.filter(c => {
      const name = String(c.Name || '');
      const type = String(c.Type || '');
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) || type.toLowerCase().includes(query);
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.Date).getTime() - new Date(a.Date).getTime();
      } else {
        return (a.Type || '').localeCompare(b.Type || '');
      }
    });

    return list;
  }, [allMergedProjects, searchQuery, sortBy]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 className="text-white" size={32} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans flex flex-col">
      {/* Header */}
      <header className="h-24 border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-10 lg:px-16 flex items-center justify-between gap-4">
        {/* Left: App Name */}
        <div className="flex items-center shrink-0">
          <input 
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="bg-transparent border-none font-bold text-xl sm:text-2xl outline-none w-32 sm:w-56 focus:ring-0 p-0 text-white"
            placeholder="App Name"
          />
        </div>

          <div className="flex-1 max-w-2xl relative mx-4 sm:mx-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clients..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-white/5 focus:border-neutral-100 transition-all outline-none text-white shadow-sm"
            />
          </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 mr-2">
            <button 
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              Clients
            </button>
            <button 
              onClick={() => setActiveTab('bin')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'bin' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              Bin
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              Logs
            </button>
          </div>

          {isSaving && (
            <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mr-2">
              <RefreshCw size={10} className="animate-spin" />
              Syncing
            </div>
          )}
          
          <button onClick={() => setIsAddOpen(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5">
            <Plus size={18} />
            <span className="hidden sm:inline">New Project</span>
          </button>

          <button 
            onClick={() => setActiveTab(activeTab === 'projects' ? 'settings' : 'projects')} 
            className={`btn-icon ${activeTab === 'settings' ? 'bg-neutral-800 ring-2 ring-white' : ''}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {(!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) ? (
            <div className="mb-8 p-6 bg-amber-900/20 border border-amber-500/50 rounded-2xl flex flex-col gap-4 text-amber-200 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Setup Required</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                To start using Filmify Data, you need to connect your Google Sheets backend. 
                Go to <strong>Settings</strong> and paste your <strong>Apps Script Web App URL</strong>.
              </p>
              <button 
                onClick={() => setActiveTab('settings')}
                className="w-fit px-6 py-2 bg-amber-500 text-black rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          ) : teamError ? (
            <div className="mb-8 p-6 bg-red-900/20 border border-red-500/50 rounded-2xl flex flex-col gap-4 text-red-200 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Connection Error</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                {teamError}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => fetchData()}
                  className="w-fit px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-400 transition-colors"
                >
                  Retry Connection
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-fit px-6 py-2 bg-neutral-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-neutral-700 transition-colors"
                >
                  Check Settings
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === 'projects' ? (
            <>
              <div className="flex items-end justify-between mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Active Projects</h2>
                  <p className="text-sm text-neutral-400 font-medium">Manage and track your ongoing studio work.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button 
                      onClick={() => setSortBy('date')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === 'date' ? 'bg-white text-black' : 'text-neutral-400'}`}
                    >
                      Date
                    </button>
                    <button 
                      onClick={() => setSortBy('type')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === 'type' ? 'bg-white text-black' : 'text-neutral-400'}`}
                    >
                      Type
                    </button>
                  </div>
                  <div className="text-sm text-neutral-400 font-semibold bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 shadow-sm">
                    {filteredClients.length} Projects
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredClients.map(client => (
                    <ProjectCard 
                      key={client.ID} 
                      client={client} 
                      deliveryLinkTypes={deliveryLinkTypes}
                      storageOptions={storageOptions}
                      onUpdate={(u) => sync('update', u)}
                      onDelete={() => sync('delete', client)}
                    />
                  ))}
                </AnimatePresence>

                {filteredClients.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <Search size={32} strokeWidth={1.5} className="mb-2 opacity-20" />
                    <p className="font-medium">No projects found</p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'bin' ? (
            <>
              <div className="flex items-end justify-between mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Bin</h2>
                  <p className="text-sm text-neutral-400 font-medium">Deleted projects are stored here for 30 days.</p>
                </div>
                <div className="text-sm text-neutral-400 font-semibold bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 shadow-sm">
                  {bin.length} Items
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <AnimatePresence mode="popLayout">
                  {bin.map(item => (
                    <ProjectCard 
                      key={item.ID} 
                      client={item} 
                      isBinItem
                      deliveryLinkTypes={deliveryLinkTypes}
                      storageOptions={storageOptions}
                      onRestore={() => sync('restore', item)}
                      onPermanentDelete={() => sync('permanent_delete', item)}
                    />
                  ))}
                </AnimatePresence>

                {bin.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <Trash2 size={32} strokeWidth={1.5} className="mb-2 opacity-20" />
                    <p className="font-medium">Bin is empty</p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'logs' ? (
            <>
              <div className="flex items-end justify-between mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Activity Logs</h2>
                  <p className="text-sm text-neutral-400 font-medium">Audit trail of all actions performed in the app.</p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-800/50 text-neutral-400 uppercase text-[10px] font-bold tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {logs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-neutral-400 whitespace-nowrap">
                            {new Date(log.Timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              log.Action === 'delete' ? 'bg-red-500/10 text-red-400' :
                              log.Action === 'add' ? 'bg-green-500/10 text-green-400' :
                              log.Action === 'update' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-neutral-800 text-neutral-400'
                            }`}>
                              {log.Action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-200 max-w-md truncate">
                            {log.Details}
                          </td>
                          <td className="px-6 py-4 text-neutral-500">
                            {log.User}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {logs.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                    <BarChart3 size={32} strokeWidth={1.5} className="mb-2 opacity-20" />
                    <p className="font-medium">No logs recorded yet</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="max-w-4xl">
              <div className="mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-sm text-neutral-400 mt-1">Configure your studio preferences and project defaults.</p>
              </div>
              
              <div className="space-y-16">
                {/* Connection Settings */}
                <div className="space-y-8 p-8 bg-neutral-900 border border-neutral-800 rounded-[32px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <ExternalLink size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Connection Settings</h3>
                      <p className="text-xs text-neutral-500">Connect your Google Sheets backend.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Filmify Apps Script URL</label>
                      <input 
                        value={apiUrl}
                        onChange={(e) => {
                          setApiUrl(e.target.value);
                          localStorage.setItem('filmify_api_url', e.target.value);
                        }}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className={`input-minimal text-xs font-mono ${apiUrl.includes('docs.google.com/spreadsheets') ? 'border-red-500 text-red-400' : ''}`}
                      />
                      {apiUrl.includes('docs.google.com/spreadsheets') && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          Warning: You pasted a Google Sheet URL. You must use the "Web App URL" from Apps Script.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Team Management Sheet ID</label>
                      <div className="flex gap-2">
                        <input 
                          value={teamSpreadsheetId}
                          onChange={(e) => setTeamSpreadsheetId(e.target.value)}
                          placeholder="Spreadsheet ID from URL"
                          className="input-minimal text-xs font-mono"
                        />
                        <button 
                          onClick={async () => {
                            if (!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) {
                              alert("Please set the Apps Script URL first!");
                              return;
                            }
                            setIsSaving(true);
                            try {
                              await fetch(apiUrl, {
                                method: 'POST',
                                mode: 'no-cors',
                                body: JSON.stringify({ action: 'update_config', teamSpreadsheetId })
                              });
                              alert("Team ID updated successfully!");
                              fetchData();
                            } catch (e) {
                              alert("Failed to update Team ID.");
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          className="px-4 py-2 bg-white text-black rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* App Name */}
                <div className="pt-8 border-t border-neutral-800 flex justify-between items-center">
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to reset all settings? This will clear your URLs and preferences.")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                  >
                    Reset All App Settings
                  </button>
                </div>

                <div className="space-y-4 max-w-md">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Studio Name</label>
                  <input 
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="input-minimal text-xl font-bold"
                  />
                </div>

                {/* Google Sheets Style List Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {/* Storage Options */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Storage Options</label>
                    </div>
                    
                    <div className="flex gap-3">
                      <input 
                        value={newStorageName}
                        onChange={(e) => setNewStorageName(e.target.value)}
                        placeholder="Add new storage..."
                        className="input-minimal text-sm py-2.5"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStorageName) {
                            setStorageOptions([...storageOptions, newStorageName]);
                            setNewStorageName('');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newStorageName) {
                            setStorageOptions([...storageOptions, newStorageName]);
                            setNewStorageName('');
                          }
                        }}
                        className="px-5 py-2.5 bg-white text-[#000000] rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-neutral-200 transition-all"
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {storageOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center justify-between group bg-neutral-900 p-4 rounded-xl border border-neutral-800 hover:border-neutral-100 transition-all shadow-sm">
                          {editingStorageIdx === idx ? (
                            <input 
                              autoFocus
                              defaultValue={opt}
                              onBlur={(e) => {
                                const next = [...storageOptions];
                                next[idx] = e.target.value;
                                setStorageOptions(next);
                                setEditingStorageIdx(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const next = [...storageOptions];
                                  next[idx] = (e.target as HTMLInputElement).value;
                                  setStorageOptions(next);
                                  setEditingStorageIdx(null);
                                }
                              }}
                              className="text-sm font-semibold bg-transparent border-none outline-none w-full text-white"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-white">{opt}</span>
                          )}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingStorageIdx(idx)}
                              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setStorageOptions(storageOptions.filter((_, i) => i !== idx))}
                              className="p-2 hover:bg-red-900/20 rounded-lg text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Event Types */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Event Types</label>
                    </div>

                    <div className="flex gap-3">
                      <input 
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        placeholder="Add new event type..."
                        className="input-minimal text-sm py-2.5"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newEventName) {
                            setEventTypes([...eventTypes, newEventName]);
                            setNewEventName('');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newEventName) {
                            setEventTypes([...eventTypes, newEventName]);
                            setNewEventName('');
                          }
                        }}
                        className="px-5 py-2.5 bg-white text-[#000000] rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-neutral-200 transition-all"
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {eventTypes.map((type, idx) => (
                        <div key={idx} className="flex items-center justify-between group bg-neutral-900 p-4 rounded-xl border border-neutral-800 hover:border-neutral-100 transition-all shadow-sm">
                          {editingEventIdx === idx ? (
                            <input 
                              autoFocus
                              defaultValue={type}
                              onBlur={(e) => {
                                const next = [...eventTypes];
                                next[idx] = e.target.value;
                                setEventTypes(next);
                                setEditingEventIdx(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const next = [...eventTypes];
                                  next[idx] = (e.target as HTMLInputElement).value;
                                  setEventTypes(next);
                                  setEditingEventIdx(null);
                                }
                              }}
                              className="text-sm font-semibold bg-transparent border-none outline-none w-full text-white"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-white">{type}</span>
                          )}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingEventIdx(idx)}
                              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setEventTypes(eventTypes.filter((_, i) => i !== idx))}
                              className="p-2 hover:bg-red-900/20 rounded-lg text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delivery Link Types */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Delivery & Backup Types (Customizable Tabs)</label>
                  </div>

                  <div className="flex gap-3 max-w-md">
                    <input 
                      value={newDeliveryName}
                      onChange={(e) => setNewDeliveryName(e.target.value)}
                      placeholder="Add new delivery type..."
                      className="input-minimal text-sm py-2.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newDeliveryName) {
                          setDeliveryLinkTypes([...deliveryLinkTypes, { id: Date.now().toString(), title: newDeliveryName, color: '#f5f5f5' }]);
                          setNewDeliveryName('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (newDeliveryName) {
                          setDeliveryLinkTypes([...deliveryLinkTypes, { id: Date.now().toString(), title: newDeliveryName, color: '#f5f5f5' }]);
                          setNewDeliveryName('');
                        }
                      }}
                      className="px-5 py-2.5 bg-white text-[#000000] rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-neutral-200 transition-all"
                    >
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deliveryLinkTypes.map((type) => (
                      <div key={type.id} className="flex flex-col gap-4 bg-neutral-900 p-5 rounded-2xl border border-neutral-800 hover:border-neutral-100 transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color || '#f5f5f5' }} />
                            {editingDeliveryId === type.id ? (
                              <input 
                                autoFocus
                                defaultValue={type.title}
                                onBlur={(e) => {
                                  setDeliveryLinkTypes(deliveryLinkTypes.map(t => t.id === type.id ? { ...t, title: e.target.value } : t));
                                  setEditingDeliveryId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setDeliveryLinkTypes(deliveryLinkTypes.map(t => t.id === type.id ? { ...t, title: (e.target as HTMLInputElement).value } : t));
                                    setEditingDeliveryId(null);
                                  }
                                }}
                                className="text-sm font-bold bg-transparent border-none outline-none w-full text-white"
                              />
                            ) : (
                              <span className="text-sm font-bold text-white">{type.title}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingDeliveryId(type.id)}
                              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setDeliveryLinkTypes(deliveryLinkTypes.filter(t => t.id !== type.id))}
                              className="p-2 hover:bg-red-900/20 rounded-lg text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">This type will appear as a section in "All Assets & Links" for every project.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Project Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 p-10 rounded-[24px] shadow-2xl border border-neutral-800"
            >
              <button onClick={() => setIsAddOpen(false)} className="absolute top-8 right-8 btn-icon">
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold mb-8 tracking-tight text-white">New Project</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Client Name</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <input id="new-name" placeholder="e.g. Rahul & Priya" className="input-minimal pl-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Event Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <input 
                      id="new-date" 
                      type="date" 
                      className="input-minimal pl-12 pr-10" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Event Type</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <select id="new-type" className="input-minimal pl-12 appearance-none">
                      {eventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const name = (document.getElementById('new-name') as HTMLInputElement).value;
                    const date = (document.getElementById('new-date') as HTMLInputElement).value;
                    const type = (document.getElementById('new-type') as HTMLSelectElement).value;
                    if (name && date) {
                      sync('add', { 
                        ID: Date.now().toString(), 
                        Name: name, 
                        Date: date, 
                        Type: type, 
                        Storage: storageOptions[0] || 'HDD 01', 
                        Secure: false, 
                        Links: {} 
                      });
                      setIsAddOpen(false);
                    }
                  }}
                  className="btn-primary w-full py-4 mt-6 text-base"
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ProjectCard = forwardRef<HTMLDivElement, { 
  client: Client, 
  deliveryLinkTypes: { id: string, title: string, color?: string }[],
  storageOptions: string[],
  onUpdate?: (c: Client) => void, 
  onDelete?: () => void,
  isBinItem?: boolean,
  onRestore?: () => void,
  onPermanentDelete?: () => void
}>(({ client, deliveryLinkTypes, storageOptions, onUpdate, onDelete, isBinItem, onRestore, onPermanentDelete }, ref) => {
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [linkType, setLinkType] = useState<string>('');
  const [tempLinks, setTempLinks] = useState<{ id: string, title: string, url: string }[]>([]);

  useEffect(() => {
    if (isAddLinkOpen) {
      if (editingLink) {
        setTempLinks([{ ...editingLink }]);
      } else {
        setTempLinks([{ id: Date.now().toString(), title: '', url: '' }]);
      }
    }
  }, [isAddLinkOpen, editingLink]);

  const AssetSection = ({ title, icon: Icon, type, color }: { title: string, icon: any, type: string, color?: string }) => {
    const links = client.Links?.[type] || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color || '#a3a3a3' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</span>
          </div>
          <button 
            onClick={() => { setLinkType(type); setEditingLink(null); setIsAddLinkOpen(true); }}
            className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus size={10} />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center justify-between bg-neutral-900/50 px-3 py-2.5 rounded-xl border border-neutral-800 hover:border-neutral-600 transition-all shadow-sm group">
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs font-bold truncate flex-1 text-neutral-100 hover:text-white transition-colors"
              >
                {link.title}
              </a>
              <div className="flex items-center gap-1 ml-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(link.url);
                  }}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  title="Copy Link"
                >
                  <Copy size={12} />
                </button>
                <button 
                  onClick={() => { setLinkType(type); setEditingLink(link); setIsAddLinkOpen(true); }}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  title="Edit Link"
                >
                  <Edit size={12} />
                </button>
                <button 
                  onClick={() => onUpdate({ ...client, Links: { ...client.Links, [type]: links.filter(l => l.id !== link.id) } })} 
                  className="p-1.5 hover:bg-red-900/20 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                  title="Delete Link"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {links.length === 0 && <p className="text-[10px] text-neutral-400 italic pl-1 font-bold">No links added</p>}
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`minimal-card transition-all duration-500 ${client.Secure ? 'border-green-500/60 shadow-[0_0_30px_rgba(34,197,94,0.25)] ring-1 ring-green-500/30 bg-green-900/5' : ''}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-2">
            <h3 className={`text-xl font-bold truncate transition-colors ${(client as any).isTeamProject ? 'text-blue-400' : client.Secure ? 'text-green-400' : 'text-white'}`}>{client.Name}</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${(client as any).isTeamProject ? 'bg-blue-900/40 text-blue-400' : client.Secure ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-400 border border-neutral-800'}`}>
              {client.Type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-neutral-300 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" />
              <span>{client.Date}</span>
            </div>
            {!(client as any).isTeamProject && (client as any).Location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-neutral-500" />
                <span>{(client as any).Location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isBinItem ? (
            <>
              <button 
                onClick={onRestore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-green-500 text-white border border-green-500 hover:bg-green-600 shadow-sm"
              >
                <RefreshCw size={18} />
                <span>Restore</span>
              </button>
              <button 
                onClick={() => { if(window.confirm("Permanently delete this project? This cannot be undone.")) onPermanentDelete?.() }}
                className="p-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-500 transition-all bg-neutral-900 shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => onUpdate?.({ ...client, Secure: !client.Secure })}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${client.Secure ? 'bg-green-500 text-white border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105' : 'bg-neutral-900 text-white border-neutral-800 hover:border-neutral-100 shadow-sm'}`}
              >
                {client.Secure ? <ShieldCheck size={18} className="animate-pulse" /> : <Shield size={18} className="text-white" />}
                <span>{client.Secure ? 'Secured' : 'Secure'}</span>
              </button>
              <button 
                onClick={() => { if(window.confirm("Move to bin?")) onDelete?.() }}
                className="p-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-500 transition-all bg-neutral-900 shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Bottom Left: Storage */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <HardDrive size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Storage</span>
          </div>
          <div className="relative">
            <select 
              value={client.Storage}
              onChange={(e) => onUpdate?.({ ...client, Storage: e.target.value })}
              className="select-minimal py-1.5 px-3 pr-8 text-xs font-bold"
            >
              {storageOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={12} />
          </div>
        </div>

        {/* Bottom Right: Assets Toggle */}
        <button 
          onClick={() => setIsAssetsOpen(!isAssetsOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-400 hover:border-neutral-100 transition-all shadow-sm"
        >
          <LinkIcon size={14} className="text-neutral-400" />
          <span>All Assets & Links</span>
          {isAssetsOpen ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
        </button>
      </div>

      {/* Assets Expansion */}
      <AnimatePresence>
        {isAssetsOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {deliveryLinkTypes.map(type => (
                <AssetSection 
                  key={type.id} 
                  title={type.title} 
                  icon={type.title.toLowerCase().includes('photo') ? ImageIcon : type.title.toLowerCase().includes('video') ? Video : Cloud} 
                  type={type.id} 
                  color={type.color}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Link Modal */}
      <AnimatePresence>
        {isAddLinkOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 p-8 rounded-2xl shadow-2xl border border-neutral-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{editingLink ? 'Edit' : 'Add'} {linkType} Links</h3>
                  <p className="text-xs text-neutral-400 mt-1">Manage your project delivery links</p>
                </div>
                <button onClick={() => setIsAddLinkOpen(false)} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {tempLinks.map((link, idx) => (
                  <div key={link.id} className="space-y-4 p-5 bg-neutral-900/50 rounded-2xl border border-neutral-800 relative group shadow-sm">
                    {!editingLink && tempLinks.length > 1 && (
                      <button 
                        onClick={() => setTempLinks(tempLinks.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 p-1.5 bg-neutral-800 border border-neutral-700 rounded-full text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Link Title</label>
                      <input 
                        value={link.title}
                        onChange={(e) => {
                          const next = [...tempLinks];
                          next[idx].title = e.target.value;
                          setTempLinks(next);
                        }}
                        placeholder="e.g. High Res Gallery" 
                        className="input-minimal" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">URL Address</label>
                      <input 
                        value={link.url}
                        onChange={(e) => {
                          const next = [...tempLinks];
                          next[idx].url = e.target.value;
                          setTempLinks(next);
                        }}
                        placeholder="https://..." 
                        className="input-minimal" 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!editingLink && (
                <button 
                  onClick={() => setTempLinks([...tempLinks, { id: Date.now().toString(), title: '', url: '' }])}
                  className="w-full mt-6 py-3 border-2 border-dashed border-neutral-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-neutral-100 hover:text-white transition-all"
                >
                  + Add Another Link
                </button>
              )}

              <div className="flex gap-4 mt-10">
                <button onClick={() => setIsAddLinkOpen(false)} className="flex-1 px-4 py-3.5 rounded-2xl text-xs font-bold border border-neutral-800 hover:bg-neutral-900 transition-colors text-white">Cancel</button>
                <button 
                  onClick={() => {
                    const validLinks = tempLinks.filter(l => l.url.trim() !== '');
                    if (validLinks.length > 0) {
                      const currentLinks = client.Links || {};
                      const typeLinks = currentLinks[linkType] || [];
                      
                      let updatedTypeLinks;
                      if (editingLink) {
                        const link = validLinks[0];
                        updatedTypeLinks = typeLinks.map(l => l.id === editingLink.id ? { ...l, title: link.title || 'Link', url: link.url } : l);
                      } else {
                        const newLinks = validLinks.map(l => ({ ...l, title: l.title || 'Link', url: l.url }));
                        updatedTypeLinks = [...typeLinks, ...newLinks];
                      }

                      onUpdate({ ...client, Links: { ...currentLinks, [linkType]: updatedTypeLinks } });
                      setIsAddLinkOpen(false);
                    }
                  }}
                  className="btn-primary py-3.5"
                >
                  {editingLink ? 'Save Changes' : `Add ${tempLinks.filter(l => l.url.trim() !== '').length > 1 ? tempLinks.filter(l => l.url.trim() !== '').length : ''} Link${tempLinks.filter(l => l.url.trim() !== '').length > 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
