import { sendDuplicaVentasCheckinResourcesEmail } from "@/lib/duplica-ventas-checkin-email";
import { sendImmediateCheckinEmails } from "@/lib/email-sequence";
import { notifyLaBovedaCheckin } from "@/lib/la-boveda-webhook";
import type { WorkshopSlug } from "@/lib/workshop-keys";

export type CheckinSideEffectContext = {
  registrationId: string;
  checkinId: string;
  workshopSlug: string;
  attendeeEmail: string;
  attendeeName: string;
};

export type CheckinSideEffectResult = {
  name: string;
  ok: boolean;
  error?: string;
};

function logSideEffect(
  ctx: CheckinSideEffectContext,
  result: CheckinSideEffectResult
): void {
  const payload = {
    registrationId: ctx.registrationId,
    checkinId: ctx.checkinId,
    workshopSlug: ctx.workshopSlug,
    attendeeEmail: ctx.attendeeEmail,
    effect: result.name,
    ok: result.ok,
    error: result.error,
  };

  if (result.ok) {
    console.info("[checkin] side effect completed", payload);
  } else {
    console.error("[checkin] side effect failed", payload);
  }
}

/** Ejecuta emails/webhooks post-check-in con logging estructurado (no bloquea el scan). */
export async function runPostCheckinSideEffects(
  ctx: CheckinSideEffectContext,
  options: { isDuplicaVentas: boolean }
): Promise<CheckinSideEffectResult[]> {
  const results: CheckinSideEffectResult[] = [];

  if (options.isDuplicaVentas) {
    try {
      const boveda = await notifyLaBovedaCheckin({
        registrationId: ctx.registrationId,
        email: ctx.attendeeEmail,
        name: ctx.attendeeName,
        workshopSlug: ctx.workshopSlug as WorkshopSlug,
        checkedInAt: new Date().toISOString(),
      });
      const bovedaResult: CheckinSideEffectResult = {
        name: "la-boveda-webhook",
        ok: boveda.ok,
        error: boveda.ok ? undefined : boveda.error,
      };
      results.push(bovedaResult);
      logSideEffect(ctx, bovedaResult);
    } catch (err) {
      const bovedaResult: CheckinSideEffectResult = {
        name: "la-boveda-webhook",
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
      results.push(bovedaResult);
      logSideEffect(ctx, bovedaResult);
    }

    try {
      const email = await sendDuplicaVentasCheckinResourcesEmail({
        to: ctx.attendeeEmail,
        attendeeName: ctx.attendeeName,
      });
      const emailResult: CheckinSideEffectResult = {
        name: "duplica-ventas-resources-email",
        ok: email.ok,
        error: email.ok ? undefined : email.error,
      };
      results.push(emailResult);
      logSideEffect(ctx, emailResult);
    } catch (err) {
      const emailResult: CheckinSideEffectResult = {
        name: "duplica-ventas-resources-email",
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
      results.push(emailResult);
      logSideEffect(ctx, emailResult);
    }
  }

  try {
    await sendImmediateCheckinEmails(ctx.registrationId);
    const templateResult: CheckinSideEffectResult = {
      name: "immediate-checkin-templates",
      ok: true,
    };
    results.push(templateResult);
    logSideEffect(ctx, templateResult);
  } catch (err) {
    const templateResult: CheckinSideEffectResult = {
      name: "immediate-checkin-templates",
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
    results.push(templateResult);
    logSideEffect(ctx, templateResult);
  }

  return results;
}
