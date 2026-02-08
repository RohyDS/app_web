import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const getStats = () => api.get('/stats');
export const getInterventions = () => api.get('/interventions');
export const createIntervention = (data) => api.post('/interventions', data);
export const updateIntervention = (id, data) => api.put(`/interventions/${id}`, data);
export const deleteIntervention = (id) => api.delete(`/interventions/${id}`);
export const getRepairs = () => api.get('/repairs');
export const updateRepairStatus = (id, status) => api.patch(`/repairs/${id}/status`, { status });
export const createRepair = (data) => api.post('/repairs', data);
export const getCars = () => api.get('/cars');
export const syncFirebase = () => api.post('/sync-firebase');

export default api;
