import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../src/services/api';

interface Comanda {
  id: number;
  numero: string;
  customerName: string;
  customerId?: number;
  status: 'aberta' | 'fechada';
  total: number;
  createdAt: string;
  items: any[];
}

interface Customer {
  _id: string;
  nome: string;
  fone?: string;
  email?: string;
}

export default function ComandasScreen() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Mock data para comandas (substituir por API real quando disponível)
  const mockComandas: Comanda[] = [
    {
      id: 1,
      numero: 'CMD001',
      customerName: 'João Silva',
      customerId: 1,
      status: 'aberta',
      total: 45.50,
      createdAt: new Date().toISOString(),
      items: []
    },
    {
      id: 2,
      numero: 'CMD002',
      customerName: 'Maria Santos',
      customerId: 2,
      status: 'aberta',
      total: 78.90,
      createdAt: new Date().toISOString(),
      items: []
    }
  ];

  const loadComandas = async () => {
    try {
      // TODO: Implementar endpoint de comandas no backend
      // const response = await comandaService.getAll();
      // setComandas(response.data);
      
      // Por enquanto, usando dados mock
      setComandas(mockComandas);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as comandas');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadComandas(), loadCustomers()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadComandas();
    loadCustomers();
  }, []);

  const handleComandaPress = (comanda: Comanda) => {
    Alert.alert(
      `Comanda ${comanda.numero}`,
      `Cliente: ${comanda.customerName}\nTotal: R$ ${comanda.total.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir', onPress: () => router.push(`/sale?comandaId=${comanda.id}&comandaNumero=${comanda.numero}`) },
        { text: 'Fechar', style: 'destructive', onPress: () => closeComanda(comanda.id) },
      ]
    );
  };

  const closeComanda = (comandaId: number) => {
    Alert.alert(
      'Fechar Comanda',
      'Tem certeza que deseja fechar esta comanda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fechar', style: 'destructive', onPress: () => confirmCloseComanda(comandaId) },
      ]
    );
  };

  const confirmCloseComanda = async (comandaId: number) => {
    try {
      // TODO: Implementar endpoint para fechar comanda
      // await comandaService.close(comandaId);
      
      // Por enquanto, removendo da lista local
      setComandas(prev => prev.filter(c => c.id !== comandaId));
      Alert.alert('Sucesso', 'Comanda fechada com sucesso!');
    } catch (error) {
      console.error('Erro ao fechar comanda:', error);
      Alert.alert('Erro', 'Não foi possível fechar a comanda');
    }
  };

  const createNewComanda = () => {
    setModalVisible(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(false);
    
    // Gerar número da comanda
    const comandaNumero = `CMD${String(comandas.length + 1).padStart(3, '0')}`;
    
    // Navegar para tela de venda com dados da comanda
    router.push(`/sale?type=comanda&customerName=${encodeURIComponent(customer.nome)}&comandaNumero=${comandaNumero}`);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.nome?.toLowerCase().includes(searchText.toLowerCase()) ||
    (customer.fone && customer.fone.includes(searchText))
  );

  const renderComanda = ({ item }: { item: Comanda }) => (
    <TouchableOpacity
      style={styles.comandaCard}
      onPress={() => handleComandaPress(item)}
    >
      <View style={styles.comandaHeader}>
        <View>
          <Text style={styles.comandaNumero}>{item.numero}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View style={styles.comandaStatus}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'aberta' ? '#4CAF50' : '#9E9E9E' }]}>
            <Text style={styles.statusText}>
              {item.status === 'aberta' ? 'Aberta' : 'Fechada'}
            </Text>
          </View>
          <Text style={styles.comandaTotal}>R$ {item.total.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.comandaInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.infoText}>
            Aberta em: {new Date(item.createdAt).toLocaleString('pt-BR')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="receipt" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleCustomerSelect(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.nome}</Text>
        {item.fone && <Text style={styles.customerPhone}>{item.fone}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const comandasAbertas = comandas.filter(c => c.status === 'aberta').length;
  const totalComandas = comandas.reduce((sum, c) => sum + c.total, 0);

  return (
    <View style={styles.container}>
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{comandasAbertas}</Text>
          <Text style={styles.statLabel}>Abertas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>R$ {totalComandas.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <TouchableOpacity style={styles.newComandaButton} onPress={createNewComanda}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newComandaText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Comandas */}
      <FlatList
        data={comandas}
        renderItem={renderComanda}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma comanda aberta</Text>
            <TouchableOpacity style={styles.createButton} onPress={createNewComanda}>
              <Text style={styles.createButtonText}>Criar Nova Comanda</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal de Seleção de Cliente */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Cliente</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomer}
            keyExtractor={(item) => item._id}
            style={styles.customerList}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  newComandaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newComandaText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  comandaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comandaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  comandaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  comandaStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  comandaTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  comandaInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  customerList: {
    flex: 1,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerInfo: {
    flex: 1,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});