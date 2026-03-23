import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Plus, Trash2, Loader2, Cloud, Image as ImageIcon, 
  Video, ChevronDown, ChevronUp, Shield, ShieldCheck, Search,
  ExternalLink, X
} from 'lucide-react';
import { Client, Link } from './types';

// --- IMPORTANT: REPLACE WITH YOUR DEPLOYED APPS SCRIPT URL ---
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Load Data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync Data to Google Sheets
  const sync = async (action: 'add' | 'update' | 'delete', client: Client) => {
    const previousClients = [...clients];
    const updatedClients = action === 'add' ? [client, ...clients] :
                         action === 'delete' ? clients.filter(c => c.ID !== client.ID) :
                         clients.map(c => c.ID === client.ID ? client : c);
    
    setClients(updatedClients);

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id: client.ID,
          name: client.Name,
          date: client.Date,
          type: client.Type,
          storage: client.Storage,
          secure: client.Secure,
          links: client.Links || { cloud: [], photos: [], videos: [] }
        })
      });
    } catch (error) {
      console.error("Sync failed:", error);
      setClients(previousClients);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const name = c.Name || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'All' || c.Type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [clients, searchQuery, filterType]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-black">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-t-2 border-white rounded-full"
      />
      <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase font-mono">Filmify Studio Manager</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-6 md:px-12 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Camera className="text-black w-5 h-5" />
          </motion.div>
          <div>
            <h1 className="text-xl font-light tracking-tighter leading-none">FILMIFY</h1>
            <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Studio Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-zinc-900/50 border border-white/5 rounded-full px-4 py-1.5 gap-2">
            <Search size={14} className="text-zinc-600" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..." 
              className="bg-transparent text-xs outline-none w-40"
            />
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            NEW PROJECT
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="md:hidden mb-8 flex items-center bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 gap-3">
          <Search size={16} className="text-zinc-600" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..." 
            className="bg-transparent text-sm outline-none w-full"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          <div className="flex gap-2">
            {['All', 'Wedding', 'Pre-wedding', 'Maternity'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-medium transition-all border ${
                  filterType === type 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-zinc-500 border-white/5 hover:border-white/20'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            {filteredClients.length} Active Projects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredClients.map(client => (
              <ClientCard 
                key={client.ID} 
                client={client} 
                onUpdate={(u) => sync('update', u)}
                onDelete={() => sync('delete', client)}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredClients.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-zinc-700 font-light text-lg italic">No projects found matching your criteria.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass p-10 rounded-[3rem] shadow-2xl"
            >
              <button 
                onClick={() => setIsAddOpen(false)}
                className="absolute top-8 right-8 text-zinc-600 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-3xl font-light tracking-tighter mb-10">New Project</h2>
              
              <div className="space-y-8">
                <div className="group">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-white transition-colors">Client Name</p>
                  <input id="new-name" placeholder="e.g. Rahul & Priya" className="w-full bg-transparent text-xl font-light border-b border-white/10 pb-3 outline-none focus:border-white transition-all" />
                </div>
                <div className="group">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-white transition-colors">Event Date</p>
                  <input id="new-date" type="date" className="w-full bg-transparent text-xl font-light border-b border-white/10 pb-3 outline-none focus:border-white transition-all [color-scheme:dark]" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-2">Function Type</p>
                    <select id="new-type" className="w-full bg-transparent text-xs outline-none">
                      <option value="Wedding">Wedding</option>
                      <option value="Pre-wedding">Pre-wedding</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Maternity">Maternity</option>
                    </select>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-2">Storage</p>
                    <select id="new-storage" className="w-full bg-transparent text-xs outline-none">
                      <option value="HDD 01">HDD 01</option>
                      <option value="HDD 02">HDD 02</option>
                      <option value="SSD 01">SSD 01</option>
                      <option value="Cloud Only">Cloud Only</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const name = (document.getElementById('new-name') as HTMLInputElement).value;
                    const date = (document.getElementById('new-date') as HTMLInputElement).value;
                    const type = (document.getElementById('new-type') as HTMLSelectElement).value;
                    const storage = (document.getElementById('new-storage') as HTMLSelectElement).value;
                    if (name && date) {
                      sync('add', { ID: Date.now().toString(), Name: name, Date: date, Type: type, Storage: storage, Secure: false, Links: { cloud: [], photos: [], videos: [] } });
                      setIsAddOpen(false);
                    }
                  }}
                  className="w-full py-5 bg-white text-black rounded-full text-xs font-bold tracking-[0.2em] mt-6 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 transition-all"
                >
                  INITIALIZE PROJECT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientCard({ client, onUpdate, onDelete }: { client: Client, onUpdate: (c: Client) => void, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cloud' | 'photos' | 'videos'>('cloud');

  const LinkSection = ({ title, icon: IconComp, type }: { title: string, icon: any, type: 'cloud' | 'photos' | 'videos' }) => {
    const links = client.Links?.[type] || [];
    return (
      <div className="mb-6 last:mb-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <IconComp size={12} />
            <span className="text-[9px] font-mono uppercase tracking-widest">{title}</span>
          </div>
          <button 
            onClick={() => {
              setModalType(type);
              setIsModalOpen(true);
            }}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {links.length === 0 && <p className="text-[9px] text-zinc-800 italic px-1">No links added yet.</p>}
          {links.map(link => (
            <div key={link.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-zinc-300">{link.title}</span>
                <span className="text-[8px] text-zinc-600 truncate max-w-[120px]">{link.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-500 hover:text-white transition-colors"><ExternalLink size={12} /></a>
                <button onClick={() => onUpdate({ ...client, Links: { ...client.Links, [type]: links.filter(l => l.id !== link.id) } })} className="p-1.5 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div layout className={`glass p-8 rounded-[2.5rem] transition-all duration-700 relative overflow-hidden group ${client.Secure ? 'secure-glow' : ''}`}>
      {/* Link Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass p-8 rounded-[2rem] shadow-2xl">
              <h3 className="text-xl font-light mb-6">Add {modalType === 'cloud' ? 'Cloud' : modalType === 'photos' ? 'Photo' : 'Video'} Link</h3>
              <div className="space-y-4">
                <input id={`title-${client.ID}`} placeholder="Link Title (e.g. Gallery)" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white transition-all" />
                <input id={`url-${client.ID}`} placeholder="URL (https://...)" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white transition-all" />
                <button 
                  onClick={() => {
                    const titleInput = document.getElementById(`title-${client.ID}`) as HTMLInputElement;
                    const urlInput = document.getElementById(`url-${client.ID}`) as HTMLInputElement;
                    if (titleInput.value && urlInput.value) {
                      const newLink = { id: Date.now().toString(), title: titleInput.value, url: urlInput.value };
                      const currentLinks = client.Links || { cloud: [], photos: [], videos: [] };
                      onUpdate({ ...client, Links: { ...currentLinks, [modalType]: [...(currentLinks[modalType] || []), newLink] } });
                      setIsModalOpen(false);
                    }
                  }}
                  className="w-full py-3 bg-white text-black rounded-xl text-[10px] font-bold tracking-widest"
                >
                  ADD ASSET
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-[8px] font-mono text-zinc-500 border border-white/5 uppercase tracking-wider">{client.Type}</span>
            <span className="text-[8px] font-mono text-zinc-600 px-1 py-0.5 uppercase">{client.Date}</span>
          </div>
          <h3 className="text-2xl font-light tracking-tight">{client.Name}</h3>
        </div>
        <button onClick={() => { if(confirm("Delete?")) onDelete() }} className="text-zinc-800 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1.5">Storage</p>
          <select value={client.Storage} onChange={(e) => onUpdate({ ...client, Storage: e.target.value })} className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer">
            <option value="HDD 01">HDD 01</option><option value="HDD 02">HDD 02</option><option value="SSD 01">SSD 01</option><option value="Cloud Only">Cloud Only</option>
          </select>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1.5">Status</p>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-mono uppercase text-emerald-500 tracking-wider">Active</span></div>
        </div>
      </div>
      <div className="space-y-3">
        <button onClick={() => onUpdate({ ...client, Secure: !client.Secure })} className={`w-full py-4 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase border transition-all flex items-center justify-center gap-2 ${client.Secure ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-600 border-white/5 hover:border-white/10'}`}>
          {client.Secure ? <ShieldCheck size={14} /> : <Shield size={14} />}{client.Secure ? 'PROJECT SECURED' : 'MARK AS SECURE'}
        </button>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full py-3 text-[9px] text-zinc-700 uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:text-zinc-400 transition-colors">
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{isExpanded ? 'CLOSE ASSETS' : 'MANAGE ASSETS'}
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-6 mt-4 border-t border-white/5">
            <LinkSection title="Cloud Backup" icon={Cloud} type="cloud" />
            <LinkSection title="Photo Delivery" icon={ImageIcon} type="photos" />
            <LinkSection title="Video Delivery" icon={Video} type="videos" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
