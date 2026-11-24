const localHosts = new Set(["localhost", "127.0.0.1"]);
const defaultApiUrl = localHosts.has(window.location.hostname)
  ? "http://localhost:3000/api"
  : "https://brasa-viva-api.onrender.com/api";

window.BRASA_API_URL = window.BRASA_API_URL || defaultApiUrl;
