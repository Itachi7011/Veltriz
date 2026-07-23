const { z } = require('zod');
const { EVENT_TYPES } = require('../data/eventTemplates');

const triggerEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  targetItemKey: z.string().min(1),
  multiplier: z.coerce.number().positive().max(10).optional(), // if omitted, a sensible random value for the type is used
  durationMinutes: z.coerce.number().int().positive().max(1440).default(60),
  title: z.string().optional(),
  description: z.string().optional(),
});

module.exports = { triggerEventSchema };
