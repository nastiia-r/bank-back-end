const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");

router.get("/", clientController.getAllClients);
router.post("/", clientController.createClient);
router.get("/search", clientController.searchClients);
router.get("/:id", clientController.getClientById);
router.get("/:clientId/loans/:loanId", clientController.getLoanById);
router.post("/:id/loans", clientController.addLoanToClient);
router.post(
  "/:clientId/loans/:loanId/payments",
  clientController.addPaymentToLoan
);
router.patch(
  "/:clientId/loans/:loanId/visibility",
  clientController.changeVisible
);

module.exports = router;
