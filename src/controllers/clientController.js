const Client = require("../models/Client");

const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getLoanById = (req, res) => {
  const { clientId, loanId } = req.params;

  Client.findById(clientId)
    .then((client) => {
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const loan = client.loans.id(loanId);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }

      res.status(200).json(loan);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    });
};

const createClient = async (req, res) => {
  const client = new Client(req.body);
  try {
    const newClient = await client.save();
    res.status(201).json(newClient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const addLoanToClient = async (req, res) => {
  const { id } = req.params;
  const newLoan = req.body;

  try {
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    client.loans.push(newLoan);
    await client.save();
    res.status(201).json(client.loans);
  } catch (error) {
    console.error("Error adding loan to client:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addPaymentToLoan = async (req, res) => {
  const { clientId, loanId } = req.params;
  const newPayment = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const loan = await client.loans.id(loanId);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    if (!newPayment.amount || typeof newPayment.amount !== "number") {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const today = new Date();
    let penalty = 0;
    const recommendedPayment = calculateRecommendedPayment(loan);

    if (loan.loanType.conditions === "Платіж щомісяця") {
      let lastPaymentDate =
        loan.payments.length > 0
          ? new Date(loan.payments[loan.payments.length - 1].date)
          : new Date(loan.issueDate);
      let daysOverdue = Math.floor(
        (today - lastPaymentDate) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue > 30) {
        penalty += recommendedPayment * 0.01 * daysOverdue;
        loan.penalties.push({
          date: today,
          amount: penalty,
          reason: "Оплачено невчасно",
        });
      }

      if (newPayment.amount < recommendedPayment) {
        let additionalPenalty = Number(
          ((recommendedPayment - newPayment.amount) * 0.05).toFixed(2)
        );
        penalty += additionalPenalty;
        loan.penalties.push({
          date: today,
          amount: additionalPenalty,
          reason: "Недостатньо коштів",
        });
      }
    }

    if (loan.loanType.conditions === "Один платіж") {
      let loanEndDate = new Date(loan.issueDate);
      loanEndDate.setMonth(loanEndDate.getMonth() + loan.loanType.term);

      let daysOverdue = Math.floor(
        (today - loanEndDate) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue > 0 && loan.payable > 0) {
        penalty += Number((recommendedPayment * 0.01 * daysOverdue).toFixed(2));
        loan.penalties.push({
          date: today,
          amount: penalty,
          reason: "Оплачено невчасно",
        });
      }

      if (newPayment.amount < recommendedPayment) {
        let additionalPenalty = (recommendedPayment - newPayment.amount) * 0.05;
        penalty += additionalPenalty;
        loan.penalties.push({
          date: today,
          amount: additionalPenalty,
          reason: "Недостатньо коштів",
        });
      }
    }

    loan.payments.push(newPayment);
    loan.payable -= newPayment.amount + penalty;

    if (loan.payable < 0) {
      loan.payable = 0;
    }

    if (loan.payable === 0) {
      loan.status = "Виплачено";
    }

    await client.save();

    res.status(201).json(loan.payments);
  } catch (error) {
    console.error("Error adding payment to loan", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changeVisible = async (req, res) => {
  const { clientId, loanId } = req.params;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const loan = client.loans.id(loanId);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    loan.visible = false;
    await client.save();
    res.status(200).json({ message: "Visibility updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update visibility" });
  }
};

const calculateRecommendedPayment = (loan) => {
  if (loan?.loanType?.conditions === "Платіж щомісяця") {
    return Number((loan.payable / loan.loanType.term).toFixed(2));
  } else if (loan?.loanType?.conditions === "Один платіж") {
    return Number(loan.payable.toFixed(2));
  }
  return 0;
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const searchClients = async (req, res) => {
  try {
    const filters = {
      ownershipType: req.query.ownershipType || "",
      loanTypeName: req.query.loanTypeName || "",
      interestRate: req.query.interestRate || "",
      term: req.query.term || "",
      clientName: req.query.clientName || "",
    };

    const searchCriteria = {};

    if (filters.ownershipType) {
      searchCriteria.ownershipType = { $in: filters.ownershipType.split(",") };
    }
    if (filters.loanTypeName) {
      searchCriteria["loans.loanType.loanTypeName"] = {
        $in: filters.loanTypeName.split(","),
      };
    }
    if (filters.interestRate) {
      const parsedInterestRate = parseFloat(filters.interestRate);
      if (isNaN(parsedInterestRate)) {
        return res.status(400).json({ message: "Invalid interestRate" });
      }
      searchCriteria["loans.loanType.interestRate"] = parsedInterestRate;
    }
    if (filters.term) {
      const parsedTerm = parseInt(filters.term, 10);
      if (isNaN(parsedTerm)) {
        return res.status(400).json({ message: "Invalid term" });
      }
      searchCriteria["loans.loanType.term"] = parsedTerm;
    }
    if (filters.clientName) {
      searchCriteria.clientName = { $regex: filters.clientName, $options: "i" };
    }

    const clients = await Client.find(searchCriteria);
    res.json(clients);
  } catch (err) {
    console.error("Error in searchClients:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllClients,
  createClient,
  getClientById,
  searchClients,
  addLoanToClient,
  addPaymentToLoan,
  getLoanById,
  changeVisible,
};
