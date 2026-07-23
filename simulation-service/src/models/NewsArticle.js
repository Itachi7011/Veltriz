const mongoose = require('mongoose');

const NewsArticleSchema = new mongoose.Schema(
  {
    headline: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String, enum: ['economy', 'world'], default: 'economy' },
    relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'WorldEvent' },
  },
  { timestamps: true }
);

NewsArticleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NewsArticle', NewsArticleSchema);
