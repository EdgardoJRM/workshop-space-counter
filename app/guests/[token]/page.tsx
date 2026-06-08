import { GuestInfoForm } from "@/components/guests/GuestInfoForm";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

export default function GuestInfoPage({ params }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-10 pt-2">
      <div className="relative rounded-2xl border border-brand-grey/15 bg-white p-8 shadow-lg shadow-brand-slate/10">
        <div className="absolute left-8 top-0 h-1 w-12 rounded-b-full bg-brand-gold shadow-sm shadow-brand-gold/35" />
        <h1 className="text-center text-xl font-semibold text-brand-slate">
          Datos de invitados
        </h1>
        <p className="mt-2 text-center text-sm text-brand-grey">
          Completa la información de las personas adicionales en tu compra.
        </p>
        <div className="mt-6">
          <GuestInfoForm token={params.token} />
        </div>
      </div>
    </div>
  );
}
