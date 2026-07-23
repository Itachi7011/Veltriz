const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    items: [
      {
        itemKey: { type: String, required: true },
        quantity: { type: Number, required: true, default: 0, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inventory', InventorySchema);
