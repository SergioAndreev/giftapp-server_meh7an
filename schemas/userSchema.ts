export const userSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "telegramId",
      "firstName",
      "isPremium",
      "gifts",
      "totalGiftsCount",
      "transactions",
      "pendingGifts",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "Document identifier",
      },
      telegramId: {
        bsonType: "number",
        description: "Telegram user ID - required number",
      },
      username: {
        bsonType: ["string", "null"],
        description: "Telegram username - optional string",
      },
      firstName: {
        bsonType: "string",
        description: "User's first name - required string",
      },
      lastName: {
        bsonType: "string",
        description: "User's last name - optional string",
      },
      isPremium: {
        bsonType: "bool",
        description: "Premium status flag - required boolean",
      },
      gifts: {
        bsonType: "array",
        description: "Array of the transaction ObjectIds for each gift",
        items: {
          bsonType: "objectId",
          description: "Reference to the transaction of a gift document",
        },
      },
      pendingGifts: {
        bsonType: "array",
        description: "Array of pending gift ObjectIds",
        items: {
          bsonType: "objectId",
          description: "Reference to the pending gift document",
        },
      },
      transactions: {
        bsonType: "array",
        description:
          "Array of transaction IDs where user is sender or receiver",
        items: {
          bsonType: "objectId",
          description: "Reference to all transaction documents",
        },
      },
      totalGiftsCount: {
        bsonType: "number",
        description:
          "Total number of gifts - required number for efficient sorting",
        minimum: 0,
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp of user creation - required date",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp of last update - required date",
      },
    },
    additionalProperties: false,
  },
};
