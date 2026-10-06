(() => {
  const cart = [];
  const drawer = document.querySelector("#order-drawer");
  const cartList = document.querySelector("#cart-list");
  const emptyCart = document.querySelector("#empty-cart");
  const totalElement = document.querySelector("#cart-total");
  const liveRegion = document.querySelector("#region-aria-live");
  const emptyCategoryStatus = document.querySelector("#category-empty");
  const mobileCartLabel = document.querySelector("#mobile-cart-label");
  const openCartButton = document.querySelector("#open-cart");
  const themeToggle = document.querySelector("#theme-toggle");
  const themeToggleIcon = document.querySelector("#theme-toggle-icon");
  const categoryButtons = document.querySelectorAll(".category-tabs button");
  const productCards = document.querySelectorAll(".product-card");
  let previouslyFocusedElement;

  function updateThemeToggle(isDark) {
    const label = isDark ? "Activar modo claro" : "Activar modo oscuro";
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggleIcon.textContent = isDark ? "☀" : "☾";
  }

  let isDarkTheme = false;
  try {
    isDarkTheme = window.localStorage.getItem("brasa-viva-theme") === "dark";
  } catch (error) {
    console.error("No se pudo leer la preferencia de tema guardada.", error);
  }
  document.body.dataset.theme = isDarkTheme ? "dark" : "light";
  updateThemeToggle(isDarkTheme);

  themeToggle.addEventListener("click", () => {
    isDarkTheme = !isDarkTheme;
    document.body.dataset.theme = isDarkTheme ? "dark" : "light";
    updateThemeToggle(isDarkTheme);
    liveRegion.textContent = isDarkTheme
      ? "Modo oscuro activado."
      : "Modo claro activado.";
    try {
      window.localStorage.setItem(
        "brasa-viva-theme",
        isDarkTheme ? "dark" : "light",
      );
    } catch (error) {
      console.error("No se pudo guardar la preferencia de tema.", error);
      liveRegion.textContent += " No se pudo guardar la preferencia.";
    }
  });

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);

  function renderCart() {
    cartList.replaceChildren();
    let total = 0;
    let itemCount = 0;

    cart.forEach((item, index) => {
      const itemTotal = (item.price + item.extra) * item.quantity;
      total += itemTotal;
      itemCount += item.quantity;

      const listItem = document.createElement("li");
      listItem.className = "cart-item";

      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.name;
      const customization = document.createElement("small");
      customization.textContent = item.customization;
      const price = document.createElement("span");
      price.textContent = formatPrice(itemTotal);
      details.append(name, customization, price);

      const controls = document.createElement("div");
      controls.className = "quantity-controls";

      const decreaseButton = document.createElement("button");
      decreaseButton.type = "button";
      decreaseButton.dataset.action = "decrease";
      decreaseButton.dataset.index = String(index);
      decreaseButton.setAttribute(
        "aria-label",
        `Quitar una unidad de ${item.name}`,
      );
      decreaseButton.textContent = "−";

      const quantity = document.createElement("span");
      quantity.setAttribute("aria-label", "Cantidad");
      quantity.textContent = String(item.quantity);

      const increaseButton = document.createElement("button");
      increaseButton.type = "button";
      increaseButton.dataset.action = "increase";
      increaseButton.dataset.index = String(index);
      increaseButton.setAttribute(
        "aria-label",
        `Agregar una unidad de ${item.name}`,
      );
      increaseButton.textContent = "+";

      controls.append(decreaseButton, quantity, increaseButton);
      listItem.append(details, controls);
      cartList.append(listItem);
    });

    emptyCart.hidden = cart.length > 0;
    totalElement.textContent = formatPrice(total);
    mobileCartLabel.textContent = itemCount
      ? `${itemCount} producto${itemCount === 1 ? "" : "s"} · ${formatPrice(total)}`
      : "Tu pedido está vacío";
  }

  function openCart() {
    previouslyFocusedElement = document.activeElement;
    drawer.hidden = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.querySelector("#close-cart").focus();
  }

  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.hidden = true;
    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElement.focus();
    } else {
      openCartButton.focus();
    }
  }

  function addProduct(card) {
    const name = card.dataset.product;
    const price = Number(card.dataset.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      throw new Error("El producto no tiene un nombre o precio válido.");
    }

    const customization = window.confirm(
      `¿Quieres agregar queso extra a ${name} por $1.50?\nAceptar: queso extra · Cancelar: sin extras`,
    );
    const extra = customization ? 150 : 0;
    const label = customization ? "Queso extra" : "Sin extras";
    const existing = cart.find(
      (item) => item.name === name && item.extra === extra,
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ name, price, extra, customization: label, quantity: 1 });
    }

    renderCart();
    liveRegion.textContent = `${name} agregado. ${label}.`;
    openCart();
  }

  document.querySelectorAll(".add-button").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      if (card) addProduct(card);
    });
  });

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      categoryButtons.forEach((item) => {
        const isSelected = item === button;
        item.classList.toggle("active", isSelected);
        item.setAttribute("aria-pressed", String(isSelected));
      });

      productCards.forEach((card) => {
        card.hidden = card.dataset.category !== category;
      });
      const hasProducts = Array.from(productCards).some(
        (card) => card.dataset.category === category,
      );
      emptyCategoryStatus.hidden = hasProducts;
      emptyCategoryStatus.textContent = hasProducts
        ? ""
        : "Aún no hay productos en esta categoría.";
      liveRegion.textContent = `Categoría ${button.textContent.trim()} seleccionada.`;
    });
  });

  cartList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-index]");
    if (!button) return;

    const index = Number(button.dataset.index);
    const item = cart[index];
    if (!item || !Number.isInteger(index)) return;

    const action = button.dataset.action;
    const itemName = item.name;
    item.quantity += button.dataset.action === "increase" ? 1 : -1;
    const itemRemoved = item.quantity <= 0;
    if (itemRemoved) cart.splice(index, 1);
    renderCart();

    if (itemRemoved) {
      const nearbyIndex = Math.min(index, cart.length - 1);
      const nearbyControl =
        nearbyIndex >= 0
          ? cartList.querySelector(
              `button[data-action="decrease"][data-index="${nearbyIndex}"]`,
            )
          : null;
      (nearbyControl ?? document.querySelector("#cart-title")).focus();
      liveRegion.textContent = `${itemName} eliminado del pedido. Total: ${totalElement.textContent}.`;
      return;
    }

    cartList
      .querySelector(
        `button[data-action="${action}"][data-index="${index}"]`,
      )
      .focus();
    liveRegion.textContent = `${itemName}: cantidad ${item.quantity}. Total: ${totalElement.textContent}.`;
  });

  openCartButton.addEventListener("click", openCart);
  document.querySelector("#close-cart").addEventListener("click", closeCart);
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeCart();
  });

  document.addEventListener("keydown", (event) => {
    if (!drawer.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      closeCart();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = drawer.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  document.querySelector("#confirm-order").addEventListener("click", () => {
    const mode = document.querySelector(
      'input[name="order-mode"]:checked',
    ).value;
    if (cart.length === 0) {
      liveRegion.textContent = "Agrega un producto antes de confirmar.";
      return;
    }

    liveRegion.textContent = `Pedido listo para ${mode}.`;
    window.alert(
      `Pedido listo para ${mode}. Total: ${totalElement.textContent}`,
    );
  });

  renderCart();
})();
