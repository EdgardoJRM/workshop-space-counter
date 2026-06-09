export const metadata = {
  title: "Política de privacidad | Hernandez Pass",
  description: "Política de privacidad de Hernandez Pass.",
};

const sections = [
  {
    title: "Información que manejamos",
    body: "Hernandez Pass procesa datos necesarios para administrar eventos: nombre, correo electrónico, teléfono cuando se provee, taller o evento seleccionado, estado de registro, código QR del pase, historial de check-in y datos operativos de cupos.",
  },
  {
    title: "Uso de la información",
    body: "Usamos esta información para emitir pases, validar asistentes, operar el check-in, reenviar confirmaciones, imprimir etiquetas y ayudar al equipo organizador a gestionar sus eventos.",
  },
  {
    title: "Cámara y escaneo QR",
    body: "La app puede solicitar acceso a la cámara para escanear códigos QR de pases. No almacenamos fotos, videos ni imágenes de la cámara; el acceso se usa solamente para leer el código QR durante el check-in.",
  },
  {
    title: "Notificaciones",
    body: "La app puede usar notificaciones para confirmar acciones operativas, como un check-in registrado. Puedes administrar los permisos de notificación desde los ajustes del dispositivo.",
  },
  {
    title: "Compartir datos",
    body: "No vendemos datos personales. Los datos se comparten solo con el organizador del evento y con proveedores técnicos necesarios para operar el servicio, como hosting, correo electrónico, base de datos e infraestructura de la aplicación.",
  },
  {
    title: "Retención y seguridad",
    body: "Conservamos los datos mientras sean necesarios para operar el evento, dar soporte y cumplir responsabilidades administrativas. Aplicamos controles de acceso y medidas razonables para proteger la información.",
  },
  {
    title: "Contacto",
    body: "Para solicitar acceso, corrección o eliminación de información, escribe a soporte@edgardohernandez.com.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
        Hernandez Pass
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-slate">
        Política de privacidad
      </h1>
      <p className="mt-3 text-sm text-brand-charcoal">
        Última actualización: 8 de junio de 2026
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-brand-slate">{section.title}</h2>
            <p className="mt-2 leading-7 text-brand-charcoal">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
