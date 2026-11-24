(() => {
  const apiBaseUrl = window.BRASA_API_URL.replace(/\/+$/, "");
  const tokenKey = "brasa-viva-customer-session";
  const authView = document.querySelector("#auth-view");
  const accountView = document.querySelector("#account-view");
  const loginForm = document.querySelector("#login-form");
  const registerForm = document.querySelector("#register-form");
  const addressForm = document.querySelector("#address-form");
  const addressList = document.querySelector("#address-list");
  const orderList = document.querySelector("#order-list");
  const accountMessage = document.querySelector("#account-message");
  let editingAddressId = null;

  async function readResponse(response) {
    let result;
    try {
      result = response.status === 204 ? {} : await response.json();
    } catch {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
    if (!response.ok) throw new Error(result.error ?? "No fue posible completar la solicitud.");
    return result;
  }

  function getToken() {
    return window.sessionStorage.getItem(tokenKey);
  }

  function saveSession(result) {
    if (typeof result.token !== "string" || !result.user || typeof result.user.name !== "string") {
      throw new Error("El servidor devolvió una sesión de cliente inválida.");
    }
    window.sessionStorage.setItem(tokenKey, result.token);
  }

  async function api(path, { method = "GET", body } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return readResponse(response);
  }

  function setMessage(element, message = "") {
    element.textContent = message;
  }

  function showSignedOut() {
    authView.hidden = false;
    accountView.hidden = true;
  }

  function appendEmptyState(container, message) {
    const paragraph = document.createElement("p");
    paragraph.className = "account-empty";
    paragraph.textContent = message;
    container.append(paragraph);
  }

  function renderAddresses(addresses) {
    addressList.replaceChildren();
    if (addresses.length === 0) {
      appendEmptyState(addressList, "Aún no tienes direcciones guardadas.");
      return;
    }

    for (const address of addresses) {
      const item = document.createElement("li");
      item.className = "address-item";
      const heading = document.createElement("h3");
      heading.textContent = address.label;
      const value = document.createElement("p");
      value.textContent = address.address;
      item.append(heading, value);
      if (address.reference) {
        const reference = document.createElement("p");
        reference.textContent = `Referencia: ${address.reference}`;
        item.append(reference);
      }

      const actions = document.createElement("div");
      actions.className = "address-item-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.dataset.action = "edit";
      edit.dataset.id = address.id;
      edit.textContent = "Editar";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.dataset.id = address.id;
      remove.textContent = "Eliminar";
      actions.append(edit, remove);
      item.append(actions);
      addressList.append(item);
    }
  }

  function renderOrders(orders) {
    orderList.replaceChildren();
    if (orders.length === 0) {
      appendEmptyState(orderList, "Tus pedidos realizados con la cuenta aparecerán aquí. También puedes comprar como invitado.");
      return;
    }

    for (const order of orders) {
      const article = document.createElement("article");
      article.className = "customer-order";
      const heading = document.createElement("div");
      heading.className = "customer-order-heading";
      const number = document.createElement("strong");
      number.textContent = `Pedido #${order.id}`;
      const date = document.createElement("span");
      date.textContent = new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.createdAt));
      heading.append(number, date);
      article.append(heading);

      const status = document.createElement("p");
      status.textContent = `${order.status} · ${order.mode} · ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(order.total)}`;
      article.append(status);

      const items = document.createElement("ul");
      for (const orderItem of order.items) {
        const item = document.createElement("li");
        item.textContent = `${orderItem.quantity} × ${orderItem.name}`;
        items.append(item);
      }
      article.append(items);
      if (order.address) {
        const address = document.createElement("p");
        address.textContent = `Entrega: ${order.address}`;
        article.append(address);
      }
      orderList.append(article);
    }
  }

  function resetAddressForm() {
    editingAddressId = null;
    addressForm.reset();
    document.querySelector("#save-address-button").textContent = "Agregar dirección";
    document.querySelector("#cancel-address-edit").hidden = true;
  }

  async function loadDashboard() {
    const [session, addresses, orders] = await Promise.all([
      api("/customer/session"),
      api("/customer/addresses"),
      api("/customer/orders"),
    ]);
    if (
      !session.user ||
      typeof session.user.name !== "string" ||
      !Array.isArray(addresses.data) ||
      !Array.isArray(orders.data)
    ) {
      throw new Error("El servidor devolvió información de cuenta inválida.");
    }
    document.querySelector("#account-name").textContent = session.user.name;
    document.querySelector("#account-email").textContent = session.user.email;
    renderAddresses(addresses.data);
    renderOrders(orders.data);
    authView.hidden = true;
    accountView.hidden = false;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#login-message");
    setMessage(message);
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const formData = new FormData(loginForm);
      const response = await fetch(`${apiBaseUrl}/customer/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = await readResponse(response);
      saveSession(result);
      await loadDashboard();
    } catch (error) {
      setMessage(message, error.message);
    } finally {
      button.disabled = false;
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#register-message");
    setMessage(message);
    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const formData = new FormData(registerForm);
      const response = await fetch(`${apiBaseUrl}/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          surname: formData.get("surname"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        }),
      });
      const result = await readResponse(response);
      saveSession(result);
      registerForm.reset();
      await loadDashboard();
    } catch (error) {
      setMessage(message, error.message);
    } finally {
      button.disabled = false;
    }
  });

  addressForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#address-message");
    setMessage(message);
    const formData = new FormData(addressForm);
    const body = {
      label: formData.get("label"),
      address: formData.get("address"),
      reference: formData.get("reference"),
    };
    try {
      await api(
        editingAddressId ? `/customer/addresses/${editingAddressId}` : "/customer/addresses",
        { method: editingAddressId ? "PATCH" : "POST", body },
      );
      resetAddressForm();
      const result = await api("/customer/addresses");
      renderAddresses(result.data);
    } catch (error) {
      setMessage(message, error.message);
    }
  });

  addressList.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "edit") {
      try {
        const result = await api("/customer/addresses");
        const address = result.data.find((item) => item.id === id);
        if (!address) throw new Error("No se encontró esa dirección.");
        editingAddressId = id;
        document.querySelector("#address-label").value = address.label;
        document.querySelector("#address-value").value = address.address;
        document.querySelector("#address-reference").value = address.reference ?? "";
        document.querySelector("#save-address-button").textContent = "Guardar cambios";
        document.querySelector("#cancel-address-edit").hidden = false;
        document.querySelector("#address-label").focus();
      } catch (error) {
        setMessage(accountMessage, error.message);
      }
      return;
    }

    if (button.dataset.action === "delete" && window.confirm("¿Eliminar esta dirección frecuente?")) {
      try {
        await api(`/customer/addresses/${id}`, { method: "DELETE" });
        const result = await api("/customer/addresses");
        renderAddresses(result.data);
      } catch (error) {
        setMessage(accountMessage, error.message);
      }
    }
  });

  document.querySelector("#cancel-address-edit").addEventListener("click", resetAddressForm);

  document.querySelector("#logout-button").addEventListener("click", () => {
    window.sessionStorage.removeItem(tokenKey);
    showSignedOut();
    setMessage(document.querySelector("#login-message"), "Cerraste sesión.");
  });

  const token = getToken();
  if (!token) {
    showSignedOut();
  } else {
    loadDashboard().catch((error) => {
      if (/Inicia sesión|Credenciales/.test(error.message)) {
        window.sessionStorage.removeItem(tokenKey);
        showSignedOut();
        setMessage(document.querySelector("#login-message"), error.message);
      } else {
        showSignedOut();
        setMessage(document.querySelector("#login-message"), error.message);
      }
    });
  }
})();
