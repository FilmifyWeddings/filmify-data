import { useState, useEffect, useMemo, forwardRef } from 'react';
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
const API_URL = "https://script.google.com/macros/s/AKfycbwQ59N2B9LG-3OSAE4X7cLYFceXC0srNqaG84GhqgmczykW02PKfEcXMU3peLrXrb0tCw/exec";

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'team' | 'settings'>('projects');
  const [teamProjects, setTeamProjects] = useState<any[]>([]);
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

  const fetchData = async () => {
    if (!API_URL || API_URL.includes("YOUR_APPS_SCRIPT")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
        setTeamProjects(data.teamProjects || []);
      } else {
        setClients(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync Data
  const sync = async (action: 'add' | 'update' | 'delete', client: Client) => {
    setIsSaving(true);
    const previousClients = [...clients];
    const updatedClients = action === 'add' ? [client, ...clients] :
                         action === 'delete' ? clients.filter(c => c.ID !== client.ID) :
                         clients.map(c => c.ID === client.ID ? client : c);
    
    setClients(updatedClients);

    if (!API_URL || API_URL.includes("YOUR_APPS_SCRIPT")) {
      setTimeout(() => setIsSaving(false), 500);
      return;
    }

    try {
      // We use a robust payload that includes both uppercase and lowercase keys
      // to ensure compatibility with various Apps Script implementations.
      const payload = {
        action,
        ID: client.ID,
        Name: client.Name,
        Date: client.Date,
        Type: client.Type,
        Storage: client.Storage,
        Secure: client.Secure,
        Links: client.Links || { cloud: [], photos: [], videos: [] },
        // Lowercase versions for safety
        id: client.ID,
        name: client.Name,
        date: client.Date,
        type: client.Type,
        storage: client.Storage,
        secure: client.Secure,
        links: client.Links || { cloud: [], photos: [], videos: [] }
      };

      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Sync failed:", error);
      setClients(previousClients);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const name = c.Name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [clients, searchQuery]);

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
              onClick={() => setActiveTab('team')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'team' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              Team
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
          {activeTab === 'projects' ? (
            <>
              <div className="flex items-end justify-between mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Active Projects</h2>
                  <p className="text-sm text-neutral-400 font-medium">Manage and track your ongoing studio work.</p>
                </div>
                <div className="text-sm text-neutral-400 font-semibold bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 shadow-sm">
                  {filteredClients.length} Projects
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
          ) : activeTab === 'team' ? (
            <>
              <div className="flex items-end justify-between mb-12">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Team Management</h2>
                  <p className="text-sm text-neutral-400 font-medium">Projects synced from your Team Management app.</p>
                </div>
                <div className="text-sm text-neutral-400 font-semibold bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 shadow-sm">
                  {teamProjects.length} Team Projects
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teamProjects.map((project, idx) => (
                  <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{project.ClientName}</h3>
                        <p className="text-xs text-neutral-500 font-mono">{project.ProjectID}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          const exists = clients.some(c => c.ID === project.ProjectID);
                          if (exists) {
                            alert("This project is already in Filmify!");
                            return;
                          }
                          setIsSaving(true);
                          try {
                            await fetch(API_URL, {
                              method: 'POST',
                              mode: 'no-cors',
                              body: JSON.stringify({ action: 'sync_team', project })
                            });
                            fetchData(); // Refresh
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Sync to Filmify
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <Calendar size={14} />
                        <span>{project.Date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <MapPin size={14} />
                        <span>{project.Location || 'No location set'}</span>
                      </div>
                      
                      <div className="pt-4 border-t border-neutral-800">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Team Assignments</p>
                        <div className="flex flex-wrap gap-2">
                          {project.Team && project.Team.length > 0 ? project.Team.map((member: any, mIdx: number) => (
                            <div key={mIdx} className="px-2 py-1 bg-neutral-800 rounded text-[10px] text-neutral-300">
                              <span className="font-bold">{member.name}</span> • {member.role}
                            </div>
                          )) : (
                            <p className="text-[10px] text-neutral-600 italic">No team assigned</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {teamProjects.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <Loader2 size={32} className="mb-2 animate-spin opacity-20" />
                    <p className="font-medium">Fetching team data...</p>
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
                {/* App Name */}
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
  onUpdate: (c: Client) => void, 
  onDelete: () => void 
}>(({ client, deliveryLinkTypes, storageOptions, onUpdate, onDelete }, ref) => {
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
            <h3 className={`text-xl font-bold truncate transition-colors ${client.Secure ? 'text-green-400' : 'text-white'}`}>{client.Name}</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${client.Secure ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-400 border border-neutral-800'}`}>
              {client.Type}
            </span>
          </div>
          <div className="flex items-center gap-6 text-neutral-300 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" />
              <span>Created: {client.Date}</span>
            </div>
          </div>
        </div>

        {/* Right Actions (Top in user request) */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onUpdate({ ...client, Secure: !client.Secure })}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${client.Secure ? 'bg-green-500 text-white border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105' : 'bg-neutral-900 text-white border-neutral-800 hover:border-neutral-100 shadow-sm'}`}
          >
            {client.Secure ? <ShieldCheck size={18} className="animate-pulse" /> : <Shield size={18} className="text-white" />}
            <span>{client.Secure ? 'Secured' : 'Secure'}</span>
          </button>
          <button 
            onClick={() => { if(window.confirm("Delete project?")) onDelete() }}
            className="p-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-500 transition-all bg-neutral-900 shadow-sm"
          >
            <Trash2 size={20} />
          </button>
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
              onChange={(e) => onUpdate({ ...client, Storage: e.target.value })}
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
