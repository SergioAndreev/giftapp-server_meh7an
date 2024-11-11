export const transactionSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "giftId",
      "senderId",
      "receiverId",
      "status",
      "createdAt",
      "updatedAt",
      "paymentId",
      "price",
      "currency",
    ],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "Document identifier",
      },
      giftId: {
        bsonType: "objectId",
        description:
          "Reference to the gift being transacted - required ObjectId",
      },
      senderId: {
        bsonType: "number",
        description:
          "Reference to the User document of the sender - required ObjectId",
      },
      receiverId: {
        bsonType: "number",
        description:
          "Reference to the User document of the receiver - required ObjectId",
      },
      status: {
        bsonType: "string",
        description: "Current status of the transaction - required string",
        enum: ["PENDING", "COMPLETED"],
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp of transaction creation - required date",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp of last update - required date",
      },
      paymentId: {
        bsonType: "number",
        description: "Reference to the payment record from Crypto Pay",
      },
      price: {
        bsonType: "number",
        description: "Price of the transaction - required number",
        minimum: 0,
      },
      currency: {
        bsonType: "string",
        description: "Currency code - required string",
        enum: ["USDT", "TON", "ETH", "BTC", "USD"],
      },
    },
    additionalProperties: false,
  },
};
