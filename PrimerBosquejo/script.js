const cart = [];
const drawer = document.querySelector("#order-drawer");
const cartList = document.querySelector("#cart-list");
const emptyCart = document.querySelector("#empty-cart");
const totalElement = document.querySelector("#cart-total");
const liveRegion = document.querySelector("#region-aria-live");

const formatPrice = (value) => `$${value.toLocaleString("es-CO")}`;

function renderCart() {
  cartList.innerHTML = "";
  let total = 0;
  let itemCount = 0;
  cart.forEach((item, index) => {
    const itemTotal = (item.price + item.extra) * item.quantity;
    total += itemTotal;
    itemCount += item.quantity;
    const listItem = document.createElement("li");
    listItem.className = "cart-item";
    listItem.innerHTML = `<div><strong>${item.name}</strong><small>${item.customization}</small><span>${formatPrice(itemTotal)}</span></div><div class="quantity-controls"><button type="button" data-action="decrease" data-index="${index}" aria-label="Quitar una unidad de ${item.name}">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-index="${index}" aria-label="Agregar una unidad de ${item.name}">+</button></div>`;
    cartList.appendChild(listItem);
  });
  emptyCart.hidden = cart.length > 0;
  totalElement.textContent = formatPrice(total);
  document.querySelector("#mobile-cart-label").textContent = itemCount ? `${itemCount} producto${itemCount > 1 ? "s" : ""} · ${formatPrice(total)}` : "Tu pedido está vacío";
}

function openCart() { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); document.querySelector("#close-cart").focus(); }
function closeCart() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); document.querySelector("#open-cart").focus(); }

function addProduct(card) {
  const name = card.dataset.product;
  const price = Number(card.dataset.price);
  const customization = window.confirm(`¿Quieres agregar queso extra a ${name} por $1.500?\nAceptar: queso extra · Cancelar: sin extras`);
  const extra = customization ? 1500 : 0;
  const label = customization ? "Queso extra" : "Sin extras";
  const existing = cart.find((item) => item.name === name && item.extra === extra);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price, extra, customization: label, quantity: 1 });
  renderCart();
  liveRegion.textContent = `${name} agregado. ${label}.`;
  openCart();
}

document.querySelectorAll(".add-button").forEach((button) => button.addEventListener("click", () => addProduct(button.closest(".product-card"))));
document.querySelectorAll(".category-tabs a").forEach((tab) => tab.addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelectorAll(".category-tabs a").forEach((item) => item.classList.toggle("active", item === tab));
  document.querySelectorAll(".product-card").forEach((card) => { card.hidden = tab.dataset.category !== "hamburguesas" && card.dataset.category !== tab.dataset.category; });
  liveRegion.textContent = `Categoría ${tab.textContent} seleccionada.`;
}));
cartList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  cart[index].quantity += button.dataset.action === "increase" ? 1 : -1;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  renderCart();
});
document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
drawer.addEventListener("click", (event) => { if (event.target === drawer) closeCart(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && drawer.classList.contains("is-open")) closeCart(); });
document.querySelector("#confirm-order").addEventListener("click", () => {
  const mode = document.querySelector("input[name=order-mode]:checked").value;
  liveRegion.textContent = cart.length ? `Pedido listo para ${mode}.` : "Agrega un producto antes de confirmar.";
  if (cart.length) window.alert(`Pedido listo para ${mode}. Total: ${totalElement.textContent}`);
});
renderCart();