export const adminSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "telegramID", "addedBy", "addedAt", "isActive", "role"],
    properties: {
      _id: {
        bsonType: "objectId",
        description: "Document identifier",
      },
      name: {
        bsonType: "string",
        description: "Admin's name - required string",
      },
      telegramID: {
        bsonType: "number",
        description: "Unique Telegram user ID - required number",
      },
      addedBy: {
        bsonType: "number",
        description:
          "Telegram ID of the admin who added this admin - required number",
      },
      addedAt: {
        bsonType: "date",
        description: "Timestamp when the admin was added - required date",
      },
      isActive: {
        bsonType: "bool",
        description: "Whether the admin account is active - required boolean",
      },
      role: {
        bsonType: "string",
        description: "Admin role level - required string",
        enum: ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
      },
    },
    additionalProperties: false,
  },
};

// Index definition for unique telegramID
export const adminIndexes = [
  {
    key: { telegramID: 1 },
    name: "telegramID_unique",
    unique: true,
  },
];
