import {
  createPublicClient,
  http,
  keccak256,
  type Hash,
  type Address,
} from "viem";
import { monad } from "@/lib/monad";

/**
 * Graduation gate: prove a student deployed a contract to Monad mainnet
 * from a wallet they control.
 *
 * Every check here is a deterministic read against chain 143. No indexer, no
 * explorer API key, no judgement call — a reviewer can reproduce any verdict
 * with `cast tx` and `cast code`. The subjective half of graduation (can the
 * student explain what they built?) stays with a human; this function only
 * establishes that the deploy is real, theirs, and not a copy.
 */

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

/**
 * Floor for runtime bytecode size. An empty `contract A {}` compiles to well
 * under 100 bytes and an EIP-1167 minimal proxy is 45, so this rejects deploys
 * that are technically transactions but not technically programs. A student's
 * first real contract — a counter, a token, a registry — clears this easily.
 */
export const MIN_RUNTIME_BYTES = 200;

export type DeployRejection =
  | "tx-not-found"
  | "tx-reverted"
  | "not-a-deploy"
  | "wrong-sender"
  | "no-code"
  | "too-small";

export interface DeployProof {
  readonly contractAddress: Address;
  /** keccak of the runtime bytecode — the dedup key for copy-paste detection. */
  readonly codeHash: Hash;
  readonly codeSize: number;
  readonly blockNumber: bigint;
  readonly deployer: Address;
}

export type DeployVerdict =
  | ({ readonly ok: true } & DeployProof)
  | {
      readonly ok: false;
      readonly reason: DeployRejection;
      readonly detail: string;
    };

const reject = (reason: DeployRejection, detail: string): DeployVerdict => ({
  ok: false,
  reason,
  detail,
});

/**
 * Verify that `txHash` is a successful contract deployment sent by `wallet`.
 *
 * Takes the deploy transaction hash rather than scanning the wallet's history:
 * a receipt lookup is one RPC call and needs no indexer, and the `from` field
 * on that receipt is what stops a student submitting someone else's deploy.
 *
 * Callers should additionally reject a `codeHash` already claimed by another
 * student — that check needs storage, so it lives in the route, not here.
 */
export async function verifyDeploy(
  wallet: string,
  txHash: string,
): Promise<DeployVerdict> {
  const receipt = await publicClient
    .getTransactionReceipt({ hash: txHash as Hash })
    .catch(() => null);

  if (!receipt) {
    return reject(
      "tx-not-found",
      `no receipt for ${txHash} on chain ${monad.id}`,
    );
  }

  if (receipt.status !== "success") {
    return reject("tx-reverted", "the deployment transaction reverted");
  }

  if (!receipt.contractAddress) {
    return reject(
      "not-a-deploy",
      "transaction succeeded but created no contract",
    );
  }

  // The receipt's sender is authoritative. A student can submit any hash they
  // like; only their own wallet appearing here proves the deploy was theirs.
  if (receipt.from.toLowerCase() !== wallet.toLowerCase()) {
    return reject("wrong-sender", `deployed by ${receipt.from}, not ${wallet}`);
  }

  const code = await publicClient.getCode({ address: receipt.contractAddress });

  // Guards against a contract that has since self-destructed, and against
  // reading a receipt for an address that never held code.
  if (!code || code === "0x") {
    return reject(
      "no-code",
      `${receipt.contractAddress} has no runtime bytecode today`,
    );
  }

  const codeSize = (code.length - 2) / 2;
  if (codeSize < MIN_RUNTIME_BYTES) {
    return reject(
      "too-small",
      `${codeSize} bytes of runtime code, minimum is ${MIN_RUNTIME_BYTES}`,
    );
  }

  return {
    ok: true,
    contractAddress: receipt.contractAddress,
    codeHash: keccak256(code),
    codeSize,
    blockNumber: receipt.blockNumber,
    deployer: receipt.from,
  };
}
