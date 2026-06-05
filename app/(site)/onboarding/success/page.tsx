import Link from "next/link";

export default function OnboardingSuccessPage({
  searchParams,
}: {
  searchParams: { org?: string };
}) {
  const org = searchParams.org ?? "";

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">¡Cuenta lista!</h1>
      <p className="mt-4 text-neutral-600">
        Tu organización <strong>{org}</strong> está creada.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Revisa tu email para el magic link de admin.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login?intent=admin"
          className="rounded-lg bg-black py-2.5 text-white"
        >
          Ir al panel admin
        </Link>
        <Link href="/docs/saas-setup" className="text-sm underline">
          Configurar impresora y staff
        </Link>
      </div>
    </main>
  );
}
