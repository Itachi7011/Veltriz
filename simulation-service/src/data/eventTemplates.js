/**
 * Each template produces a title/description/news body given an item name.
 * `multiplierRange` is used only by the RANDOM event generator (admin-
 * triggered events specify their own exact multiplier in the request).
 */
const EVENT_TEMPLATES = {
  shortage: {
    multiplierRange: [1.15, 1.5],
    build: (itemName) => ({
      title: `${itemName} Shortage`,
      description: `Supply chains for ${itemName} have been disrupted, driving prices up sharply.`,
      newsHeadline: `${itemName} prices spike amid supply shortage`,
      newsBody: `Reports of a ${itemName.toLowerCase()} shortage are rattling the market this week, with traders bracing for higher prices across the city. Economists expect the disruption to ease once new supply routes open.`,
    }),
  },
  boom: {
    multiplierRange: [1.1, 1.35],
    build: (itemName) => ({
      title: `${itemName} Demand Boom`,
      description: `A surge in demand for ${itemName} is pushing its price higher.`,
      newsHeadline: `${itemName} demand surges across Veltriz`,
      newsBody: `Citizens are buying up ${itemName.toLowerCase()} faster than markets can restock, and prices are climbing in response. Analysts say the trend could continue if demand stays strong.`,
    }),
  },
  crisis: {
    multiplierRange: [0.55, 0.8],
    build: (itemName) => ({
      title: `${itemName} Market Crisis`,
      description: `Confidence in ${itemName} has collapsed, sending prices sharply lower.`,
      newsHeadline: `${itemName} prices crash amid market crisis`,
      newsBody: `A wave of selling has hit the ${itemName.toLowerCase()} market, wiping out recent gains. Officials say they are monitoring the situation closely as prices continue to slide.`,
    }),
  },
  bonus: {
    multiplierRange: [0.7, 0.9],
    build: (itemName) => ({
      title: `${itemName} Price Relief`,
      description: `An oversupply of ${itemName} is bringing prices down for citizens.`,
      newsHeadline: `${itemName} gets cheaper as supply improves`,
      newsBody: `Good news for shoppers: ${itemName.toLowerCase()} has become noticeably cheaper this week as supply outpaces demand. Analysts don't expect the discount to last long.`,
    }),
  },
};

const randomMultiplier = (type) => {
  const [min, max] = EVENT_TEMPLATES[type].multiplierRange;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
};

const EVENT_TYPES = Object.keys(EVENT_TEMPLATES);

module.exports = { EVENT_TEMPLATES, EVENT_TYPES, randomMultiplier };
