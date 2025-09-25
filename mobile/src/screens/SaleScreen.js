import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService, saleService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SaleScreen = ({ route, navigation }) => {
  const { tipo, mesaId, vendaId } = route.params || {};
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  const categories = [
    { key: 'todos', label: 'Todos' },
    { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas' },
    { key: 'bebidas-nao-alcoolicas', label: 'Bebidas' },
    { key: 'petiscos', label: 'Petiscos' },
    { key: 'pratos-principais', label: 'Pratos' },
    { key: 'sobremesas', label: 'Sobremesas' },
  ];

  const paymentMethods = [
    { key: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
    { key: 'cartao', label: 'Cartão', icon: 'card' },
    { key: 'pix', label: 'PIX', icon: 'phone-portrait' },
  ];

  useEffect(() => {
    loadProducts();
    if (vendaId) {
      loadSale();
    } else {
      createNewSale();
    }
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.getAll();
      setProducts(response.data.filter(p => p.ativo && p.disponivel));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadSale = async () => {
    try {
      const response = await saleService.getById(vendaId);
      setSale(response.data);
      setCart(response.data.itens || []);
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
      Alert.alert('Erro', 'Não foi possível carregar a venda');
    }
  };

  const createNewSale = async () => {
    try {
      const saleData = {
        funcionario: user._id,
        tipoVenda: tipo || 'balcao',
      };

      if (mesaId) {
        saleData.mesa = mesaId;
      }

      const response = await saleService.create(saleData);
      setSale(response.data);
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      Alert.alert('Erro', 'Não foi possível criar a venda');
      navigation.goBack();
    }
  };

  const addToCart = async (product) => {
    if (!sale) return;

    try {
      const existingItem = cart.find(item => item.produto._id === product._id);
      
      if (existingItem) {
        // Atualizar quantidade
        const newQuantity = existingItem.quantidade + 1;
        await saleService.updateItem(sale._id, existingItem._id, {
          quantidade: newQuantity,
          subtotal: newQuantity * product.precoVenda
        });
      } else {
        // Adicionar novo item
        await saleService.addItem(sale._id, {
          produto: product._id,
          nomeProduto: product.nome,
          quantidade: 1,
          precoUnitario: product.precoVenda,
          subtotal: product.precoVenda
        });
      }
      
      loadSale(); // Recarregar venda para atualizar carrinho
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const removeFromCart = async (item) => {
    if (!sale) return;

    try {
      if (item.quantidade > 1) {
        // Diminuir quantidade
        const newQuantity = item.quantidade - 1;
        await saleService.updateItem(sale._id, item._id, {
          quantidade: newQuantity,
          subtotal: newQuantity * item.precoUnitario
        });
      } else {
        // Remover item
        await saleService.removeItem(sale._id, item._id);
      }
      
      loadSale();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      Alert.alert('Erro', 'Não foi possível remover o item');
    }
  };

  const finalizeSale = async () => {
    if (!sale || cart.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um item à venda');
      return;
    }

    try {
      await saleService.finalize(sale._id, paymentMethod);
      Alert.alert(
        'Sucesso',
        'Venda finalizada com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      Alert.alert('Erro', 'Não foi possível finalizar a venda');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.nome}</Text>
        <Text style={styles.productDescription}>{item.descricao}</Text>
        <Text style={styles.productPrice}>
          R$ {item.precoVenda.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.nomeProduto}</Text>
        <Text style={styles.cartItemPrice}>
          R$ {item.precoUnitario.toFixed(2)} x {item.quantidade}
        </Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => removeFromCart(item)}
        >
          <Ionicons name="remove" size={16} color="#FF5722" />
        </TouchableOpacity>
        <Text style={styles.cartItemQuantity}>{item.quantidade}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => addToCart({ _id: item.produto._id, nome: item.nomeProduto, precoVenda: item.precoUnitario })}
        >
          <Ionicons name="add" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>
        R$ {item.subtotal.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {tipo === 'mesa' ? `Mesa ${sale?.mesa?.numero}` : 'Venda Balcão'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Venda #{sale?.numeroComanda}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produtos..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.key && styles.categoryButtonTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        <View style={styles.productsSection}>
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Carrinho ({cart.length})</Text>
            <Text style={styles.cartTotal}>R$ {total.toFixed(2)}</Text>
          </View>
          
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item._id}
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          
          <TouchableOpacity
            style={[styles.finalizeButton, cart.length === 0 && styles.finalizeButtonDisabled]}
            onPress={() => setModalVisible(true)}
            disabled={cart.length === 0}
          >
            <Text style={styles.finalizeButtonText}>Finalizar Venda</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Venda</Text>
            
            <Text style={styles.modalSubtitle}>
              Total: R$ {total.toFixed(2)}
            </Text>
            
            <Text style={styles.modalLabel}>Forma de Pagamento:</Text>
            
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.key && styles.paymentOptionSelected
                ]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Ionicons name={method.icon} size={20} color={paymentMethod === method.key ? '#2196F3' : '#666'} />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === method.key && styles.paymentOptionTextSelected
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={finalizeSale}
              >
                <Text style={styles.confirmButtonText}>Finalizar</Text>
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
    backgroundColor: '#2196F3',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
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
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 2,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  cartSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cartButton: {
    padding: 4,
  },
  cartItemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 60,
    textAlign: 'right',
  },
  finalizeButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  paymentOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  paymentOptionTextSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SaleScreen;