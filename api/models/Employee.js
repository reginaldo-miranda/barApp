import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  endereco: { type: String },
  bairro: { type: String },
  telefone: { type: String },
  salario: { type: Number },
  dataAdmissao: { type: Date },
  ativo: { type: Boolean, default: true },
  dataInclusao: { type: Date, default: Date.now }
});

export default mongoose.model("Employee", EmployeeSchema);