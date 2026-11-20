/* API do projeto (servidor.js). Os caminhos são relativos ("api/..."), então funcionam
   tanto em https://technologyhm.com.br/descarte-certo/ quanto em http://localhost. */
export async function apiFetch(rota, { method = "GET", body } = {}) {
  let r;
  try {
    r = await fetch(`api/${rota}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("Sem conexão com o servidor. Verifique sua internet e tente de novo."), { status: 0 });
  }
  const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(dados.erro || "Não foi possível falar com o servidor."), { status: r.status });
  return dados;
}
