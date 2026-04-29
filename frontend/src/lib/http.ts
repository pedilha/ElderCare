import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ex.: http://localhost:8080
  timeout: 15000,
});

let token: string | null = localStorage.getItem('token');
export function setAuthToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

http.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // Em DEV, já mando o X-User-Email por padrão (precisa existir na tabela idoso)
  if (import.meta.env.DEV) {
    (config.headers as any)["X-User-Email"] = "joana.teste@example.com";
  }

  if (token) {
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default http;
