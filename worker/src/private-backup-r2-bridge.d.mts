export interface PrivateBackupR2BridgeWorker {
  fetch(request: Request, env: Record<string, unknown>): Promise<Response>;
}

declare const worker: PrivateBackupR2BridgeWorker;

export default worker;
