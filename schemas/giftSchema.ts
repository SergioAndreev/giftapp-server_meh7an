export const giftSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "name",
      "slug",
      "price",
      "currency",
      "totalAvailable",
      "sold",
      "color",
      "patternID",
      "lottieID",
    ],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "Document identifier",
      },
      name: {
        bsonType: "string",
        description: "Name of the gift - required string",
      },
      slug: {
        bsonType: "string",
        description: "URL-friendly identifier - required string",
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", // Allows hyphens only
      },
      price: {
        bsonType: "number",
        description: "Price of the gift - required number",
        minimum: 0,
      },
      currency: {
        bsonType: "string",
        description: "Currency code - required string",
        enum: ["USDT", "TON", "ETH", "BTC", "USD"],
      },
      totalAvailable: {
        bsonType: "number",
        description: "Total available quantity - required number",
        minimum: 0,
      },
      sold: {
        bsonType: "number",
        description: "Number of items sold - required number",
        minimum: 0,
      },
      color: {
        bsonType: "string",
        description: "Color code - required string",
        pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
      },
      patternID: {
        bsonType: "string",
        description: "Pattern identifier - required string",
      },
      lottieID: {
        bsonType: "string",
        description: "Pattern identifier - required string",
      },
    },
    additionalProperties: false,
  },
};
