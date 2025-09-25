import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Nova Venda - Balcão',
      subtitle: 'Iniciar venda no balcão',
      icon: 'storefront',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Sale', { tipo: 'balcao' }),
    },
    {
      title: 'Gerenciar Mesas',
      subtitle: 'Ver status e abrir mesas',
      icon: 'restaurant',
      color: '#FF9800',
      onPress: () => navigation.navigate('Mesas'),
    },
    {
      title: 'Comandas',
      subtitle: 'Gerenciar comandas nomeadas',
      icon: 'receipt',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Comandas'),
    },
    {
      title: 'Histórico de Vendas',
      subtitle: 'Ver vendas finalizadas',
      icon: 'time',
      color: '#607D8B',
      onPress: () => navigation.navigate('Histórico'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Bem-vindo,</Text>
          <Text style={styles.userName}>{user?.nome || 'Funcionário'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Menu Principal</Text>
        
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderLeftColor: item.color }]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={24} color="#fff" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.sectionTitle}>Status Rápido</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Vendas Abertas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Mesas Ocupadas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Comandas Ativas</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuGrid: {
    marginBottom: 32,
  },
  menuItem: {
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
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  quickStats: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;