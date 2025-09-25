// primeiro server funcionando

/*import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Rota raiz
app.get("/", (req, res) => {
  res.send("Servidor Express está rodando 🚀");
});

// Rota de teste
app.get("/api/hello", (req, res) => {
  res.json({ message: "API funcionando 🚀" });
});


const PORT = 4000; // usei 4000 só pra garantir que não tem conflito
app.listen(PORT, () => {
  console.log(`✅ API rodando em: http://localhost:${PORT}`);
});
*/

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customer.js";
import productRoutes from "./routes/product.js";
import productGroupRoutes from "./routes/productGroup.js";
import employeeRoutes from "./routes/employee.js";
import saleRoutes from "./routes/sale.js";
import mesaRoutes from "./routes/mesa.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar MongoDB:", err));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/product-group", productGroupRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/mesa", mesaRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API rodando em: http://localhost:${PORT}`));
