(() => {
  const apiBaseUrl = window.BRASA_API_URL.replace(/\/+$/, "");
  const loginPanel = document.querySelector("#login-panel");
  const adminPanel = document.querySelector("#admin-panel");
  const loginForm = document.querySelector("#login-form");
  const loginMessage = document.querySelector("#login-message");
  const adminNotice = document.querySelector("#admin-notice");
  const supplierOrderDialog = document.querySelector("#supplier-order-dialog");
  const supplierOrderForm = document.querySelector("#supplier-order-form");
  const supplierOrderProvider = document.querySelector("#supplier-order-provider");
  const supplierOrderQuantity = document.querySelector("#supplier-order-quantity");
  const supplierOrderError = document.querySelector("#supplier-order-error");
  const receiveOrderDialog = document.querySelector("#receive-order-dialog");
  const receiveOrderForm = document.querySelector("#receive-order-form");
  const receiveOrderError = document.querySelector("#receive-order-error");
  const sessionKey = "brasa-viva-admin-session";
  let session;
  let noticeTimeout;
  let refreshTimer;
  let lookups;
  let orderSuppliers = [];
  let selectedSupplierOrder;

  function showNotice(message, isError = false) {
    window.clearTimeout(noticeTimeout);
    adminNotice.textContent = message;
    adminNotice.classList.toggle("is-error", isError);
    adminNotice.hidden = false;
    noticeTimeout = window.setTimeout(() => {
      adminNotice.hidden = true;
    }, 5000);
  }

  function clearSession() {
    session = undefined;
    lookups = undefined;
    window.clearInterval(refreshTimer);
    try {
      window.sessionStorage.removeItem(sessionKey);
    } catch (error) {
      console.error("No se pudo limpiar la sesión administrativa.", error);
    }
    adminPanel.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();
  }

  async function api(path, { method = "GET", body } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = response.status === 204 ? null : await response.json();

    if (response.status === 401 && session) {
      clearSession();
      loginMessage.textContent = "La sesión venció. Inicia sesión nuevamente.";
      loginMessage.hidden = false;
    }
    if (!response.ok) {
      throw new Error(result?.error || "No fue posible completar la solicitud.");
    }
    return result;
  }

  function saveSession(value) {
    session = value;
    try {
      window.sessionStorage.setItem(sessionKey, JSON.stringify(value));
    } catch (error) {
      console.error("No se pudo guardar la sesión administrativa en esta pestaña.", error);
      showNotice("La sesión estará disponible hasta que cierres o recargues esta pestaña.", true);
    }
  }

  function displaySession() {
    loginPanel.hidden = true;
    adminPanel.hidden = false;
    document.querySelector("#admin-user-name").textContent =
      session.user.nombres
        ? `${session.user.nombres} ${session.user.apellidos}`
        : session.user.name;
    showView("dashboard");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.hidden = true;
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await api("/admin/session", {
        method: "POST",
        body: Object.fromEntries(new FormData(loginForm)),
      });
      saveSession(result);
      displaySession();
    } catch (error) {
      loginMessage.textContent = error.message;
      loginMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector("#logout-button").addEventListener("click", () => {
    clearSession();
    loginMessage.textContent = "Sesión cerrada.";
    loginMessage.hidden = false;
  });

  function makeTable(headers, rows, emptyMessage = "No hay registros para mostrar.") {
    const container = document.createElement("div");
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = emptyMessage;
      container.append(empty);
      return container;
    }

    const table = document.createElement("table");
    table.className = "admin-table";
    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    headers.forEach((header) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = header;
      headingRow.append(cell);
    });
    head.append(headingRow);
    const body = document.createElement("tbody");
    rows.forEach((cells) => {
      const row = document.createElement("tr");
      cells.forEach((value) => {
        const cell = document.createElement("td");
        if (value instanceof Node) cell.append(value);
        else cell.textContent = value === null || value === undefined ? "—" : String(value);
        row.append(cell);
      });
      body.append(row);
    });
    table.append(head, body);
    container.append(table);
    return container;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString("es-CO");
  }

  function getAdminId() {
    return session.user.id_usuario ?? session.user.sub;
  }

  async function loadLookups() {
    if (lookups) return lookups;
    const [categories, ingredients, products, roles, users] = await Promise.all([
      api("/categories?limit=100"),
      api("/ingredients?limit=100"),
      api("/products/manage?limit=100"),
      api("/roles?limit=100"),
      api("/users?limit=100"),
    ]);
    lookups = {
      categories: categories.data,
      ingredients: ingredients.data,
      products: products.data,
      roles: roles.data,
      users: users.data,
    };
    return lookups;
  }

  const resourceConfigs = [
    {
      key: "products",
      title: "Productos del menú",
      path: "/products/manage",
      idField: "id_producto",
      target: "#products-resource",
      create: false,
      remove: false,
      fields: [
        {
          key: "id_categoria",
          label: "Categoría",
          type: "select",
          options: (data) => data.categories.map((row) => [row.id_categoria, row.nombre_categoria]),
        },
        { key: "precio_venta_actual", label: "Precio (USD)", type: "number", step: "0.01" },
        { key: "disponible", label: "Disponible para venta", type: "checkbox" },
      ],
      columns: (row, data) => [
        row.id_producto,
        row.nombre,
        data.categories.find((category) => category.id_categoria === row.id_categoria)?.nombre_categoria ?? row.id_categoria,
        formatCurrency(row.precio_venta_actual),
        row.disponible ? "Disponible" : "No disponible",
      ],
      headers: ["ID", "Producto", "Categoría", "Precio", "Estado"],
    },
    {
      key: "categories",
      title: "Categorías",
      path: "/categories",
      idField: "id_categoria",
      target: "#categories-resource",
      fields: [{ key: "nombre_categoria", label: "Nombre", type: "text" }],
      columns: (row) => [row.id_categoria, row.nombre_categoria],
      headers: ["ID", "Categoría"],
    },
    {
      key: "ingredients",
      title: "Ingredientes",
      path: "/ingredients",
      idField: "id_ingrediente",
      target: "#ingredients-resource",
      fields: [
        { key: "nombre", label: "Nombre", type: "text" },
        { key: "unidad_medida", label: "Unidad de medida", type: "text", placeholder: "KG, g, unidad..." },
        { key: "stock_minimo", label: "Stock mínimo", type: "number", step: "0.001" },
      ],
      columns: (row) => [row.id_ingrediente, row.nombre, row.unidad_medida, row.stock_minimo],
      headers: ["ID", "Ingrediente", "Unidad", "Mínimo"],
    },
    {
      key: "lots",
      title: "Lotes de inventario",
      path: "/ingredient-lots",
      idField: "id_lote",
      target: "#lots-resource",
      fields: [
        {
          key: "id_ingrediente",
          label: "Ingrediente",
          type: "select",
          options: (data) => data.ingredients.map((row) => [row.id_ingrediente, row.nombre]),
        },
        { key: "codigo_lote", label: "Código de lote", type: "text" },
        { key: "fecha_ingreso", label: "Fecha de ingreso", type: "datetime-local" },
        { key: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date" },
        { key: "cantidad_inicial", label: "Cantidad recibida", type: "number", step: "0.001" },
        { key: "cantidad_disponible", label: "Cantidad disponible", type: "number", step: "0.001" },
      ],
      autoFields: (data) => ({ id_usuario_admin: Number(data.userId) }),
      columns: (row, data) => [
        row.id_lote,
        data.ingredients.find((ingredient) => ingredient.id_ingrediente === row.id_ingrediente)?.nombre ?? row.id_ingrediente,
        row.codigo_lote,
        row.cantidad_disponible,
        formatDate(row.fecha_vencimiento),
      ],
      headers: ["ID", "Ingrediente", "Lote", "Disponible", "Vence"],
    },
    {
      key: "suppliers",
      title: "Proveedores de ingredientes",
      path: "/suppliers",
      idField: "id_proveedor",
      target: "#suppliers-resource",
      fields: [
        { key: "nombre", label: "Nombre del proveedor", type: "text" },
        { key: "telefono", label: "Teléfono", type: "tel" },
        {
          key: "id_ingrediente",
          label: "Ingrediente que suministra",
          type: "select",
          options: (data) => data.ingredients.map((row) => [row.id_ingrediente, row.nombre]),
        },
        { key: "cantidad_por_pedido", label: "Cantidad habitual por compra", type: "number", step: "0.001" },
      ],
      columns: (row, data) => [
        row.id_proveedor,
        row.nombre,
        row.telefono,
        data.ingredients.find((ingredient) => ingredient.id_ingrediente === row.id_ingrediente)?.nombre ?? row.id_ingrediente,
        row.cantidad_por_pedido,
      ],
      headers: ["ID", "Proveedor", "Teléfono", "Ingrediente", "Cantidad habitual"],
    },
    {
      key: "recipes",
      title: "Ingredientes por receta",
      path: "/recipes",
      idField: "id_receta",
      target: "#recipes-resource",
      fields: [
        {
          key: "id_producto",
          label: "Producto",
          type: "select",
          options: (data) => data.products.map((row) => [row.id_producto, row.nombre]),
        },
        {
          key: "id_ingrediente",
          label: "Ingrediente",
          type: "select",
          options: (data) => data.ingredients.map((row) => [row.id_ingrediente, row.nombre]),
        },
        { key: "cantidad_necesaria", label: "Cantidad por unidad", type: "number", step: "0.001" },
      ],
      columns: (row, data) => [
        row.id_receta,
        data.products.find((product) => product.id_producto === row.id_producto)?.nombre ?? row.id_producto,
        data.ingredients.find((ingredient) => ingredient.id_ingrediente === row.id_ingrediente)?.nombre ?? row.id_ingrediente,
        row.cantidad_necesaria,
      ],
      headers: ["ID", "Producto", "Ingrediente", "Cantidad"],
    },
    {
      key: "users",
      title: "Usuarios del equipo",
      path: "/users",
      idField: "id_usuario",
      target: "#users-resource",
      fields: [
        {
          key: "id_rol",
          label: "Rol",
          type: "select",
          options: (data) => data.roles.map((row) => [row.id_rol, row.nombre_rol]),
        },
        { key: "id_supervisor", label: "ID supervisor (opcional)", type: "number", optional: true },
        { key: "nombres", label: "Nombres", type: "text" },
        { key: "apellidos", label: "Apellidos", type: "text" },
        { key: "correo", label: "Correo", type: "email" },
        { key: "telefono", label: "Teléfono", type: "tel", optional: true },
        { key: "password", label: "Contraseña (mínimo 10 caracteres)", type: "password", optionalOnEdit: true },
      ],
      columns: (row, data) => [
        row.id_usuario,
        `${row.nombres} ${row.apellidos}`,
        row.correo,
        data.roles.find((role) => role.id_rol === row.id_rol)?.nombre_rol ?? row.id_rol,
      ],
      headers: ["ID", "Nombre", "Correo", "Rol"],
      customActions: (row) => Number(row.id_usuario) !== Number(getAdminId()),
    },
  ];

  function createResourcePanel(config) {
    const target = document.querySelector(config.target);
    const card = document.createElement("section");
    card.className = "resource-card";
    const heading = document.createElement("div");
    heading.className = "card-heading resource-heading";
    const title = document.createElement("h2");
    title.textContent = config.title;
    const refresh = document.createElement("button");
    refresh.className = "text-button";
    refresh.type = "button";
    refresh.textContent = "Actualizar";
    heading.append(title, refresh);

    const form = document.createElement("form");
    form.className = "resource-form";
    const controls = new Map();
    const error = document.createElement("p");
    error.className = "resource-error";
    error.hidden = true;

    config.fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "form-field";
      const label = document.createElement("label");
      const control = field.type === "select"
        ? document.createElement("select")
        : document.createElement("input");
      control.name = field.key;
      control.id = `${config.key}-${field.key}`;
      label.htmlFor = control.id;
      label.textContent = field.label;
      if (field.type !== "select") control.type = field.type;
      if (field.step) control.step = field.step;
      if (field.placeholder) control.placeholder = field.placeholder;
      if (field.optional || field.optionalOnEdit) control.required = false;
      else control.required = true;
      if (field.type === "checkbox") {
        wrapper.classList.add("form-field-wide");
        control.checked = true;
      }
      if (field.type === "select") {
        wrapper.classList.add("form-field-wide");
      }
      wrapper.append(label, control);
      form.append(wrapper);
      controls.set(field.key, control);
    });

    const actions = document.createElement("div");
    actions.className = "form-actions";
    const submit = document.createElement("button");
    submit.className = "button button-primary";
    submit.type = "submit";
    submit.textContent = config.create === false ? "Guardar cambios" : "Guardar";
    const cancel = document.createElement("button");
    cancel.className = "cancel-edit";
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.hidden = true;
    actions.append(submit, cancel);
    form.append(error, actions);

    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    card.append(heading, form, tableWrap);
    target.replaceChildren(card);
    let rows = [];
    let editing;

    function setError(message) {
      error.textContent = message;
      error.hidden = !message;
    }

    function resetForm() {
      editing = undefined;
      form.reset();
      controls.forEach((control, key) => {
        if (control.type === "checkbox") control.checked = true;
        if (control instanceof HTMLSelectElement && control.options.length) {
          control.selectedIndex = 0;
        }
        const field = config.fields.find((item) => item.key === key);
        if (field?.type === "password") control.required = config.create !== false;
        control.disabled = config.create === false && !config.fields.some((item) => item.key === key);
      });
      cancel.hidden = true;
      submit.textContent = config.create === false ? "Guardar cambios" : "Guardar";
      setError("");
    }

    function updateSelects(data) {
      config.fields.filter((field) => field.type === "select").forEach((field) => {
        const control = controls.get(field.key);
        const selected = control.value;
        control.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Selecciona...";
        placeholder.disabled = true;
        placeholder.selected = !selected;
        control.append(placeholder);
        field.options(data).forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = String(value);
          option.textContent = label;
          control.append(option);
        });
        if (selected) control.value = selected;
      });
    }

    async function load() {
      tableWrap.replaceChildren();
      const loading = document.createElement("p");
      loading.className = "admin-empty";
      loading.textContent = "Cargando...";
      tableWrap.append(loading);
      try {
        const [result, data] = await Promise.all([
          api(`${config.path}?limit=100`),
          loadLookups(),
        ]);
        rows = result.data;
        updateSelects(data);
        renderTable(data);
      } catch (requestError) {
        tableWrap.replaceChildren();
        const message = document.createElement("p");
        message.className = "resource-error";
        message.textContent = requestError.message;
        tableWrap.append(message);
      }
    }

    function renderTable(data) {
      const tableRows = rows.map((row) => {
        const cells = config.columns(row, data);
        const edit = document.createElement("button");
        edit.className = "text-button";
        edit.type = "button";
        edit.textContent = "Editar";
        edit.addEventListener("click", () => {
          editing = row;
          controls.forEach((control, key) => {
            const field = config.fields.find((item) => item.key === key);
            control.disabled = config.key === "users" &&
              key === "id_rol" &&
              Number(row.id_usuario) === Number(getAdminId());
            let value = row[key];
            if (field?.type === "datetime-local" && value) value = new Date(value).toISOString().slice(0, 16);
            if (field?.type === "date" && value) value = new Date(value).toISOString().slice(0, 10);
            if (control.type === "checkbox") control.checked = Boolean(value);
            else control.value = value ?? "";
            control.required = field?.type === "password" ? false : !(field?.optional || field?.optionalOnEdit);
          });
          cancel.hidden = false;
          submit.textContent = "Guardar cambios";
          setError("");
          form.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        const actionCell = document.createElement("span");
        actionCell.className = "row-actions";
        actionCell.append(edit);
        if (config.remove !== false && config.customActions?.(row) !== false) {
          const remove = document.createElement("button");
          remove.className = "text-button";
          remove.type = "button";
          remove.textContent = "Eliminar";
          remove.addEventListener("click", async () => {
            if (!window.confirm(`¿Eliminar el registro ${row[config.idField]}?`)) return;
            try {
              await api(`${config.path}/${row[config.idField]}`, { method: "DELETE" });
              showNotice("Registro eliminado.");
              await load();
            } catch (requestError) {
              showNotice(requestError.message, true);
            }
          });
          actionCell.append(remove);
        }
        return [...cells, actionCell];
      });
      tableWrap.replaceChildren(makeTable([...config.headers, "Acciones"], tableRows));
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setError("");
      const payload = {};
      config.fields.forEach((field) => {
        const control = controls.get(field.key);
        if (control.disabled) return;
        const raw = control.value;
        if (field.type === "checkbox") {
          payload[field.key] = control.checked;
        } else if (field.type === "password" && !raw && editing) {
          return;
        } else if (!raw && field.optionalOnEdit && editing) {
          return;
        } else if (!raw && field.optional) {
          payload[field.key] = field.nullable ? null : undefined;
        } else if (field.type === "number" || field.type === "select") {
          payload[field.key] = Number(raw);
        } else if (field.type === "datetime-local") {
          payload[field.key] = new Date(raw).toISOString();
        } else if (field.type === "date") {
          payload[field.key] = new Date(`${raw}T00:00:00.000Z`).toISOString();
        } else {
          payload[field.key] = raw;
        }
      });
      if (!editing && config.autoFields) {
        Object.assign(payload, config.autoFields({ userId: getAdminId() }));
      }
      const originalLabel = submit.textContent;
      submit.disabled = true;
      try {
        const path = editing ? `${config.path}/${editing[config.idField]}` : config.path;
        await api(path, { method: editing ? "PATCH" : "POST", body: payload });
        resetForm();
        lookups = undefined;
        await load();
        if (config.key === "ingredients" || config.key === "categories") {
          lookups = undefined;
        }
        showNotice("Cambios guardados correctamente.");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        submit.disabled = false;
        if (!editing) submit.textContent = originalLabel;
      }
    });

    cancel.addEventListener("click", resetForm);
    refresh.addEventListener("click", load);
    resetForm();
    return load;
  }

  const resourceLoaders = new Map(
    resourceConfigs.map((config) => [config.key, createResourcePanel(config)]),
  );

  async function renderOrders(target, limit = 100) {
    target.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "admin-empty";
    loading.textContent = "Cargando pedidos...";
    target.append(loading);
    try {
      const [orders, statusResult] = await Promise.all([
        api(`/sales?limit=${limit}`),
        api("/order-statuses?limit=100"),
      ]);
      const statuses = statusResult.data;
      const rows = orders.data.map((order) => {
        const status = document.createElement("select");
        status.setAttribute("aria-label", `Estado del pedido ${order.id_pedido}`);
        statuses.forEach((optionData) => {
          const option = document.createElement("option");
          option.value = String(optionData.id_estado_pedido);
          option.textContent = optionData.descripcion;
          status.append(option);
        });
        status.value = String(order.id_estado_pedido);
        const save = document.createElement("button");
        save.className = "text-button";
        save.type = "button";
        save.textContent = "Guardar";
        save.addEventListener("click", async () => {
          try {
            await api(`/orders/manage/${order.id_pedido}`, {
              method: "PATCH",
              body: { id_estado_pedido: Number(status.value) },
            });
            showNotice(`Estado del pedido #${order.id_pedido} actualizado.`);
            await renderOrders(target, limit);
          } catch (error) {
            showNotice(error.message, true);
          }
        });
        const productNames = order.detalles
          .map((detail) => `${detail.cantidad} × ${detail.producto.nombre}`)
          .join(", ");
        return [
          order.id_pedido,
          formatDate(order.fecha_hora),
          order.id_usuario,
          productNames,
          formatCurrency(order.total),
          status,
          save,
        ];
      });
      target.replaceChildren(makeTable(
        ["Pedido", "Fecha", "Cliente ID", "Productos", "Total", "Estado", "Acción"],
        rows,
      ));
    } catch (error) {
      target.replaceChildren();
      const message = document.createElement("p");
      message.className = "resource-error";
      message.textContent = error.message;
      target.append(message);
    }
  }

  async function loadLowStock() {
    const target = document.querySelector("#low-stock-table");
    target.replaceChildren();
    try {
      const result = await api("/inventory/low-stock");
      target.replaceChildren(makeTable(
        ["Ingrediente", "Stock actual", "Stock mínimo", "Unidad", "Acción"],
        result.data.map((item) => {
          const button = document.createElement("button");
          button.className = "text-button";
          button.type = "button";
          button.textContent = "Solicitar compra";
          button.addEventListener("click", () => openSupplierOrder(item));
          return [item.nombre, item.stock_actual, item.stock_minimo, item.unidad_medida, button];
        }),
        "No hay ingredientes por debajo del mínimo.",
      ));
      document.querySelector("#summary-stock").textContent = String(result.data.length);
    } catch (error) {
      const message = document.createElement("p");
      message.className = "resource-error";
      message.textContent = error.message;
      target.replaceChildren(message);
    }
  }

  async function openSupplierOrder(ingredient) {
    try {
      const result = await api("/suppliers?limit=100");
      orderSuppliers = result.data.filter(
        (supplier) => supplier.id_ingrediente === ingredient.id_ingrediente,
      );
      if (orderSuppliers.length === 0) {
        showNotice(`Registra primero un proveedor para ${ingredient.nombre}.`, true);
        return;
      }

      supplierOrderProvider.replaceChildren();
      orderSuppliers.forEach((supplier) => {
        const option = document.createElement("option");
        option.value = String(supplier.id_proveedor);
        option.textContent = `${supplier.nombre} · ${supplier.telefono}`;
        supplierOrderProvider.append(option);
      });
      document.querySelector("#supplier-order-ingredient").textContent =
        `${ingredient.nombre} · Stock: ${ingredient.stock_actual} ${ingredient.unidad_medida} · Mínimo: ${ingredient.stock_minimo}`;
      supplierOrderQuantity.value = String(orderSuppliers[0].cantidad_por_pedido);
      supplierOrderError.hidden = true;
      supplierOrderDialog.showModal();
    } catch (error) {
      showNotice(error.message, true);
    }
  }

  supplierOrderProvider.addEventListener("change", () => {
    const supplier = orderSuppliers.find(
      (item) => item.id_proveedor === Number(supplierOrderProvider.value),
    );
    if (supplier) supplierOrderQuantity.value = String(supplier.cantidad_por_pedido);
  });

  supplierOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    supplierOrderError.hidden = true;
    const submit = supplierOrderForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api("/supplier-orders", {
        method: "POST",
        body: {
          id_proveedor: Number(supplierOrderProvider.value),
          cantidad: Number(supplierOrderQuantity.value),
        },
      });
      supplierOrderDialog.close();
      supplierOrderForm.reset();
      showNotice("Solicitud guardada. El inventario no cambia hasta recibir el pedido.");
      await loadSupplierOrders();
    } catch (error) {
      supplierOrderError.textContent = error.message;
      supplierOrderError.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("#cancel-supplier-order").addEventListener("click", () => {
    supplierOrderDialog.close();
    supplierOrderForm.reset();
  });

  async function openReceiveOrder(order) {
    selectedSupplierOrder = order;
    receiveOrderError.hidden = true;
    document.querySelector("#receive-order-details").textContent =
      `${order.cantidad} ${order.ingrediente.unidad_medida} de ${order.ingrediente.nombre} · ${order.proveedor.nombre}`;
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    document.querySelector("#received-expiration").min = localToday;
    receiveOrderDialog.showModal();
  }

  receiveOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    receiveOrderError.hidden = true;
    const submit = receiveOrderForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api(`/supplier-orders/${selectedSupplierOrder.id_solicitud}/receive`, {
        method: "POST",
        body: {
          codigo_lote: document.querySelector("#received-lot-code").value.trim(),
          fecha_vencimiento: document.querySelector("#received-expiration").value,
        },
      });
      receiveOrderDialog.close();
      receiveOrderForm.reset();
      showNotice("Recepción registrada y lote agregado al inventario.");
      await Promise.all([loadLowStock(), loadSupplierOrders()]);
      resourceLoaders.get("lots")();
    } catch (error) {
      receiveOrderError.textContent = error.message;
      receiveOrderError.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("#cancel-receive-order").addEventListener("click", () => {
    receiveOrderDialog.close();
    receiveOrderForm.reset();
    selectedSupplierOrder = undefined;
  });

  async function loadSupplierOrders() {
    const target = document.querySelector("#supplier-orders-table");
    target.replaceChildren();
    try {
      const result = await api("/supplier-orders?limit=100");
      const rows = result.data.map((order) => {
        const action = document.createElement("span");
        if (order.estado === "Pendiente") {
          const receiveButton = document.createElement("button");
          receiveButton.className = "text-button";
          receiveButton.type = "button";
          receiveButton.textContent = "Registrar recepción";
          receiveButton.addEventListener("click", () => openReceiveOrder(order));
          action.append(receiveButton);
        } else {
          action.textContent = "—";
        }
        return [
          formatDate(order.fecha_solicitud),
          order.ingrediente.nombre,
          order.proveedor.nombre,
          order.proveedor.telefono,
          `${order.cantidad} ${order.ingrediente.unidad_medida}`,
          order.estado,
          action,
        ];
      });
      target.replaceChildren(makeTable(
        ["Fecha", "Ingrediente", "Proveedor", "Teléfono", "Cantidad", "Estado", "Acción"],
        rows,
      ));
    } catch (error) {
      const message = document.createElement("p");
      message.className = "resource-error";
      message.textContent = error.message;
      target.replaceChildren(message);
    }
  }

  async function loadDashboard() {
    try {
      const summary = await api("/sales/summary");
      document.querySelector("#summary-sales").textContent = formatCurrency(summary.data.total_ventas);
      document.querySelector("#summary-orders").textContent = String(summary.data.cantidad_pedidos);
      await Promise.all([
        loadLowStock(),
        renderOrders(document.querySelector("#recent-orders"), 10),
      ]);
    } catch (error) {
      showNotice(error.message, true);
    }
  }

  async function loadReport(formData = new FormData(document.querySelector("#report-filter"))) {
    const query = new URLSearchParams();
    const since = formData.get("since");
    const until = formData.get("until");
    if (since) query.set("since", new Date(`${since}T00:00:00.000Z`).toISOString());
    if (until) query.set("until", new Date(`${until}T23:59:59.999Z`).toISOString());
    try {
      const queryString = query.toString();
      const result = await api(`/sales/summary${queryString ? `?${queryString}` : ""}`);
      document.querySelector("#report-sales").textContent = formatCurrency(result.data.total_ventas);
      document.querySelector("#report-orders").textContent = String(result.data.cantidad_pedidos);
    } catch (error) {
      showNotice(error.message, true);
    }
  }

  document.querySelector("#report-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    loadReport(new FormData(event.currentTarget));
  });

  document.querySelectorAll(".admin-nav button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.refresh === "dashboard") loadDashboard();
      if (button.dataset.refresh === "orders") renderOrders(document.querySelector("#orders-table"));
      if (button.dataset.refresh === "low-stock") loadLowStock();
      if (button.dataset.refresh === "supplier-orders") loadSupplierOrders();
    });
  });

  function showView(name) {
    window.clearInterval(refreshTimer);
    document.querySelectorAll(".admin-nav button").forEach((button) => {
      if (button.dataset.view === name) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.querySelectorAll(".admin-view").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    if (name === "dashboard") loadDashboard();
    else if (name === "orders") renderOrders(document.querySelector("#orders-table"));
    else if (name === "inventory") {
      loadLowStock();
      loadSupplierOrders();
      resourceLoaders.get("ingredients")();
      resourceLoaders.get("lots")();
    } else if (resourceLoaders.has(name)) resourceLoaders.get(name)();
    else if (name === "reports") loadReport();

    if (name === "dashboard" || name === "inventory") {
      refreshTimer = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (name === "dashboard") loadDashboard();
        else {
          loadLowStock();
          loadSupplierOrders();
          resourceLoaders.get("lots")();
        }
      }, 30_000);
    }
  }

  try {
    const saved = JSON.parse(window.sessionStorage.getItem(sessionKey) || "null");
    if (saved?.token && saved.expiresAt > Date.now()) {
      session = saved;
      api("/admin/session")
        .then((result) => {
          if (!result.user) throw new Error("La sesión administrativa no es válida.");
          session.user = saved.user ?? result.user;
          displaySession();
        })
        .catch((error) => {
          clearSession();
          loginMessage.textContent = error.message;
          loginMessage.hidden = false;
        });
    } else if (saved) {
      window.sessionStorage.removeItem(sessionKey);
    }
  } catch (error) {
    console.error("No se pudo restaurar la sesión administrativa.", error);
    clearSession();
  }
})();
