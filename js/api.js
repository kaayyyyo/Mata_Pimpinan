/* ========================================================================
   Google Apps Script API client
   Response contract: { success: boolean, data: Array, total?, message? }
   ======================================================================== */
const API = {
  endpoints: {
    investasi: 'https://script.google.com/macros/s/AKfycby0wbOnLC9miS8zqPnjbk58fS0oanF-uZL8Gvc6IkQWLE1BzFIQM3F3DOmbKPkoMZncXg/exec',
    skm: 'https://script.google.com/macros/s/AKfycbwKjFTm0c-4g1yqUjzPc38Ji89spo8YzVG8_Aa1ljB8k6mmbHoSjrduKbx3vxB5kV6R/exec',
    rapat: 'https://script.google.com/macros/s/AKfycbyGOMVDsmGlGxHGMthAo18EblCXf7XebMdJRD5z-PY-nDAg3ANs3frGLWQeBTORN32Z/exec',
    dispensasi: 'https://script.google.com/macros/s/AKfycbzQWgxSIaiWsb2bhob8tfJU5_mmHxFJRzR06z9G6WXZD8ZQgJnZS5jmzIYZOxEUg3Nsbg/exec',
    retribusi: 'https://script.google.com/macros/s/AKfycbzRIrKAQPQTXYtRrel6EJNmhuPgXBMq7ssTUvcvFo-cEpyOH61xKXUeshaV2IVOIgCi/exec',
    pegawai: 'https://script.google.com/macros/s/AKfycbz4gZs9pBQz9pPlqFwRZIk_Uk3OhFCPPqIlDGGka3WT9swjUzUALHKD0uoZNTe2WxcG/exec'
  },

  getEndpointForAction(action) {
    const value = String(action || '').toLowerCase();
    if (value.includes('investasi')) return this.endpoints.investasi;
    if (value.includes('skm')) return this.endpoints.skm;
    if (value.includes('rapat')) return this.endpoints.rapat;
    if (value.includes('dispensasi')) return this.endpoints.dispensasi;
    if (value.includes('retribusi') || value.includes('pbg')) return this.endpoints.retribusi;
    if (value.includes('pegawai')) return this.endpoints.pegawai;
    return null;
  },

  buildUrl(action, params = {}) {
    const endpoint = this.getEndpointForAction(action);
    if (!endpoint) throw new Error(`Endpoint belum dikonfigurasi untuk action "${action}".`);
    const url = new URL(endpoint);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });
    return url;
  },

  logRequest(url, method, payload) {
    console.groupCollapsed(`[API] ${method} ${url.searchParams.get('action') || ''}`);
    console.log('URL request:', url.toString());
    console.log('Method:', method);
    console.log('Payload:', payload || null);
    console.groupEnd();
  },

  async parseResponse(response, context) {
    const raw = await response.text();
    console.groupCollapsed(`[API] Response ${context.method} ${context.action}`);
    console.log('URL response:', response.url || context.url);
    console.log('Status response:', response.status, response.statusText, 'redirected:', response.redirected);
    console.log('Response body:', raw);
    console.groupEnd();

    let json;
    try {
      json = JSON.parse(raw);
    } catch (_) {
      throw new Error(`Respons server bukan JSON (HTTP ${response.status}): ${raw.slice(0, 250) || 'kosong'}`);
    }
    if (!response.ok || !json || json.success === false) {
      throw new Error((json && json.message) || `Permintaan gagal (HTTP ${response.status}).`);
    }
    // Backward-compatible GET parsing during staged deployment migration.
    if (Array.isArray(json)) return { success: true, data: json, total: json.length };
    if (json.success === undefined && Array.isArray(json.data)) return { ...json, success: true };
    return json;
  },

  async fetchJson(url, options, context) {
    this.logRequest(url, context.method, context.payload);
    try {
      const response = await fetch(url.toString(), options);
      return await this.parseResponse(response, { ...context, url: url.toString() });
    } catch (error) {
      console.group(`[API] Error ${context.method} ${context.action}`);
      console.error('URL request:', url.toString());
      console.error('Method:', context.method);
      console.error('Payload:', context.payload || null);
      console.error('Error lengkap:', error);
      console.groupEnd();
      throw error;
    }
  },

  async request(action, params = {}) {
    const url = this.buildUrl(action, params);
    // Apps Script and intermediary redirects may briefly reuse a GET result.
    // A unique query value guarantees the admin reload reads the latest row.
    url.searchParams.set('_', String(Date.now()));
    const json = await this.fetchJson(url, {
      method: 'GET', mode: 'cors', credentials: 'omit', redirect: 'follow', cache: 'no-store'
    }, { action, method: 'GET', payload: params });
    const data = Array.isArray(json.data) ? json.data : [];
    return { ...json, data, total: Number.isFinite(json.total) ? json.total : data.length };
  },

  async mutate(action, payload = {}) {
    const url = this.buildUrl(action);
    const requestPayload = {
      action,
      ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]))
    };
    // CRUD must use doPost(e). A success toast is now emitted only when this
    // request returns a readable JSON response with success:true.
    const body = new URLSearchParams(requestPayload);
    return this.fetchJson(url, {
      method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow', body, referrerPolicy: 'no-referrer'
    }, { action, method: 'POST', payload: requestPayload });
  }
};
