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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saleService } from '../services/api';

const HistoricoScreen = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('todos'); // todos, mesa, balcao, comanda
  const [dateFilter, setDateFilter] = useState('hoje'); // hoje, semana, mes, todos

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await saleService.getAll();
      // Filtrar apenas vendas finalizadas
      const finalizedSales = response.data.filter(sale => sale.status === 'finalizada');
      setSales(finalizedSales);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de vendas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const viewSaleDetails = (sale) => {
    setSelectedSale(sale);
    setModalVisible(true);
  };

  const getFilteredSales = () => {
    let filtered = sales;

    // Filtro por tipo
    if (filterType !== 'todos') {
      filtered = filtered.filter(sale => sale.tipoVenda === filterType);
    }

    // Filtro por data
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'hoje':
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= today;
        });
        break;
      case 'semana':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= weekAgo;
        });
        break;
      case 'mes':
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= monthAgo;
        });
        break;
    }

    // Filtro por texto
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(sale => {
        const customerName = sale.cliente?.nome || '';
        const employeeName = sale.funcionario?.nome || '';
        const saleNumber = sale.numeroComanda?.toString() || '';
        const mesaNumber = sale.mesa?.numero?.toString() || '';
        
        return (
          customerName.toLowerCase().includes(searchLower) ||
          employeeName.toLowerCase().includes(searchLower) ||
          saleNumber.includes(searchLower) ||
          mesaNumber.includes(searchLower)
        );
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getSaleTypeInfo = (tipoVenda) => {
    switch (tipoVenda) {
      case 'mesa':
        return { label: 'Mesa', icon: 'restaurant', color: '#2196F3' };
      case 'balcao':
        return { label: 'Balcão', icon: 'storefront', color: '#FF9800' };
      case 'comanda':
        return { label: 'Comanda', icon: 'receipt', color: '#4CAF50' };
      default:
        return { label: 'Outros', icon: 'help', color: '#9E9E9E' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodInfo = (method) => {
    switch (method) {
      case 'dinheiro':
        return { label: 'Dinheiro', icon: 'cash', color: '#4CAF50' };
      case 'cartao':
        return { label: 'Cartão', icon: 'card', color: '#2196F3' };
      case 'pix':
        return { label: 'PIX', icon: 'phone-portrait', color: '#FF9800' };
      default:
        return { label: method, icon: 'help', color: '#9E9E9E' };
    }
  };

  const filteredSales = getFilteredSales();
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const renderSale = ({ item }) => {
    const typeInfo = getSaleTypeInfo(item.tipoVenda);
    const paymentInfo = getPaymentMethodInfo(item.formaPagamento);
    const itemCount = item.itens?.length || 0;

    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => viewSaleDetails(item)}
      >
        <View style={styles.saleHeader}>
          <View style={styles.saleInfo}>
            <View style={styles.saleTypeContainer}>
              <View style={[styles.saleTypeBadge, { backgroundColor: typeInfo.color }]}>
                <Ionicons name={typeInfo.icon} size={12} color="#fff" />
                <Text style={styles.saleTypeText}>{typeInfo.label}</Text>
              </View>
              <Text style={styles.saleNumber}>#{item.numeroComanda}</Text>
            </View>
            
            <Text style={styles.saleDate}>
              {formatDate(item.createdAt)} às {formatTime(item.createdAt)}
            </Text>
            
            {item.tipoVenda === 'mesa' && item.mesa && (
              <Text style={styles.saleLocation}>Mesa {item.mesa.numero}</Text>
            )}
            
            {item.cliente && (
              <Text style={styles.customerName}>{item.cliente.nome}</Text>
            )}
          </View>
          
          <View style={styles.saleAmount}>
            <Text style={styles.saleTotal}>R$ {item.total.toFixed(2)}</Text>
            <View style={styles.paymentBadge}>
              <Ionicons name={paymentInfo.icon} size={12} color={paymentInfo.color} />
              <Text style={[styles.paymentText, { color: paymentInfo.color }]}>
                {paymentInfo.label}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.saleFooter}>
          <Text style={styles.itemCount}>{itemCount} itens</Text>
          <Text style={styles.employee}>
            Atendente: {item.funcionario?.nome || 'N/A'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSaleItem = ({ item }) => (
    <View style={styles.saleItemRow}>
      <View style={styles.saleItemInfo}>
        <Text style={styles.saleItemName}>{item.nomeProduto}</Text>
        <Text style={styles.saleItemDetails}>
          {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.saleItemTotal}>
        R$ {item.subtotal.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Vendas</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, funcionário ou número..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Tipo:</Text>
            {['todos', 'mesa', 'balcao', 'comanda'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.filterButtonActive
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === type && styles.filterButtonTextActive
                ]}>
                  {type === 'todos' ? 'Todos' : getSaleTypeInfo(type).label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Período:</Text>
            {['hoje', 'semana', 'mes', 'todos'].map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterButton,
                  dateFilter === period && styles.filterButtonActive
                ]}
                onPress={() => setDateFilter(period)}
              >
                <Text style={[
                  styles.filterButtonText,
                  dateFilter === period && styles.filterButtonTextActive
                ]}>
                  {period === 'hoje' ? 'Hoje' :
                   period === 'semana' ? 'Semana' :
                   period === 'mes' ? 'Mês' : 'Todos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalSales}</Text>
          <Text style={styles.statLabel}>Vendas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>R$ {totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Faturamento</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>R$ {averageTicket.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Ticket Médio</Text>
        </View>
      </View>

      <FlatList
        data={filteredSales}
        renderItem={renderSale}
        keyExtractor={(item) => item._id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma venda encontrada</Text>
            <Text style={styles.emptySubtext}>
              Ajuste os filtros para ver mais resultados
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
            {selectedSale && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Venda #{selectedSale.numeroComanda}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.saleDetailSection}>
                    <Text style={styles.saleDetailLabel}>Informações Gerais</Text>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailKey}>Tipo:</Text>
                      <Text style={styles.saleDetailValue}>
                        {getSaleTypeInfo(selectedSale.tipoVenda).label}
                      </Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailKey}>Data/Hora:</Text>
                      <Text style={styles.saleDetailValue}>
                        {formatDate(selectedSale.createdAt)} às {formatTime(selectedSale.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailKey}>Funcionário:</Text>
                      <Text style={styles.saleDetailValue}>
                        {selectedSale.funcionario?.nome || 'N/A'}
                      </Text>
                    </View>
                    {selectedSale.cliente && (
                      <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailKey}>Cliente:</Text>
                        <Text style={styles.saleDetailValue}>
                          {selectedSale.cliente.nome}
                        </Text>
                      </View>
                    )}
                    {selectedSale.mesa && (
                      <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailKey}>Mesa:</Text>
                        <Text style={styles.saleDetailValue}>
                          {selectedSale.mesa.numero}
                        </Text>
                      </View>
                    )}
                    <View style={styles.saleDetailRow}>
                      <Text style={styles.saleDetailKey}>Pagamento:</Text>
                      <Text style={styles.saleDetailValue}>
                        {getPaymentMethodInfo(selectedSale.formaPagamento).label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.saleDetailSection}>
                    <Text style={styles.saleDetailLabel}>Itens da Venda</Text>
                    <FlatList
                      data={selectedSale.itens}
                      renderItem={renderSaleItem}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                    />
                  </View>

                  <View style={styles.saleDetailSection}>
                    <View style={styles.totalSection}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>
                          R$ {selectedSale.subtotal.toFixed(2)}
                        </Text>
                      </View>
                      {selectedSale.desconto > 0 && (
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Desconto:</Text>
                          <Text style={[styles.totalValue, styles.discountValue]}>
                            -R$ {selectedSale.desconto.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.totalRow, styles.finalTotalRow]}>
                        <Text style={styles.finalTotalLabel}>Total:</Text>
                        <Text style={styles.finalTotalValue}>
                          R$ {selectedSale.total.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
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
    backgroundColor: '#2196F3',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontSize: 16,
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
  saleCard: {
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
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  saleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  saleTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  saleNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  saleDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  saleLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: '#666',
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 10,
    marginLeft: 2,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
  },
  employee: {
    fontSize: 12,
    color: '#666',
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
    width: '95%',
    maxHeight: '90%',
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
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  saleDetailSection: {
    marginBottom: 20,
  },
  saleDetailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  saleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  saleDetailKey: {
    fontSize: 14,
    color: '#666',
  },
  saleDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleItemInfo: {
    flex: 1,
  },
  saleItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  saleItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  saleItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  totalSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountValue: {
    color: '#FF5722',
  },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 8,
    paddingTop: 8,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

export default HistoricoScreen;