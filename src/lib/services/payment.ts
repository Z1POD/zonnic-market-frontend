// src/lib/services/payment.ts

import { request, USE_MOCKS } from "@/lib/api-client";
import type {
  PaymentProvider,
  SubmitReceiptInput,
  SubmittedReceipt,
  VerifyResponse,
} from "@/types/api";
import { mockPaymentProviders, mockSubmitReceipt, mockVerify } from "@/lib/mock-data";

const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const paymentService = {
  async providers(): Promise<PaymentProvider[]> {
    if (USE_MOCKS) return delay(mockPaymentProviders());
    return request<PaymentProvider[]>("/payment/providers/");
  },

  async submitReceipt(input: SubmitReceiptInput): Promise<SubmittedReceipt> {
    if (USE_MOCKS) return delay(mockSubmitReceipt(input));
    return request<SubmittedReceipt>("/payment/submit-receipt/", { method: "POST", body: input });
  },

  /**
   * Polls verification status. The backend uses `success: false` for the
   * intermediate `verifying` / `mismatch` states — we pass `raw: true` and
   * unwrap manually so callers always see the `VerifyResponse`.
   */
  async verify(tx_ref: string): Promise<VerifyResponse> {
    if (USE_MOCKS) return delay(mockVerify(tx_ref), 1200);
    const env = await request<{ success: boolean; data: VerifyResponse }>("/payment/verify/", {
      method: "POST",
      body: { tx_ref },
      raw: true,
    });
    return env.data;
  },
};
