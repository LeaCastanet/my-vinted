const express = require("express");
const cors = require("cors");
// const router = require("./user");
const stripe = require("stripe")(process.env.STRIPE_API_SECRET);

const isAuthenticated = require("../middlewares/isAuthenticated");
const router = express.Router();

router.post("/payment", isAuthenticated, async (req, res) => {
  console.log(req.body);
  try {
    const stripeToken = req.body.stripeToken;
    const response = await stripe.charges.create({
      amount: (req.body.amount * 100).toFixed(2),
      currency: "eur",
      description: `Paiement sur vinted pour: ${req.body.title}`,
      source: stripeToken,
    });
    console.log(response);

    res.json(response.status);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
