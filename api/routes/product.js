import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// Rota para criar produto
router.post("/create", async (req, res) => {
  try {
    const { nome, descricao, precoCusto, precoVenda, grupo, unidade, ativo, dadosFiscais, quantidade } = req.body;

    const novoProduto = new Product({
      nome,
      descricao,
      precoCusto,
      precoVenda,
      grupo,
      unidade,
      ativo: ativo !== undefined ? ativo : true,
      dadosFiscais,
      quantidade: quantidade || 0
    });

    await novoProduto.save();
    res.status(201).json({ message: "Produto cadastrado com sucesso", product: novoProduto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// Rota para listar todos os produtos
router.get("/list", async (req, res) => {
  try {
    const products = await Product.find().sort({ dataInclusao: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

// Rota para buscar produto por ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// Rota para atualizar produto
router.put("/update/:id", async (req, res) => {
  try {
    const { nome, descricao, precoCusto, precoVenda, categoria, grupo, unidade, ativo, dadosFiscais, quantidade } = req.body;
    
    const produtoAtualizado = await Product.findByIdAndUpdate(
      req.params.id,
      { nome, descricao, precoCusto, precoVenda, categoria, grupo, unidade, ativo, dadosFiscais, quantidade },
      { new: true }
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto atualizado com sucesso", product: produtoAtualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// Rota para deletar produto
router.delete("/delete/:id", async (req, res) => {
  try {
    const produtoDeletado = await Product.findByIdAndDelete(req.params.id);
    
    if (!produtoDeletado) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});

export default router;