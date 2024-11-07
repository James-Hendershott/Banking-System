var express = require('express');
var router = express.Router();

// Mock customer data
const mockCustomers = [
    { id: 'cust1', checkingBalance: 1500.00, savingsBalance: 2500.00 },
    { id: 'cust2', checkingBalance: 3000.00, savingsBalance: 1500.00 }
];
// Mock function to get transaction data for an account
function getTransactionData(accountType) {
  return [
    { date: '2024-11-01', type: 'Deposit', amount: 500, memo: 'Salary' },
    { date: '2024-10-30', type: 'Withdrawal', amount: 200, memo: 'Groceries' },
  ];
}

// GET employee account page
router.get('/account', function(req, res) {
  const employeeData = {
    checkingBalance: 1000.00,
    savingsBalance: 2000.00,
    recentTransactions: getTransactionData("Overview") // Summary of recent transactions
  };
  res.render('employeeAccount', { employeeData });
});

// GET transaction history for employee's Checking account
router.get('/account/checking', function(req, res) {
  const transactionData = getTransactionData("Checking");
  res.render('transaction', { accountType: "Checking", transactionHistory: transactionData });
});

// GET transaction history for employee's Savings account
router.get('/account/savings', function(req, res) {
  const transactionData = getTransactionData("Savings");
  res.render('transaction', { accountType: "Savings", transactionHistory: transactionData });
});

// POST search customer account (for employee to view customer details)
router.post('/manage-customer', function(req, res) {
  const customerId = req.body.customerId;

  // Find the customer in the mock database
    const customer = mockCustomers.find(c => c.id === customerId);

    if (customer) {
        const customerData = {
            customerId,
            checkingBalance: customer.checkingBalance,
            savingsBalance: customer.savingsBalance,
            recentTransactions: getTransactionData("Overview") // Summary of customer transactions
        };
        res.render('employeeCustomerView', { customerData });
    } else {
        res.render('employeeAccount', { error: 'Customer not found', employeeData: {} }); // Display error
    }
});

module.exports = router;


