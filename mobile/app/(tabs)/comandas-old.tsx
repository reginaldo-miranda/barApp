// Tela de Comandas com modal de criação atualizado
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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { customerService, comandaService } from '../../src/services/api';
import ProductSelector from '../../src/components/ProductSelector';
import { useAuth } from '../../src/contexts/AuthContext';

interface Comanda {
  _id: string;
  numeroComanda?: string;
  nomeComanda?: string;
  cliente?: {
    _id: string;
    nome: string;
    fone?: string;
    email?: string;
  };
  customerId?: string;
  customerName?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  total: number;
  createdAt: string;
  items: any[];
  funcionario?: {
    _id: string;
    nome: string;
  };
  tipoVenda: string;
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
  const [searchText, setSearchText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [currentSale, setCurrentSale] = useState<any>(null);
  
  // Novos estados para o modal de criação de comanda
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [comandaName, setComandaName] = useState('');
  const [comandaNumber, setComandaNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [creating, setCreating] = useState(false);
  const { user } = useAuth() as any;

  const loadComandas = async () => {
    try {
      setLoading(true);
      const response = await comandaService.getAll();
      
      // Processar dados para garantir compatibilidade
      const processedComandas = response.data.map((comanda: any) => ({
        _id: comanda._id,
        numeroComanda: comanda.numeroComanda || comanda.nomeComanda,
        nomeComanda: comanda.nomeComanda || comanda.numeroComanda,
        cliente: comanda.cliente,
        customerId: comanda.cliente?._id,
        customerName: comanda.cliente?.nome || comanda.customerName || 'Cliente não identificado',
        status: comanda.status,
        total: comanda.total || 0,
        createdAt: comanda.createdAt,
        items: comanda.items || [],
        funcionario: comanda.funcionario,
        tipoVenda: comanda.tipoVenda
      }));
      
      setComandas(processedComandas);
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
      `Comanda ${comanda.numeroComanda || comanda.nomeComanda}`,
      `Cliente: ${comanda.customerName}\nTotal: R$ ${comanda.total.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Adicionar Produtos', onPress: () => openProductSelector(comanda) },
        { text: 'Abrir', onPress: () => router.push(`/sale?vendaId=${comanda._id}&viewMode=false&tipo=comanda`) },
        { text: 'Fechar', style: 'destructive', onPress: () => closeComanda(comanda._id) },
      ]
    );
  };

  const closeComanda = (comandaId: string) => {
    Alert.alert(
      'Fechar Comanda',
      'Tem certeza que deseja fechar esta comanda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fechar', style: 'destructive', onPress: () => confirmCloseComanda(comandaId) },
      ]
    );
  };

  const confirmCloseComanda = async (comandaId: string) => {
    try {
      await comandaService.close(comandaId);
      await loadComandas(); // Recarregar lista
      Alert.alert('Sucesso', 'Comanda fechada com sucesso!');
    } catch (error) {
      console.error('Erro ao fechar comanda:', error);
      Alert.alert('Erro', 'Não foi possível fechar a comanda');
    }
  };

  const createNewComanda = () => {
    // Gerar número automático da comanda
    const autoNumber = `CMD${Date.now().toString().slice(-6)}`;
    setComandaNumber(autoNumber);
    setComandaName(autoNumber);
    setSelectedCustomerId('');
    setCustomerSearchText('');
    setObservacoes('');
    setShowCustomerList(false);
    setCreateModalVisible(true);
  };

  const handleCreateComanda = async () => {
    if (!comandaName.trim()) {
      Alert.alert('Erro', 'Nome da comanda é obrigatório');
      return;
    }
    
    if (!comandaNumber.trim()) {
      Alert.alert('Erro', 'Número da comanda é obrigatório');
      return;
    }
    
    if (!selectedCustomerId) {
      Alert.alert('Erro', 'Cliente é obrigatório');
      return;
    }

    try {
      setCreating(true);
      
      const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
      if (!selectedCustomer) {
        Alert.alert('Erro', 'Cliente selecionado não encontrado');
        return;
      }

      // Criar nova comanda via API
      const newComandaData = {
        funcionario: user?._id,
        nomeComanda: comandaName.trim(),
        numeroComanda: comandaNumber.trim(),
        cliente: selectedCustomerId,
        customerName: selectedCustomer.nome,
        tipoVenda: 'comanda',
        status: 'aberta',
        observacoes: observacoes.trim() || undefined
      };

      const response = await comandaService.create(newComandaData);
      
      // Fechar modal e limpar campos
      setCreateModalVisible(false);
      setComandaName('');
      setComandaNumber('');
      setSelectedCustomerId('');
      setCustomerSearchText('');
      setObservacoes('');
      
      // Recarregar lista de comandas
      await loadComandas();
      
      Alert.alert(
        'Sucesso', 
        'Comanda criada com sucesso!',
        [
          { text: 'OK' },
          { 
            text: 'Abrir Comanda', 
            onPress: () => router.push(`/sale?vendaId=${response.data._id}&viewMode=false&tipo=comanda`)
          }
        ]
      );
      
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      Alert.alert('Erro', 'Não foi possível criar a comanda');
    } finally {
      setCreating(false);
    }
  };

  const handleCustomerSearch = (text: string) => {
    setCustomerSearchText(text);
    setShowCustomerList(text.length > 0);
    
    // Se o texto corresponder exatamente a um cliente, selecionar automaticamente
    const exactMatch = customers.find(c => 
      c.nome.toLowerCase() === text.toLowerCase()
    );
    if (exactMatch) {
      setSelectedCustomerId(exactMatch._id);
      setShowCustomerList(false);
    } else {
      setSelectedCustomerId('');
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer._id);
    setCustomerSearchText(customer.nome);
    setShowCustomerList(false);
  };

  const getSelectedCustomerName = () => {
    if (!selectedCustomerId) return '';
    const customer = customers.find(c => c._id === selectedCustomerId);
    return customer ? customer.nome : '';
  };

  const openProductSelector = async (comanda: Comanda) => {
    try {
      setSelectedComanda(comanda);
      setCurrentSale(comanda);
      setProductSelectorVisible(true);
    } catch (error) {
      console.error('Erro ao abrir seletor de produtos:', error);
      Alert.alert('Erro', 'Não foi possível abrir o seletor de produtos');
    }
  };

  const handleProductSelect = async (product: any, quantity: number) => {
    try {
      if (!currentSale) {
        Alert.alert('Erro', 'Nenhuma comanda ativa encontrada');
        return;
      }

      await comandaService.addItem(currentSale._id, {
        produtoId: product._id,
        quantidade: quantity
      });

      Alert.alert(
        'Produto Adicionado',
        `${quantity}x ${product.nome} adicionado à comanda ${selectedComanda?.numeroComanda || selectedComanda?.nomeComanda}!`
      );

      // Recarregar comandas para atualizar totais
      await loadComandas();
      
      setProductSelectorVisible(false);
      setSelectedComanda(null);
      setCurrentSale(null);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o produto');
    }
  };

  const handleProductSelectorClose = () => {
    setProductSelectorVisible(false);
    setSelectedComanda(null);
    setCurrentSale(null);
  };

  const renderComanda = ({ item }: { item: Comanda }) => (
    <TouchableOpacity
      style={styles.comandaCard}
      onPress={() => handleComandaPress(item)}
    >
      <View style={styles.comandaHeader}>
        <View>
          <Text style={styles.comandaNumero}>{item.numeroComanda || item.nomeComanda}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View style={styles.comandaStatus}>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'aberta' ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.comandaTotal}>R$ {item.total.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.comandaInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.createdAt).toLocaleDateString('pt-BR')} às {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.funcionario?.nome || 'Funcionário não identificado'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="list-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.items.length} item(s)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredCustomers = customers.filter(customer =>
    customer.nome.toLowerCase().includes(searchText.toLowerCase()) ||
    (customer.fone && customer.fone.includes(searchText))
  );

  const filteredCustomersForCreate = customers.filter(customer =>
    customer.nome.toLowerCase().includes(customerSearchText.toLowerCase()) ||
    (customer.fone && customer.fone.includes(customerSearchText))
  );

  const comandasAbertas = comandas.filter(c => c.status === 'aberta').length;
  const totalComandas = comandas.reduce((sum, c) => c.status === 'aberta' ? sum + c.total : sum, 0);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 16, color: '#666' }}>Carregando comandas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com estatísticas */}
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
        style={styles.listContainer}
        data={comandas}
        renderItem={renderComanda}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma comanda encontrada</Text>
          </View>
        }
      />



      {/* Modal de criação de nova comanda */}
      <Modal visible={createModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Comanda</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            {/* Nome da Comanda */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Comanda *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Mesa 1, João Silva..."
                value={comandaName}
                onChangeText={setComandaName}
              />
            </View>

            {/* Número da Comanda */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Número da Comanda *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: CMD001, 001..."
                value={comandaNumber}
                onChangeText={setComandaNumber}
              />
            </View>

            {/* Cliente */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cliente *</Text>
              <View style={styles.customerInputContainer}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 0 }]}
                  placeholder="Digite o nome do cliente..."
                  value={customerSearchText}
                  onChangeText={handleCustomerSearch}
                  onFocus={() => setShowCustomerList(customerSearchText.length > 0)}
                />
                {selectedCustomerId && (
                  <View style={styles.selectedCustomerBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.selectedCustomerText}>{getSelectedCustomerName()}</Text>
                  </View>
                )}
              </View>
              
              {showCustomerList && (
                <View style={styles.customerDropdown}>
                  {filteredCustomersForCreate.length > 0 ? (
                    filteredCustomersForCreate.slice(0, 5).map((customer) => (
                      <TouchableOpacity
                        key={customer._id}
                        style={styles.customerDropdownItem}
                        onPress={() => handleCustomerSelect(customer)}
                      >
                        <Text style={styles.customerDropdownName}>{customer.nome}</Text>
                        {customer.fone && (
                          <Text style={styles.customerDropdownPhone}>{customer.fone}</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.customerDropdownItem}>
                      <Text style={styles.noCustomerText}>Nenhum cliente encontrado</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Observações */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Observações</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Observações adicionais (opcional)..."
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Botões */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCreateModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleCreateComanda}
                disabled={creating || !comandaName.trim() || !comandaNumber.trim() || !selectedCustomerId}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Criar Comanda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Selector */}
      <ProductSelector
        visible={productSelectorVisible}
        onClose={handleProductSelectorClose}
        onProductSelect={handleProductSelect}
        title={selectedComanda ? `Adicionar produtos - ${selectedComanda.numeroComanda || selectedComanda.nomeComanda}` : 'Adicionar produtos'}
      />
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
  // Novos estilos para o modal de criação
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  customerInputContainer: {
    position: 'relative',
  },
  selectedCustomerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  selectedCustomerText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  customerDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 4,
  },
  customerDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerDropdownName: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  customerDropdownPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noCustomerText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});