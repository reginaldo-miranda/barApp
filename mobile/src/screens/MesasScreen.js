import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mesaService } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const MesasScreen = ({ navigation }) => {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [numeroClientes, setNumeroClientes] = useState('1');

  const loadMesas = async () => {
    try {
      const response = await mesaService.getAll();
      setMesas(response.data);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as mesas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMesas();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMesas();
  };

  const handleMesaPress = (mesa) => {
    if (mesa.status === 'livre') {
      setSelectedMesa(mesa);
      setModalVisible(true);
    } else if (mesa.status === 'ocupada' && mesa.vendaAtual) {
      // Navegar para a venda da mesa
      navigation.navigate('Sale', { 
        tipo: 'mesa', 
        mesaId: mesa._id,
        vendaId: mesa.vendaAtual._id 
      });
    }
  };

  const abrirMesa = async () => {
    if (!selectedMesa || !numeroClientes) return;

    try {
      await mesaService.abrir(selectedMesa._id, parseInt(numeroClientes));
      setModalVisible(false);
      setSelectedMesa(null);
      setNumeroClientes('1');
      
      // Criar nova venda para a mesa
      navigation.navigate('Sale', { 
        tipo: 'mesa', 
        mesaId: selectedMesa._id 
      });
      
      loadMesas();
    } catch (error) {
      console.error('Erro ao abrir mesa:', error);
      Alert.alert('Erro', 'Não foi possível abrir a mesa');
    }
  };

  const fecharMesa = async (mesa) => {
    Alert.alert(
      'Fechar Mesa',
      `Tem certeza que deseja fechar a mesa ${mesa.numero}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar',
          style: 'destructive',
          onPress: async () => {
            try {
              await mesaService.fechar(mesa._id);
              loadMesas();
            } catch (error) {
              console.error('Erro ao fechar mesa:', error);
              Alert.alert('Erro', error.response?.data?.message || 'Não foi possível fechar a mesa');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'livre': return '#4CAF50';
      case 'ocupada': return '#FF5722';
      case 'reservada': return '#FF9800';
      case 'manutencao': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'livre': return 'Livre';
      case 'ocupada': return 'Ocupada';
      case 'reservada': return 'Reservada';
      case 'manutencao': return 'Manutenção';
      default: return 'Desconhecido';
    }
  };

  const renderMesa = ({ item }) => (
    <TouchableOpacity
      style={[styles.mesaCard, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => handleMesaPress(item)}
    >
      <View style={styles.mesaHeader}>
        <View style={styles.mesaInfo}>
          <Text style={styles.mesaNumero}>Mesa {item.numero}</Text>
          <Text style={styles.mesaNome}>{item.nome}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.mesaDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.clientesAtuais || 0}/{item.capacidade}
          </Text>
        </View>
        
        {item.status === 'ocupada' && item.horaAbertura && (
          <View style={styles.detailItem}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(item.horaAbertura).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.detailText}>{item.tipo}</Text>
        </View>
      </View>
      
      {item.status === 'ocupada' && (
        <TouchableOpacity
          style={styles.fecharButton}
          onPress={() => fecharMesa(item)}
        >
          <Text style={styles.fecharButtonText}>Fechar Mesa</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mesas}
        renderItem={renderMesa}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Abrir Mesa {selectedMesa?.numero}
            </Text>
            
            <Text style={styles.modalLabel}>Número de clientes:</Text>
            <TextInput
              style={styles.modalInput}
              value={numeroClientes}
              onChangeText={setNumeroClientes}
              keyboardType="numeric"
              placeholder="1"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={abrirMesa}
              >
                <Text style={styles.confirmButtonText}>Abrir Mesa</Text>
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
  listContainer: {
    padding: 16,
  },
  mesaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  mesaInfo: {
    flex: 1,
  },
  mesaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mesaNome: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mesaDetails: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  fecharButton: {
    backgroundColor: '#FF5722',
    margin: 16,
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  fecharButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 24,
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
    backgroundColor: '#2196F3',
    marginLeft: 8,
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

export default MesasScreen;