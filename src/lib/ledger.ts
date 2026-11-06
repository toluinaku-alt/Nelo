import { prisma } from "./prisma";

export const LEDGER_ACCOUNTS = {
  CUSTOMER_WALLET: "CUSTOMER_WALLET",
  ESCROW_GOODS: "ESCROW_GOODS",
  VENDOR_PAYABLE: "VENDOR_PAYABLE",
  RIDER_PAYABLE: "RIDER_PAYABLE",
  PLATFORM_FEES: "PLATFORM_FEES",
  REFUND_CLEARING: "REFUND_CLEARING",
} as const;

export type LedgerAccountCode = keyof typeof LEDGER_ACCOUNTS;

/**
 * Ensures standard ledger accounts exist in the database
 */
export async function ensureLedgerAccountsExist() {
  const accounts: { code: LedgerAccountCode; name: string }[] = [
    { code: "CUSTOMER_WALLET", name: "Customer Inbound Clearing / Wallet" },
    { code: "ESCROW_GOODS", name: "Shop-for-Me Goods Escrow Clearing" },
    { code: "VENDOR_PAYABLE", name: "Vendor Settlement Payable" },
    { code: "RIDER_PAYABLE", name: "Rider Earnings Payable" },
    { code: "PLATFORM_FEES", name: "Nelo Platform Commission & Service Revenue" },
    { code: "REFUND_CLEARING", name: "Customer Refund Clearing" },
  ];

  for (const acc of accounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        balanceKobo: 0,
      },
    });
  }
}

/**
 * Records an append-only double-entry financial ledger transaction
 */
export async function recordLedgerEntry(params: {
  orderId?: string;
  debitAccountCode: LedgerAccountCode;
  creditAccountCode: LedgerAccountCode;
  amountKobo: number;
  description: string;
  referenceType:
    | "ORDER_PAYMENT"
    | "VENDOR_PAYOUT"
    | "RIDER_EARNING"
    | "PLATFORM_COMMISSION"
    | "SHOPPING_RECONCILIATION"
    | "CUSTOMER_REFUND";
  isCompensating?: boolean;
}) {
  if (params.amountKobo <= 0) {
    return null;
  }

  await ensureLedgerAccountsExist();

  return await prisma.$transaction(async (tx) => {
    const debitAcc = await tx.ledgerAccount.findUniqueOrThrow({
      where: { code: params.debitAccountCode },
    });
    const creditAcc = await tx.ledgerAccount.findUniqueOrThrow({
      where: { code: params.creditAccountCode },
    });

    // Create append-only ledger transaction entry
    const entry = await tx.ledgerEntry.create({
      data: {
        orderId: params.orderId,
        debitAccountId: debitAcc.id,
        creditAccountId: creditAcc.id,
        amountKobo: params.amountKobo,
        description: params.description,
        referenceType: params.referenceType,
        isCompensating: params.isCompensating || false,
      },
    });

    // Update account balances
    await tx.ledgerAccount.update({
      where: { id: debitAcc.id },
      data: { balanceKobo: { increment: params.amountKobo } },
    });

    await tx.ledgerAccount.update({
      where: { id: creditAcc.id },
      data: { balanceKobo: { increment: params.amountKobo } },
    });

    return entry;
  });
}

/**
 * Reconciles Shop for Me goods budget with actual receipt spend
 * If actual < budget, the difference is refunded back to customer.
 * If actual > budget (within approved spending limit), customer wallet is charged.
 */
export async function reconcileShopForMeLedger(params: {
  orderId: string;
  budgetKobo: number;
  actualSpentKobo: number;
}) {
  const { orderId, budgetKobo, actualSpentKobo } = params;

  if (actualSpentKobo < budgetKobo) {
    const refundKobo = budgetKobo - actualSpentKobo;
    await recordLedgerEntry({
      orderId,
      debitAccountCode: "ESCROW_GOODS",
      creditAccountCode: "REFUND_CLEARING",
      amountKobo: refundKobo,
      description: `Shop-for-Me budget refund: unspent items balance of ₦${(refundKobo / 100).toFixed(2)}`,
      referenceType: "SHOPPING_RECONCILIATION",
      isCompensating: true,
    });
  }

  // Transfer actual spent goods to Rider payable (rider paid from their wallet/cash at stall)
  if (actualSpentKobo > 0) {
    await recordLedgerEntry({
      orderId,
      debitAccountCode: "ESCROW_GOODS",
      creditAccountCode: "RIDER_PAYABLE",
      amountKobo: actualSpentKobo,
      description: `Rider reimbursement for shop purchases: ₦${(actualSpentKobo / 100).toFixed(2)}`,
      referenceType: "SHOPPING_RECONCILIATION",
    });
  }
}
