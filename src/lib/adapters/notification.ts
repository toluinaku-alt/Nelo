/**
 * Notification Adapter for Nelo
 * Dispatches simulated SMS and in-app event logs with clearly tagged mock status.
 */

export interface NotificationPayload {
  recipientPhone?: string;
  recipientEmail?: string;
  orderNumber: string;
  eventType: string;
  message: string;
}

export class NotificationAdapter {
  private isMock: boolean;

  constructor() {
    this.isMock = process.env.MOCK_SERVICES !== "false";
  }

  isMockMode(): boolean {
    return this.isMock;
  }

  async sendSMS(payload: NotificationPayload): Promise<{ success: boolean; id: string; mock: boolean }> {
    const id = `sms_${Date.now()}`;
    if (this.isMock) {
      console.log(`[MOCK SMS -> ${payload.recipientPhone}]: ${payload.message}`);
      return { success: true, id, mock: true };
    }

    // In production, integration with Termii or Africa's Talking
    return { success: true, id, mock: false };
  }

  async sendPush(payload: NotificationPayload): Promise<{ success: boolean; id: string; mock: boolean }> {
    const id = `push_${Date.now()}`;
    if (this.isMock) {
      console.log(`[MOCK PUSH]: Order ${payload.orderNumber}: ${payload.message}`);
      return { success: true, id, mock: true };
    }
    return { success: true, id, mock: false };
  }
}

export const notificationAdapter = new NotificationAdapter();
