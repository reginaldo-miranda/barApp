import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

interface Product {
  _id: string;
  nome: string;
  descricao: string;
  precoCusto: number;
  precoVenda: number;
  categoria: string;
  grupo: string;
  unidade: string;
  ativo: boolean;
  quantidade: number;
  disponivel: boolean;
}

export default function AdminProdutosScreen() {
  const { hasPermission } = useAuth() as any;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    precoCusto: '',
    precoVenda: '',
    categoria: 'outros',
    grupo: '',
    unidade: 'un',
    ativo: true,
    quantidade: '0',
    disponivel: true,
  });

  const categorias = [
    'bebidas-alcoolicas',
    'bebidas-nao-alcoolicas',
    'petiscos',
    'pratos-principais',
    'sobremesas',
    'outros'
  ];

  useEffect(() => {
    if (!hasPermission('produtos')) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta tela');
      return;
    }
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.nome.trim() || !formData.precoVenda) {
        Alert.alert('Erro', 'Nome e preço de venda são obrigatórios');
        return;
      }

      const productData = {
        ...formData,
        precoCusto: parseFloat(formData.precoCusto) || 0,
        precoVenda: parseFloat(formData.precoVenda),
        quantidade: parseInt(formData.quantidade) || 0,
      };

      if (editingProduct) {
        await productService.update(editingProduct._id, productData);
        Alert.alert('Sucesso', 'Produto atualizado com sucesso');
      } else {
        await productService.create(productData);
        Alert.alert('Sucesso', 'Produto criado com sucesso');
      }

      setModalVisible(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Erro ao salvar produto');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      descricao: product.descricao || '',
      precoCusto: product.precoCusto.toString(),
      precoVenda: product.precoVenda.toString(),
      categoria: product.categoria,
      grupo: product.grupo || '',
      unidade: product.unidade,
      ativo: product.ativo,
      quantidade: product.quantidade.toString(),
      disponivel: product.disponivel,
    });
    setModalVisible(true);
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir o produto "${product.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.delete(product._id);
              Alert.alert('Sucesso', 'Produto excluído com sucesso');
              loadProducts();
            } catch (error) {
              console.error('Erro ao excluir produto:', error);
              Alert.alert('Erro', 'Erro ao excluir produto');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      precoCusto: '',
      precoVenda: '',
      categoria: 'outros',
      grupo: '',
      unidade: 'un',
      ativo: true,
      quantidade: '0',
      disponivel: true,
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(product =>
    product.nome.toLowerCase().includes(searchText.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.nome}</Text>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditProduct(item)}
          >
            <Ionicons name="pencil" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item)}
          >
            <Ionicons name="trash" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.productDescription}>{item.descricao}</Text>
      <Text style={styles.productCategory}>Categoria: {item.categoria}</Text>
      
      <View style={styles.productPrices}>
        <Text style={styles.priceText}>Custo: R$ {item.precoCusto.toFixed(2)}</Text>
        <Text style={styles.priceText}>Venda: R$ {item.precoVenda.toFixed(2)}</Text>
      </View>
      
      <View style={styles.productStatus}>
        <Text style={[styles.statusText, { color: item.ativo ? '#4CAF50' : '#f44336' }]}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Text>
        <Text style={[styles.statusText, { color: item.disponivel ? '#4CAF50' : '#f44336' }]}>
          {item.disponivel ? 'Disponível' : 'Indisponível'}
        </Text>
      </View>
    </View>
  );

  if (!hasPermission('produtos')) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.accessDeniedText}>Acesso Negado</Text>
        <Text style={styles.accessDeniedSubtext}>
          Você não tem permissão para gerenciar produtos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com busca e botão adicionar */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de produtos */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de criação/edição */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <TouchableOpacity onPress={handleSaveProduct}>
              <Text style={styles.saveButton}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={formData.nome}
                onChangeText={(text) => setFormData({ ...formData, nome: text })}
                placeholder="Nome do produto"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descricao}
                onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                placeholder="Descrição do produto"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preço de Custo</Text>
                <TextInput
                  style={styles.input}
                  value={formData.precoCusto}
                  onChangeText={(text) => setFormData({ ...formData, precoCusto: text })}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preço de Venda *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.precoVenda}
                  onChangeText={(text) => setFormData({ ...formData, precoVenda: text })}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        formData.categoria === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, categoria: cat })}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        formData.categoria === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat.replace('-', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Grupo</Text>
                <TextInput
                  style={styles.input}
                  value={formData.grupo}
                  onChangeText={(text) => setFormData({ ...formData, grupo: text })}
                  placeholder="Grupo do produto"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Unidade</Text>
                <TextInput
                  style={styles.input}
                  value={formData.unidade}
                  onChangeText={(text) => setFormData({ ...formData, unidade: text })}
                  placeholder="un"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Quantidade em Estoque</Text>
              <TextInput
                style={styles.input}
                value={formData.quantidade}
                onChangeText={(text) => setFormData({ ...formData, quantidade: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Produto Ativo</Text>
                <Switch
                  value={formData.ativo}
                  onValueChange={(value) => setFormData({ ...formData, ativo: value })}
                  trackColor={{ false: '#ccc', true: '#2196F3' }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Disponível para Venda</Text>
                <Switch
                  value={formData.disponivel}
                  onValueChange={(value) => setFormData({ ...formData, disponivel: value })}
                  trackColor={{ false: '#ccc', true: '#2196F3' }}
                />
              </View>
            </View>
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  productActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  productPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  productStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  switchContainer: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
});