import { FileTreeStore } from "./file-store";
import { KvTreeStore, type KvCredentials } from "./kv-store";
import { MemoryTreeStore } from "./memory-store";
import type { IdempotencyEntry, StoredTreeRecord, TreeStore } from "./types";

export { FileTreeStore } from "./file-store";
export { KvTreeStore } from "./kv-store";
export { MemoryTreeStore } from "./memory-store";
export * from "./types";

export interface StoreAdapters {
  kv: KvTreeStore;
  file: FileTreeStore;
  memory: MemoryTreeStore;
}

export function createStoreAdapters(params: {
  getKvEnv: () => KvCredentials | null;
  getFilePath: () => string;
  memoryTrees: Map<string, StoredTreeRecord>;
  idempotency: Map<string, Map<string, IdempotencyEntry>>;
  markFsUnavailable: () => void;
}): StoreAdapters {
  return {
    kv: new KvTreeStore(params.getKvEnv),
    file: new FileTreeStore(
      params.getFilePath,
      params.memoryTrees,
      params.idempotency,
      params.markFsUnavailable,
    ),
    memory: new MemoryTreeStore(params.memoryTrees, params.idempotency),
  };
}

export function selectTreeStore(
  mode: "kv" | "file" | "memory",
  adapters: StoreAdapters,
): TreeStore {
  return adapters[mode];
}
