import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { API_BASE } from "../../services/api";

export interface Profile {
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
}

interface ApiSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Profile;
}

// Toda a comunicacao com o banco/Auth passa pelo backend (/auth/*): o browser nao
// conhece o Supabase. O access token fica so em memoria; apenas o refresh token
// persiste (localStorage) para restaurar a sessao ao recarregar a pagina.
const REFRESH_KEY = "pvbtcalc.refresh";

const storage = {
  get: () => {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  set: (v: string) => {
    try { localStorage.setItem(REFRESH_KEY, v); } catch { /* storage indisponivel */ }
  },
  clear: () => {
    try { localStorage.removeItem(REFRESH_KEY); } catch { /* storage indisponivel */ }
  },
};

async function authFetch<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth${path}`, {
      method: init.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new Error("auth.err_server_unavailable");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === "string" && detail.startsWith("auth.") ? detail : "auth.err_login_failed");
  }
  return res.status === 204 ? null : ((await res.json()) as T);
}

// Registra a visita uma vez por sessao do navegador
export const logVisit = createAsyncThunk("visit/log", async (session: { profile: Profile; token: string }) => {
  if (sessionStorage.getItem("visitLoggedPVBtCalc") === session.profile.id) return;
  try {
    await authFetch("/visit", { token: session.token });
    sessionStorage.setItem("visitLoggedPVBtCalc", session.profile.id);
  } catch { /* telemetria nao pode quebrar o login */ }
});

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshing: Promise<ApiSession | null> | undefined;

const toSession = (s: ApiSession) => ({ profile: s.user, token: s.access_token, expiresIn: s.expires_in });

// Renova o access token pouco antes de expirar.
function scheduleRefresh(dispatch: (a: unknown) => unknown, expiresIn: number) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => dispatch(refreshSession()), Math.max(30, expiresIn - 60) * 1000);
}

// Chamadas simultaneas (ex.: StrictMode) compartilham a mesma requisicao: o refresh token e de uso unico.
function refreshOnce(): Promise<ApiSession | null> {
  const refresh_token = storage.get();
  if (!refresh_token) return Promise.resolve(null);
  refreshing ??= authFetch<ApiSession>("/refresh", { body: { refresh_token } })
    .then((s) => {
      if (s) storage.set(s.refresh_token);
      return s;
    })
    .finally(() => { refreshing = undefined; });
  return refreshing;
}

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    { name, email, password }: { name: string; email: string; password: string },
    { dispatch },
  ) => {
    const data = await authFetch<{ confirm_email: boolean; session?: ApiSession }>("/register", {
      body: { name: name.trim(), email: email.trim(), password },
    });
    if (!data || data.confirm_email || !data.session) return { confirmEmail: true as const };
    storage.set(data.session.refresh_token);
    const session = toSession(data.session);
    dispatch(logVisit(session));
    scheduleRefresh(dispatch, session.expiresIn);
    return { confirmEmail: false as const, ...session };
  },
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async ({ email, password }: { email: string; password: string }, { dispatch }) => {
    const data = await authFetch<ApiSession>("/login", { body: { email: email.trim(), password } });
    if (!data) throw new Error("auth.err_login_failed");
    storage.set(data.refresh_token);
    const session = toSession(data);
    dispatch(logVisit(session));
    scheduleRefresh(dispatch, session.expiresIn);
    return session;
  },
);

export const restoreSession = createAsyncThunk("auth/restore", async (_, { dispatch }) => {
  let data: ApiSession | null;
  try {
    data = await refreshOnce();
  } catch {
    return null;
  }
  if (!data) return null;
  const session = toSession(data);
  dispatch(logVisit(session));
  scheduleRefresh(dispatch, session.expiresIn);
  return session;
});

export const refreshSession = createAsyncThunk("auth/refresh", async (_, { dispatch }) => {
  const data = await refreshOnce();
  if (!data) throw new Error("auth.err_session_expired");
  scheduleRefresh(dispatch, data.expires_in);
  return toSession(data);
});

export const logout = createAsyncThunk("auth/logout", async (_, { getState }) => {
  clearTimeout(refreshTimer);
  const token = (getState() as { user: { token: string | null } }).user.token;
  storage.clear();
  sessionStorage.removeItem("visitLoggedPVBtCalc");
  if (token) await authFetch("/logout", { token }).catch(() => null);
});

const userSlice = createSlice({
  name: "user",
  initialState: {
    profile: null as Profile | null,
    username: null as string | null,
    // Access token (so em memoria); os slices de calculo o leem em state.user.token
    token: null as string | null,
    ready: false,
    loading: false,
    error: null as string | null,
    notice: null as string | null,
  },
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.notice = null;
    },
    setProfile: (state, action: PayloadAction<Profile | null>) => {
      state.profile = action.payload;
      state.username = action.payload?.name ?? null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.ready = true;
        state.profile = action.payload?.profile ?? null;
        state.username = action.payload?.profile.name ?? null;
        state.token = action.payload?.token ?? null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.token = action.payload.token;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.profile = null;
        state.username = null;
        state.token = null;
        state.error = "auth.err_session_expired";
      })
      .addCase(restoreSession.rejected, (state) => {
        state.ready = true;
      })
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.confirmEmail) {
          state.notice = "auth.notice_confirm_email";
        } else {
          state.profile = action.payload.profile;
          state.username = action.payload.profile.name;
          state.token = action.payload.token;
        }
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "auth.err_register_failed";
      })
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
        state.username = action.payload.profile.name;
        state.token = action.payload.token;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "auth.err_login_failed";
      })
      .addCase(logout.fulfilled, (state) => {
        state.profile = null;
        state.username = null;
        state.token = null;
      });
  },
});

export const { clearMessages } = userSlice.actions;
export default userSlice.reducer;
