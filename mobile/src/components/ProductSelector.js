import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';

const ProductSelector = ({ 
  visible, 
  onClose, 
  onProductSelect, 
  title = 'Selecionar Produto',
  showQuantitySelector = true 
}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const categories = [
    { key: 'todos', label: 'Todos', icon: '🍽️' },
    { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas', icon: '🍺' },
    { key: 'bebidas-nao-alcoolicas', label: 'Bebidas', icon: '🥤' },
    { key: 'petiscos', label: 'Petiscos', icon: '🍿' },
    { key: 'pratos-principais', label: 'Pratos', icon: '🍖' },
    { key: 'sobremesas', label: 'Sobremesas', icon: '🍰' },
    { key: 'outros', label: 'Outros', icon: '📦' },
  ];

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  useEffect(() => {
    filterProducts();
  }, [products, searchText, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      const activeProducts = response.data.filter(product => product.ativo && product.disponivel);
      setProducts(activeProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filtrar por categoria
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(product => product.categoria === selectedCategory);
    }

    // Filtrar por texto de busca
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(product => 
        product.nome.toLowerCase().includes(searchLower) ||
        (product.descricao && product.descricao.toLowerCase().includes(searchLower))
      );
    }

    setFilteredProducts(filtered);
  };

  const handleProductPress = (product) => {
    if (showQuantitySelector) {
      setSelectedProduct(product);
      setQuantity(1);
    } else {
      onProductSelect(product, 1);
      handleClose();
    }
  };

  const handleConfirmSelection = () => {
    if (selectedProduct && quantity > 0) {
      onProductSelect(selectedProduct, quantity);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setSearchText('');
    setSelectedCategory('todos');
    onClose();
  };

  const adjustQuantity = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.key && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(item.key)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        selectedCategory === item.key && styles.categoryTextActive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
    >
      <View style={styles.productImageContainer}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#ccc" />
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.nome}</Text>
        {item.descricao && (
          <Text style={styles.productDescription} numberOfLines={1}>
            {item.descricao}
          </Text>
        )}
        <Text style={styles.productPrice}>
          R$ {item.precoVenda.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Categories */}
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
        />

        {/* Products */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          style={styles.productsList}
          contentContainerStyle={styles.productsContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {loading ? 'Carregando produtos...' : 'Nenhum produto encontrado'}
              </Text>
            </View>
          }
        />

        {/* Quantity Selector Modal */}
        {selectedProduct && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedProduct(null)}
          >
            <View style={styles.quantityModalOverlay}>
              <View style={styles.quantityModal}>
                <Text style={styles.quantityModalTitle}>Adicionar Produto</Text>
                
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductName}>{selectedProduct.nome}</Text>
                  <Text style={styles.selectedProductPrice}>
                    R$ {selectedProduct.precoVenda.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantidade:</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => adjustQuantity(-1)}
                    >
                      <Ionicons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => adjustQuantity(1)}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.totalPrice}>
                  Total: R$ {(selectedProduct.precoVenda * quantity).toFixed(2)}
                </Text>

                <View style={styles.quantityModalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setSelectedProduct(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirmSelection}
                  >
                    <Text style={styles.confirmButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categoriesList: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productsList: {
    flex: 1,
  },
  productsContent: {
    padding: 16,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
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
    textAlign: 'center',
  },
  quantityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  quantityModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectedProductInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: '#2196F3',
  },
  quantityContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  quantityModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProductSelector;