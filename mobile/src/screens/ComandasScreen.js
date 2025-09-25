import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saleService, customerService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ComandasScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [comandas, setComandas] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchText, setCustomerSearchText] = useState('');

  useEffect(() => {
    loadComandas();
    loadCustomers();
  }, []);

  const loadComandas = async () => {
    try {
      const response = await saleService.getOpen();
      const comandasData = response.data.filter(sale => sale.tipoVenda === 'comanda');
      setComandas(comandasData);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as comandas');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadComandas();
  };

  const createNewComanda = async () => {
    if (!selectedCustomer) {
      Alert.alert('Erro', 'Selecione um cliente para a comanda');
      return;
    }

    try {
      const saleData = {
        funcionario: user._id,
        cliente: selectedCustomer._id,
        tipoVenda: 'comanda',
      };

      const response = await saleService.create(saleData);
      setModalVisible(false);
      setSelectedCustomer(null);
      setCustomerSearchText('');
      
      // Navegar para a tela de venda
      navigation.navigate('Sale', {
        tipo: 'comanda',
        vendaId: response.data._id,
      });
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      Alert.alert('Erro', 'Não foi possível criar a comanda');
    }
  };

  const openComanda = (comanda) => {
    navigation.navigate('Sale', {
      tipo: 'comanda',
      vendaId: comanda._id,
    });
  };

  const closeComanda = async (comanda) => {
    Alert.alert(
      'Fechar Comanda',
      `Deseja realmente fechar a comanda #${comanda.numeroComanda}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar',
          style: 'destructive',
          onPress: async () => {
            try {
              await saleService.finalize(comanda._id, 'dinheiro');
              loadComandas();
              Alert.alert('Sucesso', 'Comanda fechada com sucesso!');
            } catch (error) {
              console.error('Erro ao fechar comanda:', error);
              Alert.alert('Erro', 'Não foi possível fechar a comanda');
            }
          },
        },
      ]
    );
  };

  const filteredComandas = comandas.filter(comanda => {
    const customerName = comanda.cliente?.nome || '';
    const comandaNumber = comanda.numeroComanda?.toString() || '';
    const searchLower = searchText.toLowerCase();
    
    return (
      customerName.toLowerCase().includes(searchLower) ||
      comandaNumber.includes(searchLower)
    );
  });

  const filteredCustomers = customers.filter(customer =>
    customer.nome.toLowerCase().includes(customerSearchText.toLowerCase())
  );

  const getComandaStatus = (comanda) => {
    const itemCount = comanda.itens?.length || 0;
    const total = comanda.total || 0;
    
    if (itemCount === 0) {
      return { status: 'Vazia', color: '#FF9800', icon: 'restaurant' };
    } else {
      return { status: 'Ativa', color: '#4CAF50', icon: 'checkmark-circle' };
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderComanda = ({ item }) => {
    const statusInfo = getComandaStatus(item);
    const itemCount = item.itens?.length || 0;
    const total = item.total || 0;

    return (
      <TouchableOpacity
        style={styles.comandaCard}
        onPress={() => openComanda(item)}
      >
        <View style={styles.comandaHeader}>
          <View style={styles.comandaInfo}>
            <Text style={styles.comandaNumber}>
              Comanda #{item.numeroComanda}
            </Text>
            <Text style={styles.customerName}>
              {item.cliente?.nome || 'Cliente não informado'}
            </Text>
            <Text style={styles.comandaTime}>
              Aberta às {formatTime(item.createdAt)}
            </Text>
          </View>
          
          <View style={styles.comandaStatus}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon} size={16} color="#fff" />
              <Text style={styles.statusText}>{statusInfo.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.comandaDetails}>
          <View style={styles.comandaStats}>
            <View style={styles.statItem}>
              <Ionicons name="restaurant" size={16} color="#666" />
              <Text style={styles.statText}>{itemCount} itens</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text style={styles.statText}>R$ {total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.comandaActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openComanda(item)}
            >
              <Ionicons name="create" size={16} color="#2196F3" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={() => closeComanda(item)}
            >
              <Ionicons name="close-circle" size={16} color="#FF5722" />
              <Text style={[styles.actionButtonText, styles.closeButtonText]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.customerItem,
        selectedCustomer?._id === item._id && styles.customerItemSelected
      ]}
      onPress={() => setSelectedCustomer(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerItemName}>{item.nome}</Text>
        <Text style={styles.customerItemPhone}>{item.telefone}</Text>
      </View>
      {selectedCustomer?._id === item._id && (
        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comandas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente ou número da comanda..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{comandas.length}</Text>
          <Text style={styles.statLabel}>Comandas Abertas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {comandas.filter(c => (c.itens?.length || 0) > 0).length}
          </Text>
          <Text style={styles.statLabel}>Com Itens</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            R$ {comandas.reduce((sum, c) => sum + (c.total || 0), 0).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={filteredComandas}
        renderItem={renderComanda}
        keyExtractor={(item) => item._id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma comanda encontrada</Text>
            <Text style={styles.emptySubtext}>
              Toque no botão + para criar uma nova comanda
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Comanda</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedCustomer(null);
                  setCustomerSearchText('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Selecione o cliente:</Text>
            
            <TextInput
              style={styles.customerSearchInput}
              placeholder="Buscar cliente..."
              value={customerSearchText}
              onChangeText={setCustomerSearchText}
            />

            <FlatList
              data={filteredCustomers}
              renderItem={renderCustomer}
              keyExtractor={(item) => item._id}
              style={styles.customerList}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedCustomer(null);
                  setCustomerSearchText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  !selectedCustomer && styles.confirmButtonDisabled
                ]}
                onPress={createNewComanda}
                disabled={!selectedCustomer}
              >
                <Text style={styles.confirmButtonText}>Criar Comanda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  comandaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comandaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  comandaInfo: {
    flex: 1,
  },
  comandaNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  comandaTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  comandaStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  comandaDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comandaStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  comandaActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
  },
  closeButtonText: {
    color: '#FF5722',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  customerSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  customerList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  customerItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  customerInfo: {
    flex: 1,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerItemPhone: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ComandasScreen;