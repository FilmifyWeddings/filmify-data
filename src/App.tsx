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
import { Client, LinkItem, DeliveryType } from './types';

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
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('app_reated_api_url') || DEFAULT_API_URL);
  const [teamSpreadsheetId, setTeamSpreadsheetId] = useState('');
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('app_reated_clients_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'bin' | 'settings'>('projects');
  const [teamProjects, setTeamProjects] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_reated_team_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [bin, setBin] = useState<Client[]>(() => {
    const saved = localStorage.getItem('app_reated_bin_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterType, setFilterType] = useState<string>('All');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [recentlyDeletedIds, setRecentlyDeletedIds] = useState<string[]>([]);
  const [recentlySyncedIds, setRecentlySyncedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appName, setAppName] = useState(() => localStorage.getItem('app_reated_name') || 'App Reated Studio');
  const [isSyncingSettings, setIsSyncingSettings] = useState(false);
  const [storageOptions, setStorageOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('app_reated_storage_options');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse storageOptions from localStorage", e);
    }
    return ['HDD 01', 'HDD 02', 'SSD 01', 'SSD 02', 'Cloud Only'];
  });
  const [deliveryLinkTypes, setDeliveryLinkTypes] = useState<DeliveryType[]>(() => {
    try {
      const saved = localStorage.getItem('app_reated_delivery_link_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse deliveryLinkTypes from localStorage", e);
    }
    return [
      { id: 'cloud', title: 'Cloud Backup', color: '#fef3c7', items: [{ id: 'all_data', title: 'All Data Link' }], enabled: true },
      { id: 'photos', title: 'Photo Delivery', color: '#dcfce7', items: [{ id: 'photos_link', title: 'Photos Link' }], enabled: true },
      { id: 'videos', title: 'Video Delivery', color: '#dbeafe', items: [{ id: 'videos_link', title: 'Videos Link' }], enabled: true }
    ];
  });
  const [eventTypes, setEventTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('app_reated_event_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse eventTypes from localStorage", e);
    }
    return ['Wedding', 'Pre-wedding', 'Engagement', 'Maternity', 'Birthday', 'Corporate'];
  });

  const [newStorageName, setNewStorageName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [editingStorageIdx, setEditingStorageIdx] = useState<number | null>(null);
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);

  // Save App Name
  useEffect(() => {
    localStorage.setItem('app_reated_name', appName);
  }, [appName]);

  // Save Storage Options
  useEffect(() => {
    localStorage.setItem('app_reated_storage_options', JSON.stringify(storageOptions));
  }, [storageOptions]);

  // Save Delivery Link Types
  useEffect(() => {
    localStorage.setItem('app_reated_delivery_link_types', JSON.stringify(deliveryLinkTypes));
  }, [deliveryLinkTypes]);

  // Save Event Types
  useEffect(() => {
    localStorage.setItem('app_reated_event_types', JSON.stringify(eventTypes));
  }, [eventTypes]);

  // Cache data to localStorage
  useEffect(() => {
    localStorage.setItem('app_reated_clients_cache', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('app_reated_bin_cache', JSON.stringify(bin));
  }, [bin]);

  useEffect(() => {
    localStorage.setItem('app_reated_team_cache', JSON.stringify(teamProjects));
  }, [teamProjects]);

  const fetchData = async (isBackground = false, forceSyncFetch = false) => {
    if (isSaving && isBackground && !forceSyncFetch) return;
    if (!isBackground) setLoading(true);
    if (forceSyncFetch) setIsSyncing(true);
    
    if (!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) {
      if (!isBackground) {
        await new Promise(r => setTimeout(r, 800));
        setLoading(false);
      }
      setIsSyncing(false);
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
        // Sync Global Settings from Backend
        if (data.settings) {
          if (data.settings.app_name) setAppName(data.settings.app_name);
          if (data.settings.storage_options) {
            try { setStorageOptions(JSON.parse(data.settings.storage_options)); } catch(e) {}
          }
          if (data.settings.delivery_link_types) {
            try { setDeliveryLinkTypes(JSON.parse(data.settings.delivery_link_types)); } catch(e) {}
          }
          if (data.settings.event_types) {
            try { setEventTypes(JSON.parse(data.settings.event_types)); } catch(e) {}
          }
        }

        if (Date.now() - lastSyncTime > 60000 || isFirstLoad || forceSyncFetch) {
          if (data.clients && Array.isArray(data.clients)) {
            const newClients = data.clients.map((c: any) => {
              const links = c.Links || {};
              const enabled = links._enabled || {};
              const { _enabled, ...restLinks } = links;
              return { ...c, Links: restLinks, EnabledSections: enabled };
            });
            const newBin = (Array.isArray(data.bin) ? data.bin : []).map((c: any) => {
              const links = c.Links || {};
              const enabled = links._enabled || {};
              const { _enabled, ...restLinks } = links;
              return { ...c, Links: restLinks, EnabledSections: enabled };
            });
            
            setClients(newClients);
            
            setBin(prev => {
              const pendingBinItems = prev.filter(b => 
                recentlyDeletedIds.includes(String(b.ID)) && 
                !newBin.some(nb => String(nb.ID) === String(b.ID))
              );
              const filteredNewBin = newBin.filter(nb => !recentlySyncedIds.includes(String(nb.ID)));
              return [...filteredNewBin, ...pendingBinItems];
            });

            setTeamProjects(Array.isArray(data.teamProjects) ? data.teamProjects : []);
            setTeamError(data.teamError || null);
            
            setRecentlyDeletedIds(prev => prev.filter(id => !newBin.some(b => String(b.ID) === id)));
            setRecentlySyncedIds(prev => prev.filter(id => !newClients.some(c => String(c.ID) === id)));

            if (data.config?.teamSpreadsheetId) {
              setTeamSpreadsheetId(data.config.teamSpreadsheetId);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      if (!isBackground) setTeamError(error.message || "Failed to connect to Apps Script");
    } finally {
      if (!isBackground) setLoading(false);
      setIsFirstLoad(false);
      setIsSyncing(false);
    }
  };

  const syncSettings = async (settings: any) => {
    if (!apiUrl || !apiUrl.startsWith('http')) return;
    setIsSyncingSettings(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', settings })
      });
      // Since no-cors doesn't give response, we assume success or wait for next fetch
    } catch (error) {
      console.error('Settings sync error:', error);
    } finally {
      setIsSyncingSettings(false);
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
    const idStr = String(client.ID);
    const isTeam = (client as any).isTeamProject;

    // 1. Instant Local Update (Optimistic)
    if (action === 'add') {
      setClients(prev => [client, ...prev]);
    } else if (action === 'update') {
      setClients(prev => {
        const exists = prev.some(c => String(c.ID) === idStr);
        if (exists) {
          return prev.map(c => String(c.ID) === idStr ? client : c);
        } else if (isTeam) {
          // If it's a team project being updated/secured, add it to clients immediately
          return [{ ...client, isTeamProject: false }, ...prev];
        }
        return prev;
      });
      if (isTeam) {
        setRecentlySyncedIds(prev => [...prev, idStr]);
        setTeamProjects(prev => prev.filter(p => String(p.ProjectID) !== idStr));
      }
    } else if (action === 'delete') {
      setClients(prev => prev.filter(c => String(c.ID) !== idStr));
      const binItem = { ...client, DeletedAt: new Date().toISOString() };
      setBin(prev => [binItem as any, ...prev.filter(item => String(item.ID) !== idStr)]);
      setRecentlyDeletedIds(prev => [...prev, idStr]);
      if (isTeam) {
        setTeamProjects(prev => prev.filter(p => String(p.ProjectID) !== idStr));
      }
    } else if (action === 'restore') {
      setBin(prev => prev.filter(c => String(c.ID) !== idStr));
      setClients(prev => [client, ...prev]);
      setRecentlySyncedIds(prev => [...prev, idStr]);
    } else if (action === 'permanent_delete') {
      setBin(prev => prev.filter(c => String(c.ID) !== idStr));
    }

    setIsSaving(true);
    setLastSyncTime(Date.now());

    if (!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) {
      setTimeout(() => setIsSaving(false), 500);
      return;
    }

    try {
      // If it's a team project not yet in clients, we need to sync it first
      if (isTeam && (action === 'update' || action === 'delete')) {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'sync_team',
            id: client.ID,
            name: client.Name,
            date: client.Date,
            type: client.Type,
            storage: client.Storage || 'HDD 01',
            secure: client.Secure || false
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
        links: {
          ...(client.Links || {}),
          _enabled: client.EnabledSections || {}
        }
      };

      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      
      // Refresh data in background silently after a short delay
      // We don't force a sync fetch here to avoid overwriting our optimistic local state with stale server data
      setTimeout(() => {
        fetchData(true, true); 
      }, 2000);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
    }
  };

  const allMergedProjects = useMemo(() => {
    // Filter out team projects that are already synced to clients or are in the bin
    const existingIds = new Set(clients.map(c => String(c.ID)));
    const binIds = new Set(bin.map(c => String(c.ID)));
    const recentIds = new Set([...recentlyDeletedIds, ...recentlySyncedIds]);
    
    // Group team projects by ProjectID to handle sub-events
    const groupedTeams: { [key: string]: any[] } = {};
    teamProjects.forEach(tp => {
      const key = String(tp.ProjectID);
      if (!groupedTeams[key]) groupedTeams[key] = [];
      groupedTeams[key].push(tp);
    });

    const teamMapped = Object.values(groupedTeams).map(events => {
      // Priority: If any event is "Nikah", use that. Otherwise use the first one.
      let mainEvent = events.find(e => String(e.Type).toLowerCase().includes('nikah')) || events[0];
      
      const id = String(mainEvent.ProjectID);
      if (existingIds.has(id) || binIds.has(id) || recentIds.has(id)) return null;

      return {
        ID: mainEvent.ProjectID,
        Name: mainEvent.ClientName,
        Date: mainEvent.Date,
        Type: mainEvent.Type,
        Storage: 'HDD 01',
        Secure: mainEvent.Secure === true || mainEvent.Secure === 'TRUE' || mainEvent.Secure === 'true',
        Links: { cloud: [], photos: [], videos: [] },
        isTeamProject: true
      };
    }).filter(Boolean) as Client[];

    return [...clients, ...teamMapped];
  }, [clients, teamProjects, bin, recentlyDeletedIds, recentlySyncedIds]);

  const dynamicEventTypes = useMemo(() => {
    const types = new Set(eventTypes);
    allMergedProjects.forEach(c => {
      if (c.Type) types.add(c.Type);
    });
    return Array.from(types).sort();
  }, [eventTypes, allMergedProjects]);

  const filteredClients = useMemo(() => {
    let list = allMergedProjects.filter(c => {
      const name = String(c.Name || '');
      const type = String(c.Type || '');
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = name.toLowerCase().includes(query) || type.toLowerCase().includes(query);
      const matchesType = filterType === 'All' || type === filterType;
      
      return matchesSearch && matchesType;
    });

    // Default sorting: Newest first
    list.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

    return list;
  }, [allMergedProjects, searchQuery, filterType]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 className="text-white" size={32} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans flex flex-col">
      {/* Sync Status Overlay */}
      <AnimatePresence>
        {(isSaving || isSyncing) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-full shadow-2xl"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-widest uppercase">
              {isSaving ? 'Syncing with Google Sheets...' : 'Updating Data...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-20 sm:h-24 border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-10 lg:px-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: App Name */}
        <div className="flex items-center shrink-0">
          <input 
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="bg-transparent border-none font-bold text-lg sm:text-2xl outline-none w-24 sm:w-56 focus:ring-0 p-0 text-white"
            placeholder="App Name"
          />
        </div>

          <div className="flex-1 max-w-2xl relative mx-1 sm:mx-8">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 sm:pl-12 pr-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-white/5 focus:border-neutral-100 transition-all outline-none text-white shadow-sm"
            />
          </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="hidden md:flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 mr-2">
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
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {(activeTab === 'projects' || activeTab === 'bin') && (
            <div className="md:hidden flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 mb-6 w-full">
              <button 
                onClick={() => setActiveTab('projects')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-black' : 'text-neutral-400'}`}
              >
                Clients
              </button>
              <button 
                onClick={() => setActiveTab('bin')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'bin' ? 'bg-white text-black' : 'text-neutral-400'}`}
              >
                Bin
              </button>
            </div>
          )}
          {(!apiUrl || apiUrl.includes("YOUR_APPS_SCRIPT")) ? (
            <div className="mb-8 p-6 bg-amber-900/20 border border-amber-500/50 rounded-2xl flex flex-col gap-4 text-amber-200 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Setup Required</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                To start using App Reated Data, you need to connect your Google Sheets backend. 
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
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Active Projects</h2>
                  <p className="text-xs sm:text-sm text-neutral-400 font-medium">Manage and track your ongoing studio work.</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="relative">
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-[10px] sm:text-xs font-bold text-white outline-none focus:ring-2 focus:ring-white/5 appearance-none pr-10"
                    >
                      <option value="All">All Types</option>
                      {dynamicEventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={14} />
                  </div>
                  <div className="text-[10px] sm:text-sm text-neutral-400 font-semibold bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 shadow-sm">
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
                      onUpdateSettings={(s) => {
                        setDeliveryLinkTypes(s);
                        localStorage.setItem('app_reated_delivery_link_types', JSON.stringify(s));
                      }}
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
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">App Reated Apps Script URL</label>
                      <input 
                        value={apiUrl}
                        onChange={(e) => {
                          setApiUrl(e.target.value);
                          localStorage.setItem('app_reated_api_url', e.target.value);
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Data Management</label>
                      <button 
                        onClick={() => fetchData(false, true)}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all border border-neutral-700"
                      >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Refreshing...' : 'Force Refresh Data'}
                      </button>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Studio Name</label>
                    {isSyncingSettings && <span className="text-[8px] text-blue-400 animate-pulse">SYNCING...</span>}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="input-minimal text-xl font-bold flex-1"
                    />
                    <button 
                      onClick={() => syncSettings({ app_name: appName })}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all border border-white/10"
                    >
                      SYNC
                    </button>
                  </div>
                </div>

                {/* Google Sheets Style List Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {/* Storage Options */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Storage Options</label>
                      <button 
                        onClick={() => syncSettings({ storage_options: storageOptions })}
                        className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        SYNC TO ALL DEVICES
                      </button>
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
                      <button 
                        onClick={() => syncSettings({ event_types: eventTypes })}
                        className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        SYNC TO ALL DEVICES
                      </button>
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

                {/* Delivery & Backup Types Management */}
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-white tracking-tight">Delivery & Backup Sections</h3>
                        <button 
                          onClick={() => syncSettings({ delivery_link_types: deliveryLinkTypes })}
                          className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                        >
                          Sync to All Devices
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest font-bold opacity-60">Define the structure for all projects</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newType: DeliveryType = { 
                          id: Date.now().toString(), 
                          title: 'New Section', 
                          color: '#3b82f6', 
                          items: [], 
                          enabled: true 
                        };
                        setDeliveryLinkTypes([...deliveryLinkTypes, newType]);
                      }}
                      className="btn-primary flex items-center gap-2 px-6 py-3 text-xs"
                    >
                      <Plus size={16} />
                      Add New Section
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {deliveryLinkTypes.map((type, typeIdx) => (
                      <div key={type.id} className="bg-white/[0.02] border border-neutral-800 p-8 rounded-[32px] space-y-8 relative group hover:border-neutral-700 transition-all duration-500">
                        <button 
                          onClick={() => setDeliveryLinkTypes(deliveryLinkTypes.filter(t => t.id !== type.id))}
                          className="absolute top-6 right-6 p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>

                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Section Title</label>
                              <input 
                                value={type.title}
                                onChange={(e) => {
                                  const next = [...deliveryLinkTypes];
                                  next[typeIdx].title = e.target.value;
                                  setDeliveryLinkTypes(next);
                                }}
                                className="input-minimal"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Accent Color</label>
                              <div className="flex gap-3">
                                <input 
                                  type="color"
                                  value={type.color}
                                  onChange={(e) => {
                                    const next = [...deliveryLinkTypes];
                                    next[typeIdx].color = e.target.value;
                                    setDeliveryLinkTypes(next);
                                  }}
                                  className="w-12 h-12 rounded-xl bg-transparent border border-neutral-800 cursor-pointer p-1"
                                />
                                <input 
                                  value={type.color}
                                  onChange={(e) => {
                                    const next = [...deliveryLinkTypes];
                                    next[typeIdx].color = e.target.value;
                                    setDeliveryLinkTypes(next);
                                  }}
                                  className="input-minimal flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Default Template Items</label>
                                <p className="text-[9px] text-neutral-600 mt-0.5">These items will appear in every project by default</p>
                              </div>
                              <button 
                                onClick={() => {
                                  const next = [...deliveryLinkTypes];
                                  next[typeIdx].items.push({ id: Date.now().toString(), title: 'New Template Item' });
                                  setDeliveryLinkTypes(next);
                                }}
                                className="text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors tracking-tighter"
                              >
                                + ADD TEMPLATE ITEM
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {(type.items || []).map((item, itemIdx) => (
                                <div key={item.id} className="flex items-center gap-3 bg-neutral-900/40 border border-neutral-800/50 p-3 rounded-2xl group/item">
                                  <input 
                                    value={item.title}
                                    onChange={(e) => {
                                      const next = [...deliveryLinkTypes];
                                      next[typeIdx].items[itemIdx].title = e.target.value;
                                      setDeliveryLinkTypes(next);
                                    }}
                                    className="bg-transparent border-none text-xs font-bold text-neutral-200 focus:ring-0 p-0 flex-1"
                                    placeholder="Item Title"
                                  />
                                  <button 
                                    onClick={() => {
                                      const next = [...deliveryLinkTypes];
                                      next[typeIdx].items = next[typeIdx].items.filter((_, i) => i !== itemIdx);
                                      setDeliveryLinkTypes(next);
                                    }}
                                    className="p-1.5 text-neutral-600 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {type.items.length === 0 && (
                                <div className="py-6 text-center border border-dashed border-neutral-800 rounded-2xl">
                                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">No template items</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
  deliveryLinkTypes: DeliveryType[],
  storageOptions: string[],
  onUpdate?: (c: Client) => void,
  onUpdateSettings?: (settings: DeliveryType[]) => void,
  onDelete?: () => void,
  isBinItem?: boolean,
  onRestore?: () => void,
  onPermanentDelete?: () => void
}>(({ client, deliveryLinkTypes, storageOptions, onUpdate, onUpdateSettings, onDelete, isBinItem, onRestore, onPermanentDelete }, ref) => {
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#3b82f6');
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [linkType, setLinkType] = useState<string>('');
  const [tempLinks, setTempLinks] = useState<LinkItem[]>([]);

  useEffect(() => {
    if (isAddLinkOpen) {
      if (editingLink) {
        setTempLinks([{ ...editingLink, subLinks: editingLink.subLinks ? [...editingLink.subLinks] : [] }]);
      } else {
        setTempLinks([{ 
          id: Date.now().toString(), 
          title: '', 
          subLinks: [{ id: Date.now().toString() + '-0', title: '', url: '' }], 
          isEditable: true 
        }]);
      }
    }
  }, [isAddLinkOpen, editingLink]);

  const AssetSection = ({ section, color }: { section: DeliveryType, color?: string }) => {
    const projectLinks = client.Links?.[section.id] || [];
    
    // Merge template items with project links
    const sectionItems = Array.isArray(section.items) ? section.items : [];
    const mergedLinks: LinkItem[] = sectionItems.map(templateItem => {
      const existing = projectLinks.find(pl => pl.id === templateItem.id);
      return { 
        id: templateItem.id, 
        title: existing?.title || templateItem.title, 
        subLinks: existing?.subLinks || [], 
        isEditable: true 
      };
    });
    
    const templateIds = new Set(sectionItems.map(i => i.id));
    const customLinks = projectLinks.filter(pl => !templateIds.has(pl.id));
    const allLinks = [...mergedLinks, ...customLinks];

    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 rounded-[24px] border border-neutral-800 bg-white/[0.02] shadow-xl transition-all duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color || '#a3a3a3' }} />
            <span className="text-xs font-bold text-white tracking-tight uppercase opacity-80">{section.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setLinkType(section.id); setEditingLink(null); setIsAddLinkOpen(true); }}
              className="p-2 hover:bg-white/5 rounded-xl text-neutral-400 hover:text-white transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
            {allLinks.map(link => (
              <div key={link.id} className="group relative bg-neutral-900/40 border border-neutral-800/50 p-4 rounded-2xl hover:border-neutral-500/50 hover:bg-neutral-800/40 transition-all duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[9px] font-bold text-white uppercase tracking-widest">{link.title}</p>
                      {!templateIds.has(link.id) && <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">CUSTOM</span>}
                    </div>
                    
                    {link.subLinks && link.subLinks.length > 0 ? (
                      <div className="space-y-2.5 mt-2">
                        {link.subLinks.map(sub => (
                          <div key={sub.id} className="group/sub flex items-center justify-between gap-4 bg-white/[0.02] border border-neutral-800/30 p-2.5 rounded-xl hover:border-neutral-700/50 transition-all">
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-bold text-white uppercase tracking-widest mb-0.5">{sub.title}</p>
                              <a 
                                href={sub.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] font-bold text-neutral-200 hover:text-white transition-colors truncate block flex items-center gap-1.5"
                              >
                                <ExternalLink size={10} className="shrink-0 opacity-50" />
                                {sub.url}
                              </a>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(sub.url);
                              }}
                              className="p-1.5 opacity-0 group-hover/sub:opacity-100 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-all"
                              title="Copy URL"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => { setLinkType(section.id); setEditingLink(link); setIsAddLinkOpen(true); }}
                          className="text-[10px] font-bold text-neutral-600 hover:text-neutral-400 transition-colors flex items-center gap-1.5 mt-1"
                        >
                          <Plus size={10} />
                          Add more links to {link.title}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setLinkType(section.id); setEditingLink(link); setIsAddLinkOpen(true); }}
                        className="text-[11px] font-medium text-neutral-600 hover:text-neutral-400 transition-colors italic flex items-center gap-1.5 group/add mt-1"
                      >
                        <Plus size={10} className="shrink-0 opacity-30 group-hover/add:opacity-100 transition-opacity" />
                        Add links to {link.title}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => { setLinkType(section.id); setEditingLink(link); setIsAddLinkOpen(true); }}
                      className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                      title="Edit Group"
                    >
                      <Edit size={14} />
                    </button>
                    {(!templateIds.has(link.id) || (link.subLinks && link.subLinks.length > 0)) && (
                      <button 
                        onClick={() => {
                          const projectLinks = client.Links?.[section.id] || [];
                          const nextLinks = projectLinks.filter(l => l.id !== link.id);
                          onUpdate?.({ ...client, Links: { ...client.Links, [section.id]: nextLinks } });
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => { setLinkType(section.id); setEditingLink(null); setIsAddLinkOpen(true); }}
              className="mt-2 py-3 border border-dashed border-neutral-800 rounded-2xl text-[10px] font-bold text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-white/[0.02] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus size={12} />
              Add Custom Link Group
            </button>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-2">
            <h3 className={`text-lg sm:text-xl font-bold truncate transition-colors ${(client as any).isTeamProject ? 'text-blue-400' : client.Secure ? 'text-green-400' : 'text-white'}`}>{client.Name}</h3>
            <span className={`w-fit px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors ${(client as any).isTeamProject ? 'bg-blue-900/40 text-blue-400' : client.Secure ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-400 border border-neutral-800'}`}>
              {client.Type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-neutral-300 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-neutral-500" />
              <span>{client.Date}</span>
            </div>
            {!(client as any).isTeamProject && (client as any).Location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-neutral-500" />
                <span>{(client as any).Location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
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
                onClick={() => {
                  if (confirm("Permanently delete this project? This cannot be undone.")) {
                    onPermanentDelete?.();
                  }
                }}
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
                onClick={() => {
                  if (confirm("Move to bin?")) {
                    onDelete?.();
                  }
                }}
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
            <div className="mt-6 pt-6 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {deliveryLinkTypes.map(type => (
                <AssetSection 
                  key={type.id} 
                  section={type}
                  color={type.color}
                />
              ))}
              
              <button 
                onClick={() => setIsAddSectionOpen(true)}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-dashed border-neutral-800 hover:border-neutral-600 hover:bg-white/[0.02] transition-all group h-fit self-start"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={16} className="text-neutral-500 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-bold text-neutral-500 group-hover:text-white uppercase tracking-widest">Add New Section</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Section Modal */}
      <AnimatePresence>
        {isAddSectionOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSectionOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0f0f0f] border border-neutral-800 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold tracking-tight text-white">Add New Section</h3>
                  <button onClick={() => setIsAddSectionOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} className="text-neutral-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Section Title</label>
                    <input 
                      type="text" 
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="e.g. Raw Footage, Teasers..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Section Color</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={newSectionColor}
                        onChange={(e) => setNewSectionColor(e.target.value)}
                        className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer overflow-hidden p-0"
                      />
                      <input 
                        type="text" 
                        value={newSectionColor}
                        onChange={(e) => setNewSectionColor(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-white/10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsAddSectionOpen(false)}
                      className="flex-1 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-xs uppercase tracking-widest border border-neutral-800 hover:bg-neutral-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (!newSectionTitle) return;
                        const newType: DeliveryType = {
                          id: Date.now().toString(),
                          title: newSectionTitle,
                          color: newSectionColor,
                          items: [],
                          enabled: true
                        };
                        onUpdateSettings?.([...deliveryLinkTypes, newType]);
                        setIsAddSectionOpen(false);
                        setNewSectionTitle('');
                      }}
                      className="flex-1 py-4 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-lg"
                    >
                      Create Section
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Link Modal */}
      <AnimatePresence>
        {isAddLinkOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">{editingLink ? 'Edit' : 'Add'} {deliveryLinkTypes.find(t => t.id === linkType)?.title || 'Link'}</h3>
                  <p className="text-[10px] sm:text-xs text-neutral-400 mt-1">Manage your project delivery links</p>
                </div>
                <button onClick={() => setIsAddLinkOpen(false)} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 sm:space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {tempLinks.map((link, linkIdx) => (
                  <div key={link.id} className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-neutral-900/50 rounded-2xl border border-neutral-800 relative group shadow-sm">
                    {!editingLink && tempLinks.length > 1 && (
                      <button 
                        onClick={() => setTempLinks(tempLinks.filter((_, i) => i !== linkIdx))}
                        className="absolute -top-2 -right-2 p-1.5 bg-neutral-800 border border-neutral-700 rounded-full text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={12} />
                      </button>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Group Title</label>
                      <input 
                        value={link.title}
                        onChange={(e) => {
                          const next = [...tempLinks];
                          next[linkIdx].title = e.target.value;
                          setTempLinks(next);
                        }}
                        placeholder="e.g. All Data Link" 
                        className="input-minimal" 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Links Inside This Group</label>
                        <button 
                          onClick={() => {
                            const next = [...tempLinks];
                            const subLinks = next[linkIdx].subLinks || [];
                            next[linkIdx].subLinks = [...subLinks, { id: Date.now().toString(), title: '', url: '' }];
                            setTempLinks(next);
                          }}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <Plus size={10} />
                          ADD SUB-LINK
                        </button>
                      </div>
                      
                      <div className="space-y-4 pl-4 border-l border-neutral-800">
                        {(link.subLinks || []).map((sub, subIdx) => (
                          <div key={sub.id} className="space-y-3 relative group/sub">
                            {link.subLinks.length > 1 && (
                              <button 
                                onClick={() => {
                                  const next = [...tempLinks];
                                  next[linkIdx].subLinks = next[linkIdx].subLinks.filter((_, i) => i !== subIdx);
                                  setTempLinks(next);
                                }}
                                className="absolute -right-2 top-0 p-1 text-neutral-600 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <div className="grid grid-cols-1 gap-3">
                              <input 
                                value={sub.title}
                                onChange={(e) => {
                                  const next = [...tempLinks];
                                  next[linkIdx].subLinks[subIdx].title = e.target.value;
                                  setTempLinks(next);
                                }}
                                placeholder="Sub-link Title (e.g. Photos)" 
                                className="input-minimal text-[11px] py-2" 
                              />
                              <input 
                                value={sub.url}
                                onChange={(e) => {
                                  const next = [...tempLinks];
                                  next[linkIdx].subLinks[subIdx].url = e.target.value;
                                  setTempLinks(next);
                                }}
                                placeholder="URL Address (https://...)" 
                                className="input-minimal text-[11px] py-2" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!editingLink && (
                <button 
                  onClick={() => setTempLinks([...tempLinks, { 
                    id: Date.now().toString(), 
                    title: '', 
                    subLinks: [{ id: Date.now().toString() + '-0', title: '', url: '' }],
                    isEditable: true 
                  }])}
                  className="w-full mt-6 py-3 border-2 border-dashed border-neutral-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-neutral-100 hover:text-white transition-all"
                >
                  + Add Another Group
                </button>
              )}

              <div className="flex gap-4 mt-10">
                <button onClick={() => setIsAddLinkOpen(false)} className="flex-1 px-4 py-3.5 rounded-2xl text-xs font-bold border border-neutral-800 hover:bg-neutral-900 transition-colors text-white">Cancel</button>
                <button 
                  onClick={() => {
                    const validLinks = tempLinks.filter(l => l.title.trim() !== '' && (l.subLinks || []).some(sl => sl.url.trim() !== ''));
                    if (validLinks.length > 0) {
                      const currentLinks = client.Links || {};
                      const typeLinks = currentLinks[linkType] || [];
                      
                      let updatedTypeLinks;
                      if (editingLink) {
                        const link = validLinks[0];
                        const exists = typeLinks.some(l => l.id === editingLink.id);
                        if (exists) {
                          updatedTypeLinks = typeLinks.map(l => l.id === editingLink.id ? { ...l, title: link.title, subLinks: link.subLinks.filter(sl => sl.url.trim() !== '') } : l);
                        } else {
                          updatedTypeLinks = [...typeLinks, { ...link, id: editingLink.id, subLinks: link.subLinks.filter(sl => sl.url.trim() !== '') }];
                        }
                      } else {
                        const newLinks = validLinks.map(l => ({ ...l, title: l.title || 'Group', subLinks: l.subLinks.filter(sl => sl.url.trim() !== '') }));
                        updatedTypeLinks = [...typeLinks, ...newLinks];
                      }

                      onUpdate({ ...client, Links: { ...currentLinks, [linkType]: updatedTypeLinks } });
                      
                      // Global Sync: If a new group was added, add it to settings
                      if (!editingLink) {
                        const section = deliveryLinkTypes.find(t => t.id === linkType);
                        const sectionItems = section?.items || [];
                        const newGroups = validLinks.filter(vl => !sectionItems.some(si => si.title === vl.title));
                        if (newGroups.length > 0) {
                          const updatedSettings = deliveryLinkTypes.map(dt => {
                            if (dt.id === linkType) {
                              const existingTitles = new Set(dt.items.map(i => i.title));
                              const itemsToAdd = newGroups
                                .filter(ng => !existingTitles.has(ng.title))
                                .map(ng => ({ id: ng.id, title: ng.title }));
                              return { ...dt, items: [...dt.items, ...itemsToAdd] };
                            }
                            return dt;
                          });
                          onUpdateSettings?.(updatedSettings);
                        }
                      }
                      
                      setIsAddLinkOpen(false);
                    }
                  }}
                  className="btn-primary py-3.5"
                >
                  {editingLink ? 'Save Changes' : 'Save Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
