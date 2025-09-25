import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mesaService, saleService } from '../../src/services/api';
import ProductSelector from '../../src/components/ProductSelector.js';
import { useAuth } from '../../src/contexts/AuthContext';

interface Mesa {
  _id: string;
  numero: number;
  status: 'livre' | 'ocupada' | 'reservada' | 'manutencao';
  capacidade: number;
  observacoes?: string;
}

export default function MesasScreen() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const { user } = useAuth();

  const loadMesas = async () => {
    try {
      const response = await mesaService.getAll();
      setMesas(response.data);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as mesas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMesas();
    setRefreshing(false);
  };

  useEffect(() => {
    loadMesas();
  }, []);

  const handleMesaPress = (mesa: Mesa) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }
    
    if (mesa.status === 'livre') {
      Alert.alert(
        'Abrir Mesa',
        `Deseja abrir a mesa ${mesa.numero}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir', onPress: () => openMesa(mesa._id) },
        ]
      );
    } else if (mesa.status === 'ocupada') {
      Alert.alert(
        'Mesa Ocupada',
        `A mesa ${mesa.numero} está ocupada. O que deseja fazer?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Adicionar Produtos', onPress: () => openProductSelector(mesa) },
          { text: 'Ver Vendas', onPress: () => router.push(`/sale?mesaId=${mesa._id}&viewMode=view`) },
          { text: 'Fechar Mesa', style: 'destructive', onPress: () => closeMesa(mesa._id) },
        ]
      );
    } else if (mesa.status === 'reservada') {
      Alert.alert(
        'Mesa Reservada',
        `A mesa ${mesa.numero} está reservada. O que deseja fazer?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Mesa', onPress: () => openMesa(mesa._id) },
          { text: 'Liberar Reserva', onPress: () => liberarReserva(mesa._id) },
        ]
      );
    } else if (mesa.status === 'manutencao') {
      Alert.alert('Mesa em Manutenção', 'Esta mesa está em manutenção e não pode ser utilizada.');
    } else {
      Alert.alert('Status Desconhecido', `Status da mesa: ${mesa.status}`);
    }
  };

  const openMesa = async (mesaId: string) => {
    try {
      await mesaService.update(mesaId, { status: 'ocupada' });
      await loadMesas();
      const mesa = mesas.find(m => m._id === mesaId);
      router.push(`/sale?mesaId=${mesaId}&mesaNumero=${mesa?.numero}`);
    } catch (error) {
      console.error('Erro ao abrir mesa:', error);
      Alert.alert('Erro', 'Não foi possível abrir a mesa');
    }
  };

  const closeMesa = async (mesaId: string) => {
    try {
      await mesaService.update(mesaId, { status: 'livre' });
      await loadMesas();
      Alert.alert('Sucesso', 'Mesa fechada com sucesso!');
    } catch (error) {
      console.error('Erro ao fechar mesa:', error);
      Alert.alert('Erro', 'Não foi possível fechar a mesa');
    }
  };

  const liberarReserva = async (mesaId: string) => {
    try {
      await mesaService.update(mesaId, { status: 'livre' });
      await loadMesas();
      Alert.alert('Sucesso', 'Reserva liberada com sucesso!');
    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      Alert.alert('Erro', 'Não foi possível liberar a reserva');
    }
  };

  const openProductSelector = async (mesa: Mesa) => {
    try {
      setSelectedMesa(mesa);
      // Buscar ou criar venda para a mesa
      const openSales = await saleService.getOpen();
      let sale = openSales.data.find((s: any) => s.mesa === mesa._id);
      
      if (!sale) {
        // Criar nova venda para a mesa
        const newSaleData = {
          funcionario: user?._id,
          mesa: mesa._id,
          tipoVenda: 'mesa',
          status: 'aberta'
        };
        const response = await saleService.create(newSaleData);
        sale = response.data;
      }
      
      setCurrentSale(sale);
      setProductSelectorVisible(true);
    } catch (error) {
      console.error('Erro ao abrir seletor de produtos:', error);
      Alert.alert('Erro', 'Não foi possível abrir o seletor de produtos');
    }
  };

  const handleProductSelect = async (product: any, quantity: number) => {
    try {
      if (!currentSale) {
        Alert.alert('Erro', 'Nenhuma venda ativa encontrada');
        return;
      }

      await saleService.addItem(currentSale._id, {
        produtoId: product._id,
        quantidade: quantity
      });

      Alert.alert(
        'Sucesso', 
        `${quantity}x ${product.nome} adicionado à mesa ${selectedMesa?.numero}!`
      );
      
      setProductSelectorVisible(false);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o produto');
    }
  };

  const handleCloseProductSelector = () => {
    setProductSelectorVisible(false);
    setSelectedMesa(null);
    setCurrentSale(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return '#4CAF50';
      case 'ocupada':
        return '#F44336';
      case 'reservada':
        return '#FF9800';
      case 'manutencao':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'livre':
        return 'Livre';
      case 'ocupada':
        return 'Ocupada';
      case 'reservada':
        return 'Reservada';
      case 'manutencao':
        return 'Manutenção';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'livre':
        return 'checkmark-circle';
      case 'ocupada':
        return 'people';
      case 'reservada':
        return 'time';
      case 'manutencao':
        return 'construct';
      default:
        return 'help-circle';
    }
  };

  const renderMesa = ({ item }: { item: Mesa }) => (
    <TouchableOpacity
      style={[styles.mesaCard, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => handleMesaPress(item)}
      activeOpacity={0.7}
    >
        <View style={styles.mesaHeader}>
          <Text style={styles.mesaNumero}>Mesa {item.numero}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.mesaInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.infoText}>Capacidade: {item.capacidade} pessoas</Text>
          </View>
          {item.observacoes && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={16} color="#666" />
              <Text style={styles.infoText}>{item.observacoes}</Text>
            </View>
          )}
        </View>
        
        {/* Botões de ação baseados no status */}
        <View style={styles.actionButtons}>
          {item.status === 'livre' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.openButton]}
              onPress={() => openMesa(item._id)}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Abrir Mesa</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'ocupada' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.addButton]}
                onPress={() => openProductSelector(item)}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Produtos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/sale?mesaId=${item._id}&viewMode=view`)}
              >
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Ver Vendas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.closeButton]}
                onPress={() => closeMesa(item._id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {item.status === 'reservada' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.openButton]}
                onPress={() => openMesa(item._id)}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Abrir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.releaseButton]}
                onPress={() => liberarReserva(item._id)}
              >
                <Ionicons name="unlock" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Liberar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {item.status === 'manutencao' && (
            <View style={styles.maintenanceInfo}>
              <Ionicons name="construct" size={16} color="#FF9800" />
              <Text style={styles.maintenanceText}>Mesa em manutenção</Text>
            </View>
          )}
        </View>
       </TouchableOpacity>
   );

  const mesasLivres = mesas.filter(m => m.status === 'livre').length;
  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada').length;
  const mesasReservadas = mesas.filter(m => m.status === 'reservada').length;

  return (
    <View style={styles.container}>
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mesasLivres}</Text>
          <Text style={styles.statLabel}>Livres</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mesasOcupadas}</Text>
          <Text style={styles.statLabel}>Ocupadas</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#F44336' }]} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mesasReservadas}</Text>
          <Text style={styles.statLabel}>Reservadas</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#FF9800' }]} />
        </View>
      </View>

      {/* Lista de Mesas */}
      <FlatList
        data={mesas}
        renderItem={renderMesa}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Product Selector Modal */}
      <ProductSelector
        visible={productSelectorVisible}
        onClose={handleCloseProductSelector}
        onProductSelect={handleProductSelect}
        title={selectedMesa ? `Adicionar à Mesa ${selectedMesa.numero}` : 'Selecionar Produto'}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
    position: 'relative',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  mesaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mesaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  mesaInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  viewButton: {
    backgroundColor: '#FF9800',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  releaseButton: {
    backgroundColor: '#9C27B0',
  },
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  maintenanceText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});