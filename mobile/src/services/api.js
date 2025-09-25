import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração base da API
const API_BASE_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao recuperar token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      // Aqui você pode redirecionar para tela de login
    }
    return Promise.reject(error);
  }
);

export default api;

// Serviços específicos
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
};

export const employeeService = {
  getAll: () => api.get('/employee/list'),
  getById: (id) => api.get(`/employee/${id}`),
  create: (data) => api.post('/employee/create', data),
  update: (id, data) => api.put(`/employee/${id}`, data),
  delete: (id) => api.delete(`/employee/${id}`),
};

export const productService = {
  getAll: () => api.get('/product/list'),
  getById: (id) => api.get(`/product/${id}`),
  getByCategory: (category) => api.get(`/product/category/${category}`),
  create: (data) => api.post('/product/create', data),
  update: (id, data) => api.put(`/product/${id}`, data),
  delete: (id) => api.delete(`/product/${id}`),
};

export const mesaService = {
  getAll: () => api.get('/mesa/list'),
  getById: (id) => api.get(`/mesa/${id}`),
  create: (data) => api.post('/mesa/create', data),
  update: (id, data) => api.put(`/mesa/${id}`, data),
  abrir: (id, numeroClientes) => api.post(`/mesa/${id}/abrir`, { numeroClientes }),
  fechar: (id) => api.post(`/mesa/${id}/fechar`),
};

export const saleService = {
  getAll: () => api.get('/sale/list'),
  getOpen: () => api.get('/sale/open'),
  getById: (id) => api.get(`/sale/${id}`),
  getByMesa: (mesaId) => api.get(`/sale/mesa/${mesaId}`),
  create: (data) => api.post('/sale/create', data),
  addItem: (id, item) => api.post(`/sale/${id}/item`, item),
  removeItem: (id, itemId) => api.delete(`/sale/${id}/item/${itemId}`),
  updateItem: (id, itemId, data) => api.put(`/sale/${id}/item/${itemId}`, data),
  applyDiscount: (id, discount) => api.put(`/sale/${id}/discount`, { desconto: discount }),
  finalize: (id, formaPagamento) => api.put(`/sale/${id}/finalize`, { formaPagamento }),
  cancel: (id) => api.put(`/sale/${id}/cancel`),
};

export const customerService = {
  getAll: () => api.get('/customer/list'),
  getById: (id) => api.get(`/customer/${id}`),
  create: (data) => api.post('/customer/create', data),
  update: (id, data) => api.put(`/customer/${id}`, data),
  delete: (id) => api.delete(`/customer/${id}`),
};