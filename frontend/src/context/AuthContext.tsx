import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Usuario } from '../types';
import { apiService } from '../api/client';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identificador: string, senha: string, lembrar?: boolean) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pet_saude_token';
const USER_KEY = 'pet_saude_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializa sessão a partir de localStorage ou sessionStorage
  useEffect(() => {
    const carregarSessao = async () => {
      try {
        const tokenSalvo = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        const userSalvo = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

        if (tokenSalvo) {
          setToken(tokenSalvo);
          if (userSalvo) {
            setUser(JSON.parse(userSalvo));
          }

          // Valida token com o backend
          try {
            const res = await apiService.getMe(tokenSalvo);
            if (res.sucesso && res.usuario) {
              setUser(res.usuario);
              // Atualiza cache local
              if (localStorage.getItem(TOKEN_KEY)) {
                localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
              } else {
                sessionStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
              }
            } else {
              // Token inválido no backend
              limparStorage();
            }
          } catch {
            // Se o backend recusar 401, limpa sessão
            limparStorage();
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
        limparStorage();
      } finally {
        setIsLoading(false);
      }
    };

    carregarSessao();
  }, []);

  const limparStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (
    identificador: string,
    senha: string,
    lembrar: boolean = true
  ): Promise<{ sucesso: boolean; erro?: string }> => {
    try {
      const res = await apiService.login(identificador, senha);

      if (res.sucesso && res.token && res.usuario) {
        setToken(res.token);
        setUser(res.usuario);

        if (lembrar) {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(USER_KEY);
        } else {
          sessionStorage.setItem(TOKEN_KEY, res.token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }

        return { sucesso: true };
      }

      return { sucesso: false, erro: res.erro || 'Falha ao realizar login.' };
    } catch (err: any) {
      const mensagem = err.response?.data?.erro || 'Erro ao comunicar com o servidor de autenticação.';
      return { sucesso: false, erro: mensagem };
    }
  };

  const logout = useCallback(() => {
    limparStorage();
    apiService.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
