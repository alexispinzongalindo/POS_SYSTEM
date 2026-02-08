export type AdminCopy = {
  loading: string;
  signedInAs: string;
  unknown: string;
  signOut: string;
  inviteSent: string;
  cards: {
    orders: { title: string; body: string; view: string; kds: string };
    restaurants: { title: string; body: string; action: string };
    floor: { title: string; body: string; action: string };
    staff: { title: string; body: string; action: string };
    payroll: { title: string; body: string; action: string };
    reports: { title: string; body: string; action: string };
    foodCost: { title: string; body: string; action: string };
    reservations: { title: string; body: string; action: string };
    inventory: { title: string; body: string; action: string };
    customers: { title: string; body: string; action: string };
    settings: { title: string; body: string; action: string };
    integrations: { title: string; body: string; action: string };
    qrMenu: { title: string; body: string; action: string };
    pos: { title: string; body: string; action: string };
    profile: { title: string; body: string; action: string };
    invite: {
      title: string;
      body: string;
      roleCashier: string;
      roleKitchen: string;
      roleMaintenance: string;
      roleDriver: string;
      roleSecurity: string;
      roleManager: string;
      emailPlaceholder: string;
      sendInvite: string;
    };
    account: { title: string; body: string; action: string };
    support: { title: string; body: string; action: string };
    training: { title: string; body: string; action: string };
  };
  sidebar: {
    viewTutorial: string;
  };
  ai: {
    buttonLabel: string;
    title: string;
    subtitle: string;
    close: string;
    edgeGatewayLabel: string;
    edgeGatewayPlaceholder: string;
    save: string;
    health: string;
    printers: string;
    queueTest: string;
    viewQueue: string;
    thinking: string;
    askQuestion: string;
    send: string;
    welcome: string;
    missingGateway: string;
    aiRequestFailed: string;
    queuedTitle: string;
    queuedSubtitle: string;
    queuedLine: string;
    queuedTime: string;
  };
};

export function adminCopy(lang: "en" | "es"): AdminCopy {
  if (lang === "es") {
    return {
      loading: "Cargando…",
      signedInAs: "Sesión activa:",
      unknown: "(desconocido)",
      signOut: "Salir",
      inviteSent: "Invitación enviada.",
      cards: {
        orders: {
          title: "Órdenes",
          body: "Ver y administrar todas las órdenes.",
          view: "Ver órdenes",
          kds: "Códigos QR KDS",
        },
        restaurants: {
          title: "Restaurantes",
          body: "Crear y cambiar entre restaurantes.",
          action: "Administrar restaurantes",
        },
        floor: {
          title: "Plano de piso",
          body: "Configurar áreas, mesas, puertas y barra.",
          action: "Editar plano",
        },
        staff: {
          title: "Personal",
          body: "Administrar acceso y roles.",
          action: "Administrar personal",
        },
        payroll: {
          title: "Nómina",
          body: "Crear horarios y comparar con ponches.",
          action: "Abrir nómina",
        },
        reports: {
          title: "Reportes",
          body: "Totales de ventas, IVU y métodos de pago.",
          action: "Ver reportes",
        },
        foodCost: {
          title: "Food cost",
          body: "Uso real vs teórico y costo.",
          action: "Abrir food cost",
        },
        reservations: {
          title: "Reservas",
          body: "Crear y administrar reservas.",
          action: "Administrar reservas",
        },
        inventory: {
          title: "Inventario",
          body: "Controlar stock de productos.",
          action: "Administrar inventario",
        },
        customers: {
          title: "Clientes",
          body: "Guardar y administrar tu base de clientes.",
          action: "Administrar clientes",
        },
        settings: {
          title: "Configuración",
          body: "Actualizar negocio, ubicación, IVU y productos.",
          action: "Editar configuración",
        },
        integrations: {
          title: "Integraciones",
          body: "Configurar proveedores de delivery.",
          action: "Integraciones de delivery",
        },
        qrMenu: {
          title: "Menú con QR",
          body: "Genera QR para que clientes vean el menú.",
          action: "Generar QR",
        },
        pos: {
          title: "POS",
          body: "Crear órdenes usando tu menú.",
          action: "Abrir POS",
        },
        profile: {
          title: "Perfil",
          body: "Detalles de cuenta y suscripción.",
          action: "Abrir perfil",
        },
        invite: {
          title: "Invitar usuario",
          body: "Invita personal a tu restaurante.",
          roleCashier: "Cajero (solo POS)",
          roleKitchen: "Cocina (solo POS)",
          roleMaintenance: "Mantenimiento (solo POS)",
          roleDriver: "Driver (solo POS)",
          roleSecurity: "Seguridad (solo POS)",
          roleManager: "Gerente (Admin + POS)",
          emailPlaceholder: "usuario@email.com",
          sendInvite: "Enviar invitación",
        },
        account: {
          title: "Cuenta",
          body: "Cerrar sesión en este dispositivo.",
          action: "Salir",
        },
        support: {
          title: "Estación de soporte",
          body: "Crear y rastrear casos de soporte.",
          action: "Abrir soporte",
        },
        training: {
          title: "Entrenamiento",
          body: "Guías paso a paso para personal y setup.",
          action: "Abrir entrenamiento",
        },
      },
    sidebar: {
      viewTutorial: "Entrenamiento",
      },
      ai: {
        buttonLabel: "Abrir asistente AI",
        title: "Asistente AI",
        subtitle: "Pide ayuda para configurar tu restaurante.",
        close: "Cerrar",
        edgeGatewayLabel: "URL de Edge Gateway (opcional)",
        edgeGatewayPlaceholder: "http://192.168.0.50:9123",
        save: "Guardar",
        health: "Salud",
        printers: "Impresoras",
        queueTest: "Prueba de cola",
        viewQueue: "Ver cola",
        thinking: "Pensando…",
        askQuestion: "Haz una pregunta…",
        send: "Enviar",
        welcome:
          "Hola — soy tu Soporte AI de IslaPOS. Dime qué estás intentando hacer (impresión, Edge Gateway, KDS) y qué no funciona.",
        missingGateway: "Falta la URL del Gateway. Ejemplo: http://192.168.0.50:9123",
        aiRequestFailed: "Solicitud AI fallida",
        queuedTitle: "ISLAPOS",
        queuedSubtitle: "PRUEBA EN COLA",
        queuedLine: "Enviado desde el panel AI",
        queuedTime: "Hora:",
      },
    };
  }

  return {
    loading: "Loading…",
    signedInAs: "Signed in as",
    unknown: "(unknown)",
    signOut: "Sign out",
    inviteSent: "Invite sent.",
    cards: {
      orders: {
        title: "Orders",
        body: "View and manage all orders.",
        view: "View orders",
        kds: "KDS QR Codes",
      },
      restaurants: {
        title: "Restaurants",
        body: "Create and switch between restaurants.",
        action: "Manage restaurants",
      },
      floor: {
        title: "Floor Plan",
        body: "Configure areas, tables, doors, and bar.",
        action: "Edit floor plan",
      },
      staff: {
        title: "Staff",
        body: "Manage staff access and roles.",
        action: "Manage staff",
      },
      payroll: {
        title: "Payroll",
        body: "Create staff schedules and compare vs time clock.",
        action: "Open payroll",
      },
      reports: {
        title: "Reports",
        body: "Sales totals, taxes, and payment methods.",
        action: "View reports",
      },
      foodCost: {
        title: "Food Cost",
        body: "Actual vs theoretical usage and cost.",
        action: "Open food cost",
      },
      reservations: {
        title: "Reservations",
        body: "Create and manage reservations.",
        action: "Manage reservations",
      },
      inventory: {
        title: "Inventory",
        body: "Track stock for products.",
        action: "Manage inventory",
      },
      customers: {
        title: "Customers",
        body: "Store and manage your customer database.",
        action: "Manage customers",
      },
      settings: {
        title: "Settings",
        body: "Update business info, location, taxes, and products.",
        action: "Edit setup",
      },
      integrations: {
        title: "Integrations",
        body: "Configure delivery providers for your business.",
        action: "Delivery integrations",
      },
      qrMenu: {
        title: "QR Code Menu",
        body: "Generate QR codes for customers to view your menu.",
        action: "Generate QR code",
      },
      pos: {
        title: "POS",
        body: "Create orders using your menu.",
        action: "Open POS",
      },
      profile: {
        title: "Profile",
        body: "Account details and subscription.",
        action: "Open profile",
      },
      invite: {
        title: "Invite user",
        body: "Invite staff to your restaurant.",
        roleCashier: "Cashier (POS only)",
        roleKitchen: "Kitchen (POS only)",
        roleMaintenance: "Maintenance (POS only)",
        roleDriver: "Driver (POS only)",
        roleSecurity: "Security (POS only)",
        roleManager: "Manager (Admin + POS)",
        emailPlaceholder: "user@email.com",
        sendInvite: "Send invite",
      },
      account: {
        title: "Account",
        body: "Sign out of this device.",
        action: "Sign out",
      },
      support: {
        title: "Support Station",
        body: "Create and track support cases.",
        action: "Open support",
      },
      training: {
        title: "Training",
        body: "Step-by-step guides for staff and setup.",
        action: "Open training",
      },
    },
    sidebar: {
      viewTutorial: "Training",
    },
    ai: {
      buttonLabel: "Open AI Assistant",
      title: "AI Assistant",
      subtitle: "Ask for help configuring your restaurant.",
      close: "Close",
      edgeGatewayLabel: "Edge Gateway URL (optional)",
      edgeGatewayPlaceholder: "http://192.168.0.50:9123",
      save: "Save",
      health: "Health",
      printers: "Printers",
      queueTest: "Queue test print",
      viewQueue: "View queue",
      thinking: "Thinking…",
      askQuestion: "Ask a question…",
      send: "Send",
      welcome:
        "Hi — I’m your IslaPOS Support AI. Tell me what you’re trying to do (printing, Edge Gateway, KDS), and what’s not working.",
      missingGateway: "Missing Gateway URL. Example: http://192.168.0.50:9123",
      aiRequestFailed: "AI request failed",
      queuedTitle: "ISLAPOS",
      queuedSubtitle: "AI QUEUED TEST",
      queuedLine: "Queued from Admin AI panel",
      queuedTime: "Time:",
    },
  };
}
