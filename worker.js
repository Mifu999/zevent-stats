/**
 * Relais CORS pour l'API du ZEVENT — Cloudflare Worker.
 *
 * L'API https://zevent.fr/api/ ne renvoie pas d'en-tête Access-Control-Allow-Origin.
 * Ce worker la recopie telle quelle en y ajoutant les en-têtes qui manquent,
 * ce qui permet à n'importe quelle page web de la lire.
 *
 * Déploiement : voir la section « Relais dédié » du README.
 * Coût : plan gratuit Cloudflare, 100 000 requêtes par jour, sans carte bancaire.
 */

const API = "https://zevent.fr/api/";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== "GET") {
      return new Response("Méthode non autorisée", { status: 405, headers: CORS });
    }

    try {
      // cacheTtl : Cloudflare garde la réponse 15 s en cache.
      // Mille visiteurs ne déclenchent donc que quatre appels par minute vers zevent.fr.
      const upstream = await fetch(API, {
        cf: { cacheTtl: 15, cacheEverything: true },
        headers: { "accept": "application/json" },
      });

      if (!upstream.ok) {
        return json({ error: "API amont indisponible", status: upstream.status }, 502);
      }

      return new Response(upstream.body, {
        headers: {
          ...CORS,
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=15",
        },
      });
    } catch (err) {
      return json({ error: "Relais en échec", detail: String(err) }, 502);
    }
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}
