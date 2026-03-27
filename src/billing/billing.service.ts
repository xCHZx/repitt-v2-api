import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, desc, eq, inArray } from 'drizzle-orm';
import Stripe from 'stripe';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { billingWebhookEvents, businesses, subscriptions, users } from '../database/schema';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2026-03-25.dahlia' as any,
    });
    this.webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
  }

  // Crea un Stripe customer por negocio (no por usuario)
  async createCheckoutSession(userId: number, userEmail: string, businessId: number, _planId?: string) {
    const [business] = await this.db
      .select({ id: businesses.id, stripeCustomerId: businesses.stripeCustomerId })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)))
      .limit(1);

    if (!business) throw new NotFoundException('Negocio no encontrado');

    let customerId = business.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: { userId: userId.toString(), businessId: businessId.toString() },
      });
      customerId = customer.id;
      await this.db
        .update(businesses)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: this.config.getOrThrow('STRIPE_PRICE_ID'), quantity: 1 }],
      success_url: this.config.getOrThrow('STRIPE_SUCCESS_URL'),
      cancel_url: this.config.getOrThrow('STRIPE_CANCEL_URL'),
      metadata: { userId: userId.toString(), businessId: businessId.toString() },
    });

    return { url: session.url };
  }

  async getSubscription(userId: number, businessId: number) {
    const [subscription] = await this.db
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        cancelAt: subscriptions.endsAt,
        canceledAt: subscriptions.canceledAt,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.businessId, businessId)))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription) return null;

    return { ...subscription, planName: 'Emprendedor' };
  }

  async createPortalSession(userId: number, businessId: number) {
    const [business] = await this.db
      .select({ stripeCustomerId: businesses.stripeCustomerId })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)))
      .limit(1);

    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.stripeCustomerId) {
      throw new BadRequestException('No se encontró cliente de facturación para este negocio. Completa un checkout primero.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: this.config.getOrThrow('STRIPE_CANCEL_URL'),
    });

    return { url: session.url };
  }

  async cancelSubscription(userId: number, businessId: number) {
    const [sub] = await this.db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.businessId, businessId),
        eq(subscriptions.status, 'active'),
      ))
      .limit(1);

    if (!sub) throw new NotFoundException('No se encontró una suscripción activa para este negocio');

    await this.stripe.subscriptions.update(sub.providerSubId, { cancel_at_period_end: true });
    return { message: 'Subscription will be canceled at the end of the billing period', endsAt: sub.currentPeriodEnd };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    // Idempotency — skip if already processed
    const [existing] = await this.db
      .select({ id: billingWebhookEvents.id })
      .from(billingWebhookEvents)
      .where(eq(billingWebhookEvents.providerEventId, event.id))
      .limit(1);

    if (existing) return { received: true };

    const [savedEvent] = await this.db
      .insert(billingWebhookEvents)
      .values({
        provider: 'stripe',
        providerEventId: event.id,
        type: event.type,
        normalizedType: this.normalizeEventType(event.type),
        payload: event as unknown as Record<string, unknown>,
      })
      .returning();

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
      }

      await this.db
        .update(billingWebhookEvents)
        .set({ processedAt: new Date() })
        .where(eq(billingWebhookEvents.id, savedEvent.id));
    } catch (err) {
      console.error(`Webhook processing error [${event.type}]:`, err);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (!session.subscription || !session.metadata?.userId || !session.metadata?.businessId) return;

    const userId = parseInt(session.metadata.userId, 10);
    const businessId = parseInt(session.metadata.businessId, 10);
    const sub = await this.stripe.subscriptions.retrieve(session.subscription as string);
    const item = sub.items.data[0];

    await this.db
      .insert(subscriptions)
      .values({
        userId,
        businessId,
        provider: 'stripe',
        providerSubId: sub.id,
        status: this.normalizeStatus(sub.status),
        providerPriceId: item?.price.id ?? null,
        providerProductId: (item?.price.product as string) ?? null,
        quantity: item?.quantity ?? 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trialEndsAt: (sub as any).trial_end ? new Date((sub as any).trial_end * 1000) : null,
        // API 2026-03-25.dahlia: current_period_* moved to subscription item level
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodStart: (item as any)?.current_period_start ? new Date((item as any).current_period_start * 1000) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodEnd: (item as any)?.current_period_end ? new Date((item as any).current_period_end * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      })
      .onConflictDoNothing();

    // Activar negocio
    await this.db
      .update(businesses)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(businesses.id, businessId));

    // Marcar usuario como premium
    await this.db
      .update(users)
      .set({ plan: 'premium', updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const normalizedStatus = this.normalizeStatus(sub.status);
    const item = sub.items.data[0];

    const [existingSub] = await this.db
      .select({ userId: subscriptions.userId, businessId: subscriptions.businessId })
      .from(subscriptions)
      .where(eq(subscriptions.providerSubId, sub.id))
      .limit(1);

    // API 2026-03-25.dahlia: cancel_at replaces cancel_at_period_end=true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancelAt = (sub as any).cancel_at ? new Date((sub as any).cancel_at * 1000) : null;

    await this.db
      .update(subscriptions)
      .set({
        status: normalizedStatus,
        providerPriceId: item?.price.id ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodStart: (item as any)?.current_period_start ? new Date((item as any).current_period_start * 1000) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodEnd: (item as any)?.current_period_end ? new Date((item as any).current_period_end * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        endsAt: cancelAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.providerSubId, sub.id));

    if (existingSub) {
      const isActive = ['active', 'trialing'].includes(normalizedStatus);
      // Actualizar users.plan: premium si tiene al menos 1 sub activa
      const plan = isActive ? 'premium' : await this.hasAnyActiveSub(existingSub.userId) ? 'premium' : 'free';
      await this.db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, existingSub.userId));
    }
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription) {
    const [existingSub] = await this.db
      .select({ userId: subscriptions.userId, businessId: subscriptions.businessId })
      .from(subscriptions)
      .where(eq(subscriptions.providerSubId, sub.id))
      .limit(1);

    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.providerSubId, sub.id));

    if (existingSub) {
      // Desactivar el negocio vinculado
      if (existingSub.businessId) {
        await this.db
          .update(businesses)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(businesses.id, existingSub.businessId));
      }
      // Degradar usuario solo si no tiene otras subs activas
      const stillHasActive = await this.hasAnyActiveSub(existingSub.userId, sub.id);
      if (!stillHasActive) {
        await this.db.update(users).set({ plan: 'free', updatedAt: new Date() }).where(eq(users.id, existingSub.userId));
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionId = (invoice as any).subscription as string | null;
    if (!subscriptionId) return;

    await this.db
      .update(subscriptions)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(subscriptions.providerSubId, subscriptionId));
  }

  private async hasAnyActiveSub(userId: number, excludeProviderSubId?: string): Promise<boolean> {
    const query = this.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ['active', 'trialing']),
      ))
      .limit(1);

    const rows = await query;
    if (!excludeProviderSubId) return rows.length > 0;
    return rows.some(r => r.id !== undefined); // still active after exclusion checked at query level
  }

  private normalizeStatus(stripeStatus: string): string {
    const map: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      paused: 'paused',
      incomplete: 'past_due',
      incomplete_expired: 'canceled',
    };
    return map[stripeStatus] ?? stripeStatus;
  }

  private normalizeEventType(type: string): string {
    return type.replace('customer.', '').replace('checkout.session.', 'checkout_session.');
  }
}
