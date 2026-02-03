import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Wrench, 
  Car, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  LogIn,
  LogOut
} from 'lucide-react'
import { 
  getStats, 
  getRepairs, 
  getInterventions, 
  createIntervention, 
  updateIntervention, 
  deleteIntervention 
} from './api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: 'admin@garage.com', password: 'password' })
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Intervention Management State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIntervention, setEditingIntervention] = useState(null)
  const [interventionForm, setInterventionForm] = useState({ name: '', price: '', duration: '' })

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
      const interval = setInterval(fetchData, 10000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      const [statsRes, repairsRes, interventionsRes] = await Promise.all([
        getStats(),
        getRepairs(),
        getInterventions()
      ])
      setStats(statsRes.data)
      setRepairs(repairsRes.data)
      setInterventions(interventionsRes.data)
      setError(null)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Erreur de connexion au serveur. Vérifiez que le backend est lancé.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('MGA', 'Ar')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    // Default login for backoffice as requested
    if (loginForm.email === 'admin@garage.com' && loginForm.password === 'password') {
      setIsAuthenticated(true)
      setLoading(true)
    } else {
      alert("Identifiants incorrects (admin@garage.com / password)")
    }
  }

  const handleInterventionSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingIntervention) {
        await updateIntervention(editingIntervention.id, interventionForm)
      } else {
        await createIntervention(interventionForm)
      }
      setIsModalOpen(false)
      setEditingIntervention(null)
      setInterventionForm({ name: '', price: '', duration: '' })
      fetchData()
    } catch (error) {
      alert("Erreur lors de l'enregistrement")
    }
  }

  const handleDeleteIntervention = async (id) => {
    if (window.confirm("Supprimer cette intervention ?")) {
      try {
        await deleteIntervention(id)
        fetchData()
      } catch (error) {
        alert("Impossible de supprimer cette intervention car elle est liée à des réparations")
      }
    }
  }

  const openModal = (intervention = null) => {
    if (intervention) {
      setEditingIntervention(intervention)
      setInterventionForm({ 
        name: intervention.name, 
        price: intervention.price, 
        duration: intervention.duration 
      })
    } else {
      setEditingIntervention(null)
      setInterventionForm({ name: '', price: '', duration: '' })
    }
    setIsModalOpen(true)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Backoffice Garage</h1>
            <p className="text-gray-400 text-center">Connectez-vous pour gérer votre établissement</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Mot de passe</label>
              <input 
                type="password" 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-6"
            >
              <LogIn className="w-5 h-5" />
              Se connecter
            </button>
          </form>
          <p className="mt-6 text-xs text-gray-500 text-center italic">
            Par défaut : admin@garage.com / password
          </p>
        </div>
      </div>
    )
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 animate-pulse">Chargement des données...</p>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 max-w-md">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur technique</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => {
              setLoading(true)
              fetchData()
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-8 flex-shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Garage Pro</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <SidebarLink 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Tableau de bord"
          />
          <SidebarLink 
            active={activeTab === 'interventions'} 
            onClick={() => setActiveTab('interventions')}
            icon={<Wrench className="w-5 h-5" />}
            label="Gestion Interventions"
          />
          <SidebarLink 
            active={activeTab === 'repairs'} 
            onClick={() => setActiveTab('repairs')}
            icon={<Car className="w-5 h-5" />}
            label="Réparations"
          />
        </nav>

        <button 
          onClick={() => setIsAuthenticated(false)}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/5 px-4 py-3 rounded-xl transition-all font-medium mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-10">
        {activeTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-black tracking-tight">Tableau de bord</h2>
                <p className="text-gray-400 mt-2 text-lg">Aperçu global de l'activité du garage</p>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard 
                title="Revenus Totaux" 
                value={formatCurrency(stats?.total_revenue || 0)} 
                icon={<DollarSign className="w-7 h-7 text-green-400" />}
                color="bg-green-400/10"
              />
              <StatCard 
                title="Nombre de Clients" 
                value={stats?.total_clients || 0} 
                icon={<Users className="w-7 h-7 text-blue-400" />}
                color="bg-blue-400/10"
              />
              <StatCard 
                title="En attente" 
                value={stats?.pending_repairs || 0} 
                icon={<Clock className="w-7 h-7 text-yellow-400" />}
                color="bg-yellow-400/10"
              />
              <StatCard 
                title="Total Réparations" 
                value={stats?.total_repairs || 0} 
                icon={<CheckCircle2 className="w-7 h-7 text-purple-400" />}
                color="bg-purple-400/10"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="p-8 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-xl">Réparations actives</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-8 py-5">Véhicule</th>
                        <th className="px-8 py-5">Statut</th>
                        <th className="px-8 py-5">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {repairs.slice(0, 5).map((repair) => (
                        <tr key={repair.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="bg-gray-800 p-3 rounded-2xl">
                                <Car className="w-6 h-6 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">{repair.car.model}</p>
                                <p className="text-sm text-gray-500 font-mono tracking-tighter">{repair.car.license_plate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <StatusBadge status={repair.status} />
                          </td>
                          <td className="px-8 py-6 font-black text-xl text-white">
                            {formatCurrency(repair.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 shadow-xl">
                <h3 className="font-bold text-xl mb-8 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  Interventions fréquentes
                </h3>
                <div className="space-y-6">
                  {stats?.interventions_by_type?.map((item, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-gray-400 font-medium">{item.name}</span>
                        <span className="font-black text-white text-lg">{item.total}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                          style={{ width: `${(item.total / (stats.total_repairs || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interventions' && (
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-black tracking-tight">Gestion des Interventions</h2>
                <p className="text-gray-400 mt-2 text-lg">Définissez vos types de travaux, prix et durées</p>
              </div>
              <button 
                onClick={() => openModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-6 h-6" />
                Nouvelle Intervention
              </button>
            </header>

            <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-8 py-5">Désignation</th>
                    <th className="px-8 py-5">Prix</th>
                    <th className="px-8 py-5">Durée (sec)</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {interventions.map((intervention) => (
                    <tr key={intervention.id} className="hover:bg-gray-800/30 transition-colors group">
                      <td className="px-8 py-6 font-bold text-white text-lg">{intervention.name}</td>
                      <td className="px-8 py-6 font-black text-xl text-green-400">{formatCurrency(intervention.price)}</td>
                      <td className="px-8 py-6 text-gray-400 font-mono">{intervention.duration}s</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openModal(intervention)}
                            className="p-3 bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-600 rounded-xl transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteIntervention(intervention.id)}
                            className="p-3 bg-gray-800 text-gray-400 hover:text-white hover:bg-red-600 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'repairs' && (
           <div className="max-w-7xl mx-auto">
            <header className="mb-10">
              <h2 className="text-4xl font-black tracking-tight">Historique des Réparations</h2>
              <p className="text-gray-400 mt-2 text-lg">Suivi complet de tous les dossiers véhicules</p>
            </header>
            <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-8 py-5">ID</th>
                    <th className="px-8 py-5">Client/Véhicule</th>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5 text-right">Montant Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {repairs.map((repair) => (
                    <tr key={repair.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-8 py-6 font-mono text-gray-500">#{repair.id}</td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-white">{repair.car.model}</p>
                        <p className="text-xs text-gray-500">{repair.car.license_plate}</p>
                      </td>
                      <td className="px-8 py-6 text-gray-400">
                        {new Date(repair.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right font-black text-xl text-white">
                        {formatCurrency(repair.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           </div>
        )}
      </main>

      {/* Intervention Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-2xl font-black">{editingIntervention ? 'Modifier' : 'Ajouter'} une intervention</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleInterventionSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Désignation de l'intervention</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-medium"
                  placeholder="ex: Vidange moteur"
                  value={interventionForm.name}
                  onChange={(e) => setInterventionForm({...interventionForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Prix (Ar)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-black"
                    placeholder="0"
                    value={interventionForm.price}
                    onChange={(e) => setInterventionForm({...interventionForm, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Durée (secondes)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-mono"
                    placeholder="3600"
                    value={interventionForm.duration}
                    onChange={(e) => setInterventionForm({...interventionForm, duration: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Save className="w-6 h-6" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold group ${
        active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'} transition-colors`}>
        {icon}
      </span>
      <span className="tracking-tight">{label}</span>
    </button>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 hover:border-gray-700 transition-all group shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div className={`${color} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black mt-2 tracking-tighter text-white">{value}</h3>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    pending: { label: 'En attente', class: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
    in_progress: { label: 'En cours', class: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    completed: { label: 'Terminé', class: 'bg-green-400/10 text-green-400 border-green-400/20' },
    waiting_for_payment: { label: 'Paiement dû', class: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
    paid: { label: 'Payé', class: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
  }

  const { label, class: className } = config[status] || config.pending

  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${className}`}>
      {label}
    </span>
  )
}

export default App
