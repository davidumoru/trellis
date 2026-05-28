import { MongoClient } from "mongodb";

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

function createClient(): MongoClient {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri!);
    }
    return global._mongoClient;
  }
  return new MongoClient(uri!);
}

export const mongoClient: MongoClient = createClient();

let clientPromise: Promise<MongoClient>;
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = mongoClient.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = mongoClient.connect();
}

export default clientPromise;
