import { WithId } from "mongodb";

export interface BaseDocument {
  _id: any;
  [key: string]: any;
}

export type TransformedDocument<T extends BaseDocument> = Omit<T, "_id"> & {
  id: any;
};

/**
 * Recursively transforms MongoDB documents by converting _id to id
 * Handles both top-level and nested documents
 */
export function transformMongoDocument<T extends BaseDocument>(
  doc: WithId<T> | null
): TransformedDocument<T> | null {
  if (!doc) return null;

  const { _id, ...rest } = doc as T;
  let transformed = { ...rest, id: _id } as any;

  // Recursively transform nested objects and arrays
  for (const key in transformed) {
    if (transformed[key] && typeof transformed[key] === "object") {
      if (Array.isArray(transformed[key])) {
        // Handle arrays of documents
        transformed[key] = transformed[key].map((item: any) =>
          item && typeof item === "object" && "_id" in item
            ? transformMongoDocument(item)
            : item
        );
      } else if ("_id" in transformed[key]) {
        // Handle nested documents
        (transformed as any)[key] = transformMongoDocument(transformed[key]);
      }
    }
  }

  return transformed as TransformedDocument<T>;
}

export function transformMongoDocuments<T extends BaseDocument>(
  docs: WithId<T>[]
): TransformedDocument<T>[] {
  return docs
    .map((doc) => transformMongoDocument(doc))
    .filter((doc): doc is TransformedDocument<T> => doc !== null);
}
