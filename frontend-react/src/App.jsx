import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  LogOut,
  RefreshCw,
  Eye
} from 'lucide-react'
import { 
  getStats, 
  getRepairs, 
  getInterventions, 
  createIntervention, 
  updateIntervention, 
  deleteIntervention,
  updateRepairStatus,
  syncFirebase 
} from './api'

function App() {
  const [view, setView] = useState('frontoffice') // 'frontoffice' ou 'backoffice'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: 'admin@garage.com', password: 'password' })
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  
  // Intervention Management State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIntervention, setEditingIntervention] = useState(null)
  const [interventionForm, setInterventionForm] = useState({ name: '', price: '', duration: '' })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

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
    if (loginForm.email === 'admin@garage.com' && loginForm.password === 'password') {
      setIsAuthenticated(true)
      setView('backoffice')
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

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await syncFirebase()
      alert(`Synchronisation terminée : ${response.data.count} enregistrements traités.`)
      fetchData()
    } catch (error) {
      console.error("Sync error:", error)
      alert("Erreur lors de la synchronisation : " + (error.response?.data?.message || error.message))
    } finally {
      setSyncing(false)
    }
  }

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateRepairStatus(id, newStatus)
      fetchData()
    } catch (error) {
      alert("Erreur lors de la mise à jour du statut : " + (error.response?.data?.message || error.message))
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

  // --- FRONT OFFICE VIEW ---
  if (view === 'frontoffice') {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Garage Pro</h1>
                <p className="text-gray-400">Suivi des réparations en temps réel</p>
              </div>
            </div>
            <button 
              onClick={() => setView('login')}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 px-6 py-3 rounded-xl transition-all font-bold text-gray-300 hover:text-white"
            >
              <LogIn className="w-5 h-5" />
              Espace Administrateur
            </button>
          </header>

          <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-gray-800">
              <h2 className="text-2xl font-bold">Véhicules en cours de réparation</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-8 py-5">Client & Véhicule</th>
                    <th className="px-8 py-5">Intervention</th>
                    <th className="px-8 py-5">Position</th>
                    <th className="px-8 py-5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {repairs.filter(r => r.status === 'in_progress').length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-gray-500">
                        Aucun véhicule n'est actuellement en cours de réparation.
                      </td>
                    </tr>
                  ) : (
                    repairs.filter(r => r.status === 'in_progress').map((repair, index) => (
                      <motion.tr 
                        key={repair.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="bg-gray-800 p-3 rounded-2xl">
                              <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-bold text-white text-lg">{repair.car.user?.name || 'Client'}</p>
                              <p className="text-sm text-gray-400 font-medium">{repair.car.model} • <span className="font-mono text-gray-500">{repair.car.license_plate}</span></p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-gray-300">
                          {repair.items?.[0]?.intervention?.name || 'Réparation générale'}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-blue-400 font-bold">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                            Emplacement {repair.slot_number || '?'}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadge status={repair.status} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- LOGIN VIEW ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Administration</h1>
            <p className="text-gray-400 text-center">Identifiants requis pour accéder au backoffice</p>
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
            <button 
              type="button"
              onClick={() => setView('frontoffice')}
              className="w-full bg-transparent text-gray-500 hover:text-gray-300 text-sm font-medium py-2 transition-colors"
            >
              Retour à l'accueil
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  // --- BACK OFFICE VIEW ---
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
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium mt-4 ${
              syncing 
                ? 'bg-blue-600/20 text-blue-400 cursor-not-allowed' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser Firebase'}
          </button>
        </nav>

        <div className="flex flex-col gap-2 mt-auto">
          <button 
            onClick={() => setView('frontoffice')}
            className="flex items-center gap-3 text-blue-400 hover:text-blue-300 hover:bg-blue-400/5 px-4 py-3 rounded-xl transition-all font-medium"
          >
            <Eye className="w-5 h-5" />
            Voir FrontOffice
          </button>
          <button 
            onClick={() => {
              setIsAuthenticated(false)
              setView('frontoffice')
            }}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/5 px-4 py-3 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <header className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">Tableau de bord</h2>
                  <p className="text-gray-400 mt-2 text-lg">Aperçu global de l'activité du garage</p>
                </div>
              </header>

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
                    <h3 className="font-bold text-xl">Dernières réparations</h3>
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
            </motion.div>
          )}

          {activeTab === 'interventions' && (
            <motion.div 
              key="interventions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
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
            </motion.div>
          )}

          {activeTab === 'repairs' && (
            <motion.div 
              key="repairs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <header className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">Historique des Réparations</h2>
                  <p className="text-gray-400 mt-2 text-lg">Suivi complet de tous les dossiers véhicules</p>
                </div>
              </header>

              <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-8 py-5">ID</th>
                      <th className="px-8 py-5">Client/Véhicule</th>
                      <th className="px-8 py-5">Date</th>
                      <th className="px-8 py-5">Montant Total</th>
                      <th className="px-8 py-5">Déjà Payé</th>
                      <th className="px-8 py-5">Statut Paiement</th>
                      <th className="px-8 py-5">Statut Réparation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {repairs.map((repair) => (
                      <tr key={repair.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-8 py-6 font-mono text-gray-500">#{repair.id}</td>
                        <td className="px-8 py-6">
                          <div>
                            <p className="font-bold text-white text-lg">{repair.car.user?.name || 'Client'}</p>
                            <p className="text-sm text-gray-400">{repair.car.model} • {repair.car.license_plate}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-gray-400">
                          {new Date(repair.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-6 font-black text-xl text-white">
                          {formatCurrency(repair.total_amount)}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`font-bold text-lg ${repair.payments_sum_amount >= repair.total_amount ? 'text-green-400' : 'text-yellow-400'}`}>
                            {formatCurrency(repair.payments_sum_amount || 0)}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <PaymentStatusBadge 
                            paid={repair.payments_sum_amount || 0} 
                            total={repair.total_amount} 
                          />
                        </td>
                        <td className="px-8 py-6">
                          <select 
                            value={repair.status}
                            onChange={(e) => handleUpdateStatus(repair.id, e.target.value)}
                            className={`bg-gray-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all ${getStatusTextColor(repair.status)}`}
                          >
                            <option value="pending">En attente</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                            <option value="waiting_for_payment">En attente de paiement</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Intervention Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-gray-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">{editingIntervention ? 'Modifier' : 'Nouvelle'} Intervention</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleInterventionSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Désignation</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={interventionForm.name}
                  onChange={(e) => setInterventionForm({...interventionForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Prix (Ar)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={interventionForm.price}
                    onChange={(e) => setInterventionForm({...interventionForm, price: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Durée (sec)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={interventionForm.duration}
                    onChange={(e) => setInterventionForm({...interventionForm, duration: e.target.value})}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-8"
              >
                <Save className="w-6 h-6" />
                Enregistrer l'intervention
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className={`${color} p-4 rounded-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-400 font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
    </div>
  )
}

function PaymentStatusBadge({ paid, total }) {
  let status = 'unpaid'
  let label = 'Non payé'
  let style = 'bg-red-400/10 text-red-400 border-red-400/20'

  if (paid >= total && total > 0) {
    status = 'paid'
    label = 'Payé'
    style = 'bg-green-400/10 text-green-400 border-green-400/20'
  } else if (paid > 0) {
    status = 'partial'
    label = 'Partiel'
    style = 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
  }

  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${style}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    in_progress: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    completed: 'bg-green-400/10 text-green-400 border-green-400/20',
    waiting_for_payment: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  }
  
  const labels = {
    pending: 'En attente',
    in_progress: 'En cours',
    completed: 'Terminé',
    waiting_for_payment: 'En attente de paiement',
  }

  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

function getStatusTextColor(status) {
  const colors = {
    pending: 'text-yellow-400',
    in_progress: 'text-blue-400',
    completed: 'text-green-400',
    waiting_for_payment: 'text-orange-400',
  }
  return colors[status] || 'text-gray-400'
}

export default App 
