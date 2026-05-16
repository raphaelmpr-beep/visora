// config.js — API base URLs
const DEV_API_BASE = "http://localhost:4173/api";
const PROD_API_BASE = "https://your-proxy-server-url/api"; // Update after deploying proxy
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const API_BASE = LOCAL_HOSTS.includes(location.hostname) ? DEV_API_BASE : PROD_API_BASE;
