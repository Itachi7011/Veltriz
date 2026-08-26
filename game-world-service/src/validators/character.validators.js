const { z } = require('zod');
const { COUNTRIES } = require('../data/worldData');

const validCountryCodes = COUNTRIES.map((c) => c.code);
const validCityCodes = COUNTRIES.flatMap((c) => c.cities.map((city) => city.code));

const createCharacterSchema = z.object({
  displayName: z.string().min(2).max(40),
  country: z.enum(validCountryCodes),
  city: z.enum(validCityCodes),
  background: z.enum(['poor', 'middle', 'rich']),
  appearance: z
    .object({
      gender: z.enum(['male', 'female']).optional(),
      skinTone: z.string().optional(),
      outfitColor: z.string().optional(),
      hairColor: z.string().optional(),
      hairStyle: z.enum(['short', 'buzz', 'long', 'ponytail', 'bald']).optional(),
      pantsColor: z.string().optional(),
      shoeColor: z.string().optional(),
    })
    .optional(),
});

const savePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  mapId: z.string().optional(),
});

module.exports = { createCharacterSchema, savePositionSchema };
