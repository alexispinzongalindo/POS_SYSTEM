import type { MarketingLang } from "@/lib/marketingLanguage";

type Copy = {
  brand: string;
  tagline: string;
  nav: {
    features: string;
    pricing: string;
    training: string;
    contact: string;
    startTrial: string;
    signIn: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    cards: {
      prReadyTitle: string;
      prReadyBody: string;
      goLiveTitle: string;
      goLiveBody: string;
      supportTitle: string;
      supportBody: string;
    };
    whatYouGetTitle: string;
    whatYouGet: {
      posTitle: string;
      posBody: string;
      menuTitle: string;
      menuBody: string;
      ivuTitle: string;
      ivuBody: string;
      supportTitle: string;
      supportBody: string;
    };
    trust: {
      title1: string;
      body1: string;
      title2: string;
      body2: string;
      title3: string;
      body3: string;
    };
    supportBlock: {
      title: string;
      body: string;
      whatsapp: string;
      email: string;
      reliabilityTitle: string;
      reliabilityBody: string;
    };
    footer: {
      pricing: string;
      training: string;
      contact: string;
      signIn: string;
    };
  };
  pricing: {
    title: string;
    subtitle: string;
    note: string;
    plans: {
      trial: string;
      starter: string;
      pro: string;
      perMonth: string;
      trialBody: string;
      starterBody: string;
      proBody: string;
      startFree: string;
      seeTraining: string;
    };
  };
  features: {
    title: string;
    subtitle: string;
    cards: {
      posTitle: string;
      posBody: string;
      adminTitle: string;
      adminBody: string;
      setupTitle: string;
      setupBody: string;
      onboardingTitle: string;
      onboardingBody: string;
      openPos: string;
      openAdmin: string;
      startSetup: string;
      seeTraining: string;
    };
  };
  onboarding: {
    title: string;
    subtitle: string;
    cards: {
      guidedTitle: string;
      guidedBody: string;
      staffTitle: string;
      staffBody: string;
      supportTitle: string;
      supportBody: string;
      startTitle: string;
      startBody: string;
      openSetup: string;
      startTrial: string;
    };
  };
  contact: {
    title: string;
    subtitle: string;
    body: string;
    cards: {
      hoursTitle: string;
      hoursBody: string;
      onboardingTitle: string;
      onboardingBody: string;
      startTrial: string;
      emailTitle: string;
      emailBody: string;
      whatsappTitle: string;
      whatsappBody: string;
    };
  };
  login: {
    back: string;
    titleSignIn: string;
    titleSignup: string;
    adminAccess: string;
    tabSignIn: string;
    tabCreateAccount: string;
    email: string;
    password: string;
    minChars: string;
    pleaseWait: string;
    submitSignIn: string;
    submitCreate: string;
    noticeSignup: string;
    helpPrefix: string;
    training: string;
    or: string;
    contact: string;
  };
};

const ES: Copy = {
  brand: "IslaPOS",
  tagline: "POS hecho para Puerto Rico. IVU listo. Soporte real.",
  nav: {
    features: "Funciones",
    pricing: "Precios",
    training: "Entrenamiento",
    contact: "Contacto",
    startTrial: "Empieza gratis",
    signIn: "Entrar",
  },
  home: {
    heroTitle: "El POS todo‑en‑uno hecho para restaurantes en Puerto Rico.",
    heroSubtitle:
      "Cobra rápido, maneja tu menú y opera tu negocio en un solo sistema. Configuración IVU, planes accesibles y onboarding guiado.",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Ver precios",
    cards: {
      prReadyTitle: "Listo para Puerto Rico",
      prReadyBody: "IVU + flujo local.",
      goLiveTitle: "Listo rápido",
      goLiveBody: "Te ayudamos a configurarlo.",
      supportTitle: "Soporte real",
      supportBody: "Entrenamiento para dueños y empleados.",
    },
    whatYouGetTitle: "Lo que incluye",
    whatYouGet: {
      posTitle: "POS + pagos",
      posBody: "Cobro rápido y recibos.",
      menuTitle: "Manejo de menú",
      menuBody: "Categorías, artículos, códigos de barra/SKU.",
      ivuTitle: "Configuración IVU",
      ivuBody: "Negocio, ubicación, impuestos (IVU), productos.",
      supportTitle: "Soporte + entrenamiento",
      supportBody: "Te ayudamos a arrancar y mantenerte.",
    },
    trust: {
      title1: "Confianza local",
      body1: "Aquí van testimonios reales de restaurantes. Con 2–3 ya sube la conversión.",
      title2: "“Fácil para mi equipo”",
      body2: "Testimonio (placeholder) — Restaurante, PR",
      title3: "“IVU fue rápido”",
      body3: "Testimonio (placeholder) — Restaurante, PR",
    },
    supportBlock: {
      title: "Soporte que sí responde",
      body: "¿Prefieres WhatsApp? Perfecto. ¿Necesitas entrenamiento? Te guiamos paso a paso.",
      whatsapp: "Soporte por WhatsApp",
      email: "Soporte por email",
      reliabilityTitle: "Confiable por diseño",
      reliabilityBody: "Inicio de sesión seguro, acceso por roles y un setup que reduce errores.",
    },
    footer: {
      pricing: "Precios",
      training: "Entrenamiento",
      contact: "Contacto",
      signIn: "Entrar",
    },
  },
  pricing: {
    title: "Precios simples para restaurantes en Puerto Rico",
    subtitle: "Empieza gratis y luego elige el plan. Incluye IVU, onboarding y entrenamiento.",
    note: "Nota: los precios son placeholders hasta que definamos tu oferta final.",
    plans: {
      trial: "Prueba gratis",
      starter: "Starter",
      pro: "Pro",
      perMonth: "por mes, por local",
      trialBody: "Empieza y prueba todo.",
      starterBody: "Para operar día a día.",
      proBody: "Para soporte prioritario.",
      startFree: "Empieza gratis",
      seeTraining: "Ver entrenamiento",
    },
  },
  features: {
    title: "Funciones para el trabajo diario",
    subtitle: "Manténlo simple: órdenes, productos, ventas e IVU — con soporte cuando lo necesitas.",
    cards: {
      posTitle: "POS",
      posBody: "Crea tickets rápido, pagos y recibos.",
      adminTitle: "Admin",
      adminBody: "Configuraciones, usuarios y controles.",
      setupTitle: "Setup",
      setupBody: "Negocio, ubicación, IVU y productos.",
      onboardingTitle: "Onboarding",
      onboardingBody: "Entrenamiento y ayuda para arrancar.",
      openPos: "Abrir POS",
      openAdmin: "Abrir Admin",
      startSetup: "Abrir Setup",
      seeTraining: "Ver entrenamiento",
    },
  },
  onboarding: {
    title: "Onboarding y Entrenamiento",
    subtitle:
      "Tu ventaja es soporte y entrenamiento. Esto hace que restaurantes en Puerto Rico se sientan seguros empezando la prueba gratis.",
    cards: {
      guidedTitle: "1) Setup guiado",
      guidedBody: "Te ayudamos con negocio, ubicación, IVU y productos para que abras rápido.",
      staffTitle: "2) Entrenamiento",
      staffBody: "Sesiones cortas para cajeros y gerentes.",
      supportTitle: "3) Soporte",
      supportBody: "Ayuda real para operación diaria.",
      startTitle: "Empieza gratis",
      startBody: "Crea tu cuenta y te guiamos.",
      openSetup: "Abrir setup",
      startTrial: "Empieza gratis",
    },
  },
  contact: {
    title: "Contacto y Soporte",
    subtitle: "POS hecho para Puerto Rico. IVU listo. Soporte real.",
    body:
      "Esta página es placeholder hasta publicar email, teléfono y WhatsApp reales. Por ahora, pueden empezar la prueba gratis y tú les das soporte directo.",
    cards: {
      hoursTitle: "Horario",
      hoursBody: "Añade tu horario real aquí (ej: Lun–Sáb 9am–7pm AST).",
      onboardingTitle: "Ayuda para onboarding",
      onboardingBody: "Te guiamos con IVU, menú y entrenamiento.",
      startTrial: "Empieza gratis",
      emailTitle: "Email",
      emailBody: "Placeholder: support@islapos.com",
      whatsappTitle: "WhatsApp",
      whatsappBody: "Placeholder: +1 (787) XXX‑XXXX",
    },
  },
  login: {
    back: "← Volver a IslaPOS",
    titleSignIn: "Entrar",
    titleSignup: "Empieza tu prueba gratis",
    adminAccess: "Acceso de administración",
    tabSignIn: "Entrar",
    tabCreateAccount: "Crear cuenta",
    email: "Email",
    password: "Contraseña",
    minChars: "Mínimo 8 caracteres.",
    pleaseWait: "Espera...",
    submitSignIn: "Entrar",
    submitCreate: "Crear cuenta",
    noticeSignup: "Cuenta creada. Si la confirmación por email está activa, revisa tu inbox. Luego entra.",
    helpPrefix: "¿Necesitas ayuda? Visita",
    training: "Entrenamiento",
    or: "o",
    contact: "Contacto",
  },
};

const EN: Copy = {
  brand: "IslaPOS",
  tagline: "Built for Puerto Rico. IVU-ready. Real support.",
  nav: {
    features: "Features",
    pricing: "Pricing",
    training: "Training",
    contact: "Contact",
    startTrial: "Start free trial",
    signIn: "Sign in",
  },
  home: {
    heroTitle: "The all‑in‑one POS built for Puerto Rico restaurants.",
    heroSubtitle:
      "Take orders, manage your menu, and run daily operations in one simple system. IVU-ready setup, affordable plans, and guided onboarding.",
    ctaPrimary: "Start free trial",
    ctaSecondary: "See pricing",
    cards: {
      prReadyTitle: "Puerto Rico ready",
      prReadyBody: "IVU settings + local workflows.",
      goLiveTitle: "Go live fast",
      goLiveBody: "We help you set it up.",
      supportTitle: "Real support",
      supportBody: "Training for owners + staff.",
    },
    whatYouGetTitle: "What you get",
    whatYouGet: {
      posTitle: "POS + payments",
      posBody: "Fast checkout and receipts.",
      menuTitle: "Menu management",
      menuBody: "Categories, items, barcodes/SKU.",
      ivuTitle: "IVU-ready setup",
      ivuBody: "Business, location, taxes (IVU), products.",
      supportTitle: "Support + training",
      supportBody: "We help you go live and stay live.",
    },
    trust: {
      title1: "Trusted locally",
      body1: "Add real restaurant quotes here. Even 2–3 short testimonials improve conversion.",
      title2: '“Easy for my staff”',
      body2: "Placeholder testimonial — Restaurant, PR",
      title3: '“IVU setup was quick”',
      body3: "Placeholder testimonial — Restaurant, PR",
    },
    supportBlock: {
      title: "Support that responds",
      body: "Prefer WhatsApp? No problem. Need training? We’ll guide you step by step.",
      whatsapp: "WhatsApp support",
      email: "Email support",
      reliabilityTitle: "Reliable by design",
      reliabilityBody: "Secure sign-in, role-based access, and a setup flow designed to prevent mistakes.",
    },
    footer: {
      pricing: "Pricing",
      training: "Training",
      contact: "Contact",
      signIn: "Sign in",
    },
  },
  pricing: {
    title: "Simple pricing for Puerto Rico restaurants",
    subtitle: "Start free, then choose a plan. IVU-ready setup plus training and onboarding.",
    note: "Note: prices are placeholders until we finalize your offer.",
    plans: {
      trial: "Free trial",
      starter: "Starter",
      pro: "Pro",
      perMonth: "per month, per location",
      trialBody: "Get started and explore.",
      starterBody: "For day-to-day operations.",
      proBody: "For priority support.",
      startFree: "Start free",
      seeTraining: "See training",
    },
  },
  features: {
    title: "Features built for daily restaurant work",
    subtitle: "Keep it simple: orders, products, sales and IVU — with support when you need it.",
    cards: {
      posTitle: "POS",
      posBody: "Create tickets fast, handle payments, print receipts.",
      adminTitle: "Admin",
      adminBody: "Manage settings, invite users, and access key controls.",
      setupTitle: "Setup",
      setupBody: "Business, location, IVU and products.",
      onboardingTitle: "Guided onboarding",
      onboardingBody: "Training resources and hands-on help so you can go live.",
      openPos: "Open POS",
      openAdmin: "Open Admin",
      startSetup: "Open setup",
      seeTraining: "See training",
    },
  },
  onboarding: {
    title: "Onboarding & Training",
    subtitle:
      "Your advantage is support and training. This helps Puerto Rico restaurants feel safe starting the free trial.",
    cards: {
      guidedTitle: "1) Guided setup",
      guidedBody: "We help you complete Business, Location, Taxes (IVU) and Products so you can go live.",
      staffTitle: "2) Staff training",
      staffBody: "Short sessions so cashiers and managers learn fast.",
      supportTitle: "3) Support",
      supportBody: "Real help for daily operations.",
      startTitle: "Start free",
      startBody: "Create your account and we’ll guide you through setup.",
      openSetup: "Open setup",
      startTrial: "Start free trial",
    },
  },
  contact: {
    title: "Contact & Support",
    subtitle: "Built for Puerto Rico. IVU-ready. Real support.",
    body:
      "This page is a placeholder until we publish your real support email, phone and WhatsApp. For now, restaurants can start the free trial and you can support them directly.",
    cards: {
      hoursTitle: "Support hours",
      hoursBody: "Add your real hours here (example: Mon–Sat 9am–7pm AST).",
      onboardingTitle: "Help with onboarding",
      onboardingBody: "We can guide you through IVU, menu setup, and staff training.",
      startTrial: "Start free trial",
      emailTitle: "Email",
      emailBody: "Placeholder: support@islapos.com",
      whatsappTitle: "WhatsApp",
      whatsappBody: "Placeholder: +1 (787) XXX-XXXX",
    },
  },
  login: {
    back: "← Back to IslaPOS",
    titleSignIn: "Sign in",
    titleSignup: "Start your free trial",
    adminAccess: "Admin access",
    tabSignIn: "Sign in",
    tabCreateAccount: "Create account",
    email: "Email",
    password: "Password",
    minChars: "Minimum 8 characters.",
    pleaseWait: "Please wait...",
    submitSignIn: "Sign in",
    submitCreate: "Create account",
    noticeSignup: "Account created. If email confirmation is enabled, check your inbox. Then sign in.",
    helpPrefix: "Need help setting up? Visit",
    training: "Training",
    or: "or",
    contact: "Contact",
  },
};

export function marketingCopy(lang: MarketingLang): Copy {
  return lang === "en" ? EN : ES;
}
