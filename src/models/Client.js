const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema({
  loanType: {
    conditions: {
      type: String,
      enum: ["Платіж щомісяця", "Один платіж"],
      required: true,
    },
    interestRate: Number,
    term: Number,
    loanTypeName: {
      type: String,
      enum: [
        "Фінансування малого бізнесу",
        "Довгострокові кредит",
        "Кредити на обладнання",
        "Державні бізнес-кредит",
        "Мікрокредит",
      ],
      required: true,
    },
  },
  amount: Number,
  issueDate: Date,
  dueDate: Date,
  actualReturnDate: Date,
  status: {
    type: String,
    enum: ["Виплачено", "Активний"],
    default: "Активний",
  },
  payable: Number,
  totalLoan: Number,
  visible: Boolean,
  payments: [{ date: Date, amount: Number }],
  penalties: [{ date: Date, amount: Number, reason: String }],
});

const ClientSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  ownershipType: {
    type: String,
    enum: [
      "Товариство з обмеженою відповідальністю",
      "Акціонерне товариство",
      "Державне підприємство",
      "Фізична особа-підприємець",
    ],
    required: true,
  },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  contactPerson: { type: String, required: true },
  loans: [LoanSchema],
});

module.exports = mongoose.model("Client", ClientSchema);
