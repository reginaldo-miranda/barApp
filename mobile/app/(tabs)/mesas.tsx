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
import { mesaService } from '../../src/services/api';

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
          { text: 'Ver Vendas', onPress: () => router.push(`/sale?mesaId=${mesa._id}`) },
          { text: 'Fechar Mesa', style: 'destructive', onPress: () => closeMesa(mesa._id) },
        ]
      );
    } else if (mesa.status === 'manutencao') {
      Alert.alert('Mesa em Manutenção', 'Esta mesa está em manutenção e não pode ser utilizada.');
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
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.infoText}>{item.observacoes}</Text>
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
});