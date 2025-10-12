import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService, comandaService } from '../services/api';
interface Categoria {
  id: string;
  nome: string;
  icon: string;
}

interface ProdutoExtendido {
  _id: string;
  nome: string;
  descricao: string;
  precoVenda: number;
  categoria: string;
  ativo: boolean;
  disponivel: boolean;
  grupo?: string;
}

interface CartItem {
  _id: string;
  produto: {
    _id: string;
    nome: string;
    preco: number;
  };
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  observacoes?: string;
}

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
  funcionario: {
    _id: string;
    nome: string;
  };
  status: 'aberta' | 'fechada' | 'cancelada';
  total: number;
  itens: CartItem[];
  observacoes?: string;
  tipoVenda: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  comanda: Comanda | null;
  onUpdateComanda: () => void;
}

export default function ProdutosComandaModal({ visible, onClose, comanda, onUpdateComanda }: Props) {
  const [produtos, setProdutos] = useState<ProdutoExtendido[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 'todos', nome: 'Todos', icon: '🍽️' }
  ]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [buscarProduto, setBuscarProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && comanda) {
      loadProdutos();
    }
  }, [visible, comanda]);

  const loadProdutos = async () => {
    try {
      const response = await productService.getAll();
      const produtosAtivos = response.data?.filter((prod: ProdutoExtendido) => prod.ativo) || [];
      setProdutos(produtosAtivos);
      
      // Extrair grupos únicos dos produtos para criar categorias dinâmicas
      const grupos = produtosAtivos
        .map((produto: ProdutoExtendido) => produto.grupo)
        .filter((grupo: string | undefined): grupo is string => grupo !== undefined && grupo.trim() !== '');
      const gruposUnicos: string[] = Array.from(new Set(grupos));
      
      // Mapear grupos para categorias com ícones
      const iconesPorGrupo: { [key: string]: string } = {
        'bebidas': '🥤',
        'comidas': '🍖',
        'limpeza': '🧽',
        'sobremesas': '🍰',
        'petiscos': '🍿',
        'default': '📦'
      };
      
      const novasCategorias: Categoria[] = [
        { id: 'todos', nome: 'Todos', icon: '🍽️' },
        ...gruposUnicos.map((grupo: string) => ({
          id: grupo,
          nome: grupo.charAt(0).toUpperCase() + grupo.slice(1),
          icon: iconesPorGrupo[grupo.toLowerCase()] || iconesPorGrupo.default
        }))
      ];
      
      setCategorias(novasCategorias);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const adicionarItem = async (produto: ProdutoExtendido) => {
    if (!comanda || !produto?._id) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    // Adicionar produto ao loading
    setLoadingItems(prev => new Set(prev).add(produto._id));
    
    const itemData = {
      produto: produto,
      quantidade: quantidade || 1
    };
    
    try {
      await comandaService.addItem(comanda._id, itemData);
      Alert.alert('Sucesso', `${produto.nome} adicionado à comanda!`);
      onUpdateComanda();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    } finally {
      // Remover produto do loading
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(produto._id);
        return newSet;
      });
    }
  };

  const removerItem = async (produto: ProdutoExtendido) => {
    if (!comanda || !produto?._id) return;

    // Adicionar produto ao loading
    setLoadingItems(prev => new Set(prev).add(produto._id));
    
    try {
      await comandaService.removeItem(comanda._id, produto._id);
      Alert.alert('Sucesso', `${produto.nome} removido da comanda!`);
      onUpdateComanda();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      Alert.alert('Erro', 'Não foi possível remover o item');
    } finally {
      // Remover produto do loading
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(produto._id);
        return newSet;
      });
    }
  };

  const produtosFiltrados = produtos.filter((produto: ProdutoExtendido) => {
    const matchCategoria = categoriaSelecionada === 'todos' || produto.grupo === categoriaSelecionada;
    const matchBusca = produto.nome.toLowerCase().includes(buscarProduto.toLowerCase());
    return matchCategoria && matchBusca;
  });

  const renderProduto = ({ item: produto }: { item: ProdutoExtendido }) => {
    // Calcular quantidade já adicionada na comanda
    const itemNaComanda = comanda?.itens?.find((item: CartItem) => item.produto._id === produto._id);
    const quantidadeNaComanda = itemNaComanda ? itemNaComanda.quantidade : 0;
    const isLoading = loadingItems.has(produto._id);
    
    return (
      <View style={[styles.produtoCard, quantidadeNaComanda > 0 && styles.produtoAdicionado]}>
        <View style={styles.produtoInfo}>
          <Text style={styles.produtoNome}>{produto.nome}</Text>
          <Text style={styles.produtoPreco}>R$ {produto.precoVenda?.toFixed(2)}</Text>
        </View>
        
        <View style={styles.produtoControles}>
          <TouchableOpacity 
            style={[styles.btnControle, (quantidadeNaComanda === 0 || isLoading) && styles.btnControleDisabled]}
            onPress={() => removerItem(produto)}
            disabled={quantidadeNaComanda === 0 || isLoading}
          >
            <Text style={styles.btnControleText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantidadeDisplay}>{quantidadeNaComanda}</Text>
          
          <TouchableOpacity 
            style={[styles.btnControle, isLoading && styles.btnControleDisabled]}
            onPress={() => {
              console.log('BOTÃO CLICADO! Produto:', produto.nome);
              Alert.alert('Teste', `Clicou no produto: ${produto.nome}`);
              adicionarItem(produto);
            }}
            disabled={isLoading}
          >
            <Text style={styles.btnControleText}>
              {isLoading ? '...' : `+${quantidade > 1 ? quantidade : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
        
        {quantidadeNaComanda > 0 && (
          <Text style={styles.produtoTotal}>
            Total: R$ {(quantidadeNaComanda * produto.precoVenda).toFixed(2)}
          </Text>
        )}
      </View>
    );
  };

  if (!comanda) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.comandaInfo}>
              <Text style={styles.modalTitle}>📋 Produtos da Comanda</Text>
              <Text style={styles.comandaDetalhes}>
                👨‍💼 Funcionário: {comanda.funcionario?.nome?.toUpperCase() || 'NÃO DEFINIDO'}
              </Text>
              <Text style={styles.comandaTotal}>
                Total: R$ {comanda.total?.toFixed(2) || '0,00'}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnFechar} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Filtros de Categoria */}
            <View style={styles.categoriasContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categorias.map((categoria: Categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoriaBtn,
                      categoriaSelecionada === categoria.id && styles.categoriaBtnActive
                    ]}
                    onPress={() => setCategoriaSelecionada(categoria.id)}
                  >
                    <Text style={styles.categoriaIcon}>{categoria.icon}</Text>
                    <Text style={[
                      styles.categoriaText,
                      categoriaSelecionada === categoria.id && styles.categoriaTextActive
                    ]}>
                      {categoria.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Busca de Produtos */}
            <View style={styles.buscaContainer}>
              <TextInput
                style={styles.buscaInput}
                placeholder="🔍 Buscar produto..."
                value={buscarProduto}
                onChangeText={setBuscarProduto}
              />
              <View style={styles.quantidadeControl}>
                <Text style={styles.quantidadeLabel}>Qtd:</Text>
                <TextInput
                  style={styles.quantidadeInput}
                  value={quantidade.toString()}
                  onChangeText={(text) => setQuantidade(parseInt(text) || 1)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Lista de Produtos */}
            <ScrollView style={styles.produtosList}>
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((produto: ProdutoExtendido) => {
                  // Calcular quantidade já adicionada na comanda
                  const itemNaComanda = comanda?.itens?.find((item: CartItem) => item.produto._id === produto._id);
                  const quantidadeNaComanda = itemNaComanda ? itemNaComanda.quantidade : 0;
                  const isLoading = loadingItems.has(produto._id);
                  
                  return (
                    <View key={produto._id} style={[styles.produtoCard, quantidadeNaComanda > 0 && styles.produtoAdicionado]}>
                      <View style={styles.produtoInfo}>
                        <Text style={styles.produtoNome}>{produto.nome}</Text>
                        <Text style={styles.produtoPreco}>R$ {produto.precoVenda?.toFixed(2)}</Text>
                      </View>
                      
                      <View style={styles.produtoControles}>
                        <TouchableOpacity 
                          style={[styles.btnControle, (quantidadeNaComanda === 0 || isLoading) && styles.btnControleDisabled]}
                          onPress={() => removerItem(produto)}
                          disabled={quantidadeNaComanda === 0 || isLoading}
                        >
                          <Text style={styles.btnControleText}>-</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.quantidadeDisplay}>{quantidadeNaComanda}</Text>
                        
                        <TouchableOpacity 
                          style={[styles.btnControle, isLoading && styles.btnControleDisabled]}
                          onPress={() => {
                            console.log('BOTÃO CLICADO! Produto:', produto.nome);
                            Alert.alert('Teste', `Clicou no produto: ${produto.nome}`);
                            adicionarItem(produto);
                          }}
                          disabled={isLoading}
                        >
                          <Text style={styles.btnControleText}>
                            {isLoading ? '...' : `+${quantidade > 1 ? quantidade : ''}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {quantidadeNaComanda > 0 && (
                        <Text style={styles.produtoTotal}>
                          Total: R$ {(quantidadeNaComanda * produto.precoVenda).toFixed(2)}
                        </Text>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.semProdutos}>Nenhum produto encontrado</Text>
              )}
            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#27ae60',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comandaInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  comandaDetalhes: {
    fontSize: 14,
    color: 'white',
    marginBottom: 2,
  },
  comandaTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  btnFechar: {
    padding: 5,
  },
  modalBody: {
    flex: 1,
    padding: 15,
  },
  categoriasContainer: {
    marginBottom: 15,
  },
  categoriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoriaBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoriaIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  categoriaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoriaTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  buscaContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  buscaInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
  },
  quantidadeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantidadeLabel: {
    fontSize: 14,
    marginRight: 5,
    color: '#666',
  },
  quantidadeInput: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  produtosList: {
    flex: 1,
  },
  produtoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  produtoAdicionado: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  produtoPreco: {
    fontSize: 14,
    color: '#666',
  },
  produtoControles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  btnControle: {
    width: 35,
    height: 35,
    borderRadius: 17,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  btnControleDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  btnControleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantidadeDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  produtoTotal: {
    position: 'absolute',
    bottom: 2,
    right: 12,
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  semProdutos: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
});
